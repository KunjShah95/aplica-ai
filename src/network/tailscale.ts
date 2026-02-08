import { spawn, ChildProcess } from 'child_process';
import { execSync } from 'child_process';
import { randomUUID } from 'crypto';

export interface TailscaleConfig {
  enabled: boolean;
  mode: 'off' | 'serve' | 'funnel';
  port: number;
  authKey?: string;
  resetOnExit: boolean;
}

export interface TailscaleServeConfig {
  path: string;
  targetPort: number;
  https: boolean;
  authenticate: boolean;
  password?: string;
}

export interface TailscaleStatus {
  tunnel: boolean;
  ip: string;
  state: 'Stopped' | 'Starting' | 'Running' | 'Stopping';
  peers: number;
  expires?: Date;
}

export class TailscaleManager {
  private config: TailscaleConfig;
  private processes: Map<string, ChildProcess> = new Map();
  private serves: Map<string, TailscaleServeConfig> = new Map();

  constructor(config?: Partial<TailscaleConfig>) {
    this.config = {
      enabled: config?.enabled ?? false,
      mode: config?.mode ?? 'off',
      port: config?.port ?? 18789,
      authKey: config?.authKey,
      resetOnExit: config?.resetOnExit ?? true,
    };
  }

  isAvailable(): boolean {
    try {
      execSync('tailscale version', { encoding: 'utf-8' });
      return true;
    } catch {
      return false;
    }
  }

  isLoggedIn(): boolean {
    try {
      const status = execSync('tailscale status --json', { encoding: 'utf-8' });
      const parsed = JSON.parse(status);
      return parsed.Self?.LoggedIn === true;
    } catch {
      return false;
    }
  }

  async login(): Promise<boolean> {
    try {
      if (this.config.authKey) {
        execSync(`tailscale up --authkey=${this.config.authKey}`, { encoding: 'utf-8' });
      } else {
        execSync('tailscale up', { encoding: 'utf-8' });
      }
      console.log('Tailscale login successful');
      return true;
    } catch (error) {
      console.error('Tailscale login failed:', error);
      return false;
    }
  }

  async logout(): Promise<void> {
    try {
      execSync('tailscale down', { encoding: 'utf-8' });
      console.log('Tailscale logout successful');
    } catch (error) {
      console.error('Tailscale logout failed:', error);
    }
  }

  getStatus(): TailscaleStatus {
    try {
      const status = execSync('tailscale status --json', { encoding: 'utf-8' });
      const parsed = JSON.parse(status);
      return {
        tunnel: parsed.Self?.Tun === 'on',
        ip: parsed.Self?.TailscaleIPs?.[0] || '',
        state: parsed.BackendState || 'Stopped',
        peers: Object.keys(parsed.Peer || {}).length,
        expires: parsed.Self?.Expires ? new Date(parsed.Self.Expires) : undefined,
      };
    } catch {
      return {
        tunnel: false,
        ip: '',
        state: 'Stopped',
        peers: 0,
      };
    }
  }

  async enableServe(
    path: string,
    targetPort: number,
    options?: { https?: boolean; password?: string }
  ): Promise<string | null> {
    if (!this.isAvailable() || !this.isLoggedIn()) {
      throw new Error('Tailscale not available or not logged in');
    }

    try {
      const serveId = randomUUID();
      const config: TailscaleServeConfig = {
        path,
        targetPort,
        https: options?.https ?? true,
        authenticate: !!options?.password,
        password: options?.password,
      };

      let command = `tailscale serve --port=${targetPort}`;
      if (options?.https) {
        command += ' --https=443';
      }
      if (options?.password) {
        command += ` --password=${options.password}`;
      }
      command += ` ${path}`;

      execSync(command, { encoding: 'utf-8' });
      this.serves.set(serveId, config);

      console.log(`Tailscale serve enabled: ${path} -> port ${targetPort}`);
      return serveId;
    } catch (error) {
      console.error('Failed to enable Tailscale serve:', error);
      return null;
    }
  }

  async disableServe(serveId: string): Promise<boolean> {
    const config = this.serves.get(serveId);
    if (!config) return false;

    try {
      execSync(`tailscale serve off --port=${config.targetPort}`, { encoding: 'utf-8' });
      this.serves.delete(serveId);
      console.log(`Tailscale serve disabled: ${serveId}`);
      return true;
    } catch (error) {
      console.error('Failed to disable Tailscale serve:', error);
      return false;
    }
  }

  async enableFunnel(targetPort: number, options?: { password?: string }): Promise<boolean> {
    if (!this.isAvailable() || !this.isLoggedIn()) {
      throw new Error('Tailscale not available or not logged in');
    }

    try {
      let command = `tailscale funnel --port=${targetPort}`;
      if (options?.password) {
        command += ` --password=${options.password}`;
      }
      execSync(command, { encoding: 'utf-8' });
      console.log(`Tailscale funnel enabled: port ${targetPort}`);
      return true;
    } catch (error) {
      console.error('Failed to enable Tailscale funnel:', error);
      return false;
    }
  }

  async disableFunnel(targetPort: number): Promise<boolean> {
    try {
      execSync(`tailscale funnel off --port=${targetPort}`, { encoding: 'utf-8' });
      console.log(`Tailscale funnel disabled: port ${targetPort}`);
      return true;
    } catch (error) {
      console.error('Failed to disable Tailscale funnel:', error);
      return false;
    }
  }

  async reset(): Promise<void> {
    try {
      execSync('tailscale serve reset', { encoding: 'utf-8' });
      execSync('tailscale funnel reset', { encoding: 'utf-8' });
      this.serves.clear();
      console.log('Tailscale reset successful');
    } catch (error) {
      console.error('Failed to reset Tailscale:', error);
    }
  }

  getServeUrl(serveId: string): string | null {
    const config = this.serves.get(serveId);
    if (!config) return null;

    const ip = this.getStatus().ip;
    return `https://${ip}${config.path}`;
  }

  async startGateway(): Promise<boolean> {
    if (!this.isAvailable()) {
      console.error('Tailscale is not available');
      return false;
    }

    if (!this.isLoggedIn()) {
      const loggedIn = await this.login();
      if (!loggedIn) return false;
    }

    if (this.config.mode === 'serve') {
      return (await this.enableServe('/', this.config.port, { password: 'gateway' })) !== null;
    } else if (this.config.mode === 'funnel') {
      return await this.enableFunnel(this.config.port, { password: 'gateway' });
    }

    return true;
  }

  async stop(): Promise<void> {
    for (const [serveId] of this.serves) {
      await this.disableServe(serveId);
    }

    if (this.config.mode === 'funnel') {
      await this.disableFunnel(this.config.port);
    }

    if (this.config.resetOnExit) {
      await this.reset();
    }
  }

  getConfig(): TailscaleConfig {
    return { ...this.config };
  }

  getServes(): TailscaleServeConfig[] {
    return Array.from(this.serves.values());
  }
}

export const tailscaleManager = new TailscaleManager();
