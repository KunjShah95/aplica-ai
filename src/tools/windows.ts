import { shellExecutor } from '../execution/shell.js';

export type WindowsAction =
  | 'list_processes'
  | 'kill_process'
  | 'open_app'
  | 'open_url'
  | 'open_settings'
  | 'get_clipboard'
  | 'set_clipboard'
  | 'list_start_apps';

export interface WindowsActionOptions {
  action: WindowsAction;
  limit?: number;
  processId?: number;
  processName?: string;
  appPath?: string;
  appName?: string;
  args?: string[];
  url?: string;
  settingsPage?: string;
  clipboardText?: string;
}

export interface WindowsActionResult {
  success: boolean;
  action: WindowsAction;
  data?: unknown;
  error?: string;
  stderr?: string;
}

export class WindowsTool {
  private readonly isWindows = process.platform === 'win32';
  private readonly defaultLimit = 50;

  async execute(options: WindowsActionOptions): Promise<WindowsActionResult> {
    if (!this.isWindows) {
      return {
        success: false,
        action: options.action,
        error: 'Windows tool is only available on Windows hosts',
      };
    }

    try {
      switch (options.action) {
        case 'list_processes':
          return this.listProcesses(options.limit);
        case 'kill_process':
          return this.killProcess(options.processId, options.processName);
        case 'open_app':
          return this.openApp(options.appPath, options.appName, options.args || []);
        case 'open_url':
          return this.openUrl(options.url);
        case 'open_settings':
          return this.openSettings(options.settingsPage);
        case 'get_clipboard':
          return this.getClipboard();
        case 'set_clipboard':
          return this.setClipboard(options.clipboardText);
        case 'list_start_apps':
          return this.listStartApps(options.limit);
        default:
          return {
            success: false,
            action: options.action,
            error: `Unsupported Windows action: ${options.action}`,
          };
      }
    } catch (error) {
      return {
        success: false,
        action: options.action,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  private async listProcesses(limit?: number): Promise<WindowsActionResult> {
    const take = Math.max(1, Math.min(limit || this.defaultLimit, 200));
    const script = `Get-Process | Select-Object -First ${take} Name,Id,CPU,WorkingSet,StartTime | ConvertTo-Json -Depth 2`;

    const result = await this.runPowerShell('list_processes', script);
    if (!result.success) return result;

    const data = this.tryParseJson(result.data as string) || result.data;
    return { success: true, action: 'list_processes', data };
  }

  private async killProcess(
    processId?: number,
    processName?: string
  ): Promise<WindowsActionResult> {
    if (!processId && !processName) {
      return {
        success: false,
        action: 'kill_process',
        error: 'processId or processName is required',
      };
    }

    const target = processId
      ? `-Id ${processId}`
      : `-Name ${this.escapePowerShellString(processName || '')}`;
    const script = `Stop-Process ${target} -ErrorAction Stop; "OK"`;

    const result = await this.runPowerShell('kill_process', script);
    if (!result.success) return result;

    return { success: true, action: 'kill_process', data: { message: 'OK' } };
  }

  private async openApp(
    appPath?: string,
    appName?: string,
    args: string[] = []
  ): Promise<WindowsActionResult> {
    if (!appPath && !appName) {
      return {
        success: false,
        action: 'open_app',
        error: 'appPath or appName is required',
      };
    }

    const filePath = appPath || appName || '';
    const argList = args.length > 0 ? `-ArgumentList ${this.toPowerShellArray(args)}` : '';
    const script = `Start-Process -FilePath ${this.escapePowerShellString(filePath)} ${argList}; "OK"`;

    const result = await this.runPowerShell('open_app', script);
    if (!result.success) return result;

    return { success: true, action: 'open_app', data: { message: 'OK' } };
  }

  private async openUrl(url?: string): Promise<WindowsActionResult> {
    if (!url) {
      return { success: false, action: 'open_url', error: 'url is required' };
    }

    const script = `Start-Process ${this.escapePowerShellString(url)}; "OK"`;
    const result = await this.runPowerShell('open_url', script);
    if (!result.success) return result;

    return { success: true, action: 'open_url', data: { message: 'OK' } };
  }

  private async openSettings(settingsPage?: string): Promise<WindowsActionResult> {
    if (!settingsPage) {
      return {
        success: false,
        action: 'open_settings',
        error: 'settingsPage is required',
      };
    }

    const safePage = settingsPage.trim();
    if (!/^[a-z0-9\-_.]+$/i.test(safePage)) {
      return {
        success: false,
        action: 'open_settings',
        error: 'settingsPage contains invalid characters',
      };
    }

    const script = `Start-Process "ms-settings:${safePage}"; "OK"`;
    const result = await this.runPowerShell('open_settings', script);
    if (!result.success) return result;

    return { success: true, action: 'open_settings', data: { message: 'OK' } };
  }

  private async getClipboard(): Promise<WindowsActionResult> {
    const script = `Get-Clipboard -Raw`;
    const result = await this.runPowerShell('get_clipboard', script);
    if (!result.success) return result;

    return { success: true, action: 'get_clipboard', data: result.data };
  }

  private async setClipboard(text?: string): Promise<WindowsActionResult> {
    if (text === undefined) {
      return {
        success: false,
        action: 'set_clipboard',
        error: 'clipboardText is required',
      };
    }

    const script = `Set-Clipboard -Value ${this.escapePowerShellString(text)}; "OK"`;
    const result = await this.runPowerShell('set_clipboard', script);
    if (!result.success) return result;

    return { success: true, action: 'set_clipboard', data: { message: 'OK' } };
  }

  private async listStartApps(limit?: number): Promise<WindowsActionResult> {
    const take = Math.max(1, Math.min(limit || this.defaultLimit, 200));
    const script = `Get-StartApps | Select-Object -First ${take} Name,AppID | ConvertTo-Json -Depth 2`;

    const result = await this.runPowerShell('list_start_apps', script);
    if (!result.success) return result;

    const data = this.tryParseJson(result.data as string) || result.data;
    return { success: true, action: 'list_start_apps', data };
  }

  private async runPowerShell(
    action: WindowsAction,
    script: string
  ): Promise<WindowsActionResult> {
    const result = await shellExecutor.execute({
      command: 'powershell',
      args: ['-NoProfile', '-NonInteractive', '-Command', script],
      timeout: 30000,
    });

    if (!result.success) {
      return {
        success: false,
        action,
        error: result.stderr || 'PowerShell execution failed',
        stderr: result.stderr,
      };
    }

    return {
      success: true,
      action,
      data: result.stdout.trim(),
    };
  }

  private escapePowerShellString(value: string): string {
    const escaped = value.replace(/'/g, "''");
    return `'${escaped}'`;
  }

  private toPowerShellArray(values: string[]): string {
    const escaped = values.map((value) => this.escapePowerShellString(value));
    return `@(${escaped.join(', ')})`;
  }

  private tryParseJson(text: string): any | null {
    try {
      return JSON.parse(text);
    } catch {
      return null;
    }
  }
}

export const windowsTool = new WindowsTool();

export default windowsTool;