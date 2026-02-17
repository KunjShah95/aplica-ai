export type WindowsAction = 'list_processes' | 'kill_process' | 'open_app' | 'open_url' | 'open_settings' | 'get_clipboard' | 'set_clipboard' | 'list_start_apps';
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
export declare class WindowsTool {
    private readonly isWindows;
    private readonly defaultLimit;
    execute(options: WindowsActionOptions): Promise<WindowsActionResult>;
    private listProcesses;
    private killProcess;
    private openApp;
    private openUrl;
    private openSettings;
    private getClipboard;
    private setClipboard;
    private listStartApps;
    private runPowerShell;
    private escapePowerShellString;
    private toPowerShellArray;
    private tryParseJson;
}
export declare const windowsTool: WindowsTool;
export default windowsTool;
//# sourceMappingURL=windows.d.ts.map