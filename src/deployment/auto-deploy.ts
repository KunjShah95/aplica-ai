import { randomUUID } from 'crypto';
import { exec } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import * as https from 'https';
import * as http from 'http';

export interface DeploymentConfig {
  name: string;
  environment: 'development' | 'staging' | 'production';
  region: string;
  instanceType: 'small' | 'medium' | 'large';
  enableSSL: boolean;
  enableBackups: boolean;
  enableMonitoring: boolean;
}

export interface DeploymentStatus {
  id: string;
  name: string;
  status: 'pending' | 'deploying' | 'running' | 'stopped' | 'error';
  url?: string;
  region: string;
  startedAt?: Date;
  deployedAt?: Date;
  logs: string[];
}

export interface InstallOptions {
  method: 'docker' | 'npm' | 'binary';
  domain?: string;
  email?: string;
  password?: string;
  llmProvider?: 'openai' | 'anthropic' | 'ollama';
  llmApiKey?: string;
  platform?: 'telegram' | 'discord' | 'slack' | 'all';
}

export class AutoDeployer {
  private deployments: Map<string, DeploymentStatus> = new Map();

  async oneCommandInstall(options: InstallOptions): Promise<DeploymentStatus> {
    const deploymentId = randomUUID();

    const status: DeploymentStatus = {
      id: deploymentId,
      name: 'alpicia',
      status: 'pending',
      region: 'auto',
      logs: [],
    };

    this.deployments.set(deploymentId, status);

    status.logs.push('🚀 Starting Alpicia one-command installation...');
    status.status = 'deploying';

    try {
      if (options.method === 'docker') {
        await this.dockerInstall(deploymentId, options);
      } else if (options.method === 'npm') {
        await this.npmInstall(deploymentId, options);
      } else {
        await this.binaryInstall(deploymentId, options);
      }

      status.status = 'running';
      status.deployedAt = new Date();
      status.url = options.domain ? `https://${options.domain}` : 'http://localhost:3000';
      status.logs.push('✅ Deployment complete!');
    } catch (error) {
      status.status = 'error';
      status.logs.push(`❌ Deployment failed: ${error}`);
    }

    return status;
  }

  private async dockerInstall(deploymentId: string, options: InstallOptions): Promise<void> {
    const status = this.deployments.get(deploymentId)!;

    status.logs.push('📦 Checking Docker...');
    await this.runCommand('docker --version');

    status.logs.push('📥 Pulling Alpicia image...');
    await this.runCommand('docker pull alpicia/alpicia:latest');

    const envContent = this.generateEnvFile(options);
    const envPath = path.join(process.cwd(), '.env');
    fs.writeFileSync(envPath, envContent);
    status.logs.push('✅ Environment file created');

    const composeContent = this.generateDockerCompose(options);
    fs.writeFileSync('docker-compose.yml', composeContent);
    status.logs.push('✅ Docker Compose file created');

    status.logs.push('🔄 Starting containers...');
    await this.runCommand('docker compose up -d');

    status.logs.push('⏳ Waiting for services...');
    await this.waitForService('http://localhost:3000/health', 60);

    if (options.platform && options.platform !== 'all') {
      status.logs.push(`📱 Configuring ${options.platform} platform...`);
    }

    status.logs.push('🎉 Alpicia is now running!');
  }

  private async npmInstall(deploymentId: string, options: InstallOptions): Promise<void> {
    const status = this.deployments.get(deploymentId)!;

    status.logs.push('📦 Installing Alpicia via npm...');

    await this.runCommand('npm install -g alpicia');

    const envContent = this.generateEnvFile(options);
    const envPath = path.join(process.cwd(), '.env');
    fs.writeFileSync(envPath, envContent);

    status.logs.push('🔄 Initializing database...');
    await this.runCommand('npx prisma generate');
    await this.runCommand('npx prisma db push');

    status.logs.push('🔄 Starting Alpicia...');
    this.runCommand('npm run dev &');

    await this.waitForService('http://localhost:3000/health', 60);
    status.logs.push('🎉 Alpicia is now running!');
  }

  private async binaryInstall(deploymentId: string, options: InstallOptions): Promise<void> {
    const status = this.deployments.get(deploymentId)!;

    const platform = process.platform;
    const arch = process.arch;
    const binaryName = `alpicia-${platform}-${arch}`;

    status.logs.push(`📥 Downloading ${binaryName}...`);

    await this.downloadFile(
      `https://github.com/alpicia/releases/latest/download/${binaryName}`,
      `/usr/local/bin/alpicia`
    );

    await this.runCommand('chmod +x /usr/local/bin/alpicia');

    const envContent = this.generateEnvFile(options);
    fs.writeFileSync('.env', envContent);

    status.logs.push('🔄 Starting Alpicia...');
    await this.runCommand('alpicia init');
    await this.runCommand('alpicia start');

    await this.waitForService('http://localhost:3000/health', 60);
    status.logs.push('🎉 Alpicia is now running!');
  }

  private generateEnvFile(options: InstallOptions): string {
    const lines: string[] = [
      '# Alpicia Environment Configuration',
      '# Generated by one-command installer',
      '',
      'NODE_ENV=production',
      '',
    ];

    if (options.llmProvider === 'openai' && options.llmApiKey) {
      lines.push('LLM_PROVIDER=openai');
      lines.push(`OPENAI_API_KEY=${options.llmApiKey}`);
    } else if (options.llmProvider === 'anthropic' && options.llmApiKey) {
      lines.push('LLM_PROVIDER=claude');
      lines.push(`ANTHROPIC_API_KEY=${options.llmApiKey}`);
    } else if (options.llmProvider === 'ollama') {
      lines.push('LLM_PROVIDER=ollama');
      lines.push('OLLAMA_BASE_URL=http://localhost:11434');
    }

    if (options.email && options.password) {
      lines.push('');
      lines.push('# Admin Account');
      lines.push(`ADMIN_EMAIL=${options.email}`);
      lines.push(`ADMIN_PASSWORD=${options.password}`);
    }

    if (options.domain) {
      lines.push('');
      lines.push('# Domain Configuration');
      lines.push(`API_BASE_URL=https://${options.domain}`);
    }

    return lines.join('\n');
  }

  private generateDockerCompose(options: InstallOptions): string {
    const domain = options.domain || 'localhost';

    return `version: '3.8'

services:
  alpicia:
    image: alpicia/alpicia:latest
    ports:
      - "3000:3000"
      - "3001:3001"
    env_file:
      - .env
    volumes:
      - alpicia-data:/app/data
      - alpicia-logs:/app/logs
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/api/health"]
      interval: 30s
      timeout: 10s
      retries: 3
    networks:
      - alpicia-network

  postgres:
    image: pgvector/pgvector:pg16
    environment:
      POSTGRES_USER: alpicia
      POSTGRES_PASSWORD: ${randomUUID().slice(0, 16)}
      POSTGRES_DB: alpicia
    volumes:
      - postgres-data:/var/lib/postgresql/data
    restart: unless-stopped
    networks:
      - alpicia-network

  redis:
    image: redis:7-alpine
    command: redis-server --appendonly yes
    volumes:
      - redis-data:/data
    restart: unless-stopped
    networks:
      - alpicia-network

volumes:
  alpicia-data:
  alpicia-logs:
  postgres-data:
  redis-data:

networks:
  alpicia-network:
    driver: bridge
`;
  }

  private async runCommand(command: string): Promise<string> {
    return new Promise((resolve, reject) => {
      exec(command, { timeout: 300000 }, (error, stdout, stderr) => {
        if (error) {
          reject(new Error(`Command failed: ${command}\n${stderr}`));
        } else {
          resolve(stdout);
        }
      });
    });
  }

  private async waitForService(url: string, maxAttempts: number): Promise<void> {
    for (let i = 0; i < maxAttempts; i++) {
      try {
        await this.httpGet(url);
        return;
      } catch {
        await new Promise((r) => setTimeout(r, 2000));
      }
    }
    throw new Error(`Service ${url} did not become available`);
  }

  private async httpGet(url: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const client = url.startsWith('https') ? https : http;
      client
        .get(url, (res) => {
          if (res.statusCode && res.statusCode < 500) {
            resolve();
          } else {
            reject(new Error(`Status: ${res.statusCode}`));
          }
        })
        .on('error', reject);
    });
  }

  private async downloadFile(url: string, destPath: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const file = fs.createWriteStream(destPath);
      const client = url.startsWith('https') ? https : http;

      client
        .get(url, (response) => {
          if (response.statusCode === 302 && response.headers.location) {
            this.downloadFile(response.headers.location, destPath).then(resolve).catch(reject);
            return;
          }

          response.pipe(file);
          file.on('finish', () => {
            file.close();
            resolve();
          });
        })
        .on('error', (err) => {
          fs.unlink(destPath, () => {});
          reject(err);
        });
    });
  }

  getDeployment(id: string): DeploymentStatus | undefined {
    return this.deployments.get(id);
  }

  listDeployments(): DeploymentStatus[] {
    return Array.from(this.deployments.values());
  }

  async stopDeployment(id: string): Promise<void> {
    const status = this.deployments.get(id);
    if (!status) throw new Error('Deployment not found');

    await this.runCommand('docker compose down');
    status.status = 'stopped';
    status.logs.push('🛑 Deployment stopped');
  }

  async restartDeployment(id: string): Promise<void> {
    const status = this.deployments.get(id);
    if (!status) throw new Error('Deployment not found');

    await this.runCommand('docker compose restart');
    status.logs.push('🔄 Deployment restarted');
  }

  async getLogs(id: string, lines: number = 100): Promise<string> {
    return this.runCommand(`docker compose logs --tail ${lines}`);
  }

  async scaleDeployment(id: string, instances: number): Promise<void> {
    const status = this.deployments.get(id);
    if (!status) throw new Error('Deployment not found');

    await this.runCommand(`docker compose up -d --scale alpicia=${instances}`);
    status.logs.push(`📈 Scaled to ${instances} instances`);
  }

  async backupDeployment(id: string): Promise<string> {
    const backupId = randomUUID();
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');

    await this.runCommand(
      `docker exec alpicia-postgres-${timestamp} pg_dump alpicia > backups/backup-${backupId}.sql`
    );

    return `backups/backup-${backupId}.sql`;
  }

  async updateDeployment(id: string): Promise<void> {
    const status = this.deployments.get(id);
    if (!status) throw new Error('Deployment not found');

    status.logs.push('📥 Pulling latest image...');
    await this.runCommand('docker compose pull');

    status.logs.push('🔄 Restarting services...');
    await this.runCommand('docker compose up -d');

    status.logs.push('✅ Update complete!');
  }
}

export const autoDeployer = new AutoDeployer();
