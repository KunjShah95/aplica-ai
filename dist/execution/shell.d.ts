export interface ShellExecutionOptions {
    command: string;
    args?: string[];
    workingDirectory?: string;
    environment?: Record<string, string>;
    timeout?: number;
    maxOutput?: number;
}
export interface ShellExecutionResult {
    id: string;
    command: string;
    success: boolean;
    exitCode: number | null;
    stdout: string;
    stderr: string;
    duration: number;
    timestamp: Date;
}
export declare class ShellExecutor {
    private allowedCommands;
    private blockedCommands;
    private shellInterpreters;
    private windowsBuiltins;
    private maxOutputSize;
    private defaultTimeout;
    private enforceAllowlist;
    private blockChaining;
    private secureMode;
    constructor(options?: {
        allowedCommands?: string[];
        blockedCommands?: string[];
        maxOutputSize?: number;
        defaultTimeout?: number;
        enforceAllowlist?: boolean;
        blockChaining?: boolean;
    });
    private isCommandAllowed;
    private areArgsAllowed;
    execute(options: ShellExecutionOptions): Promise<ShellExecutionResult>;
    executeScript(script: string, language?: 'bash' | 'powershell' | 'cmd'): Promise<ShellExecutionResult>;
    getStatus(): {
        allowedCount: number;
        blockedCount: number;
    };
}
export declare const shellExecutor: ShellExecutor;
//# sourceMappingURL=shell.d.ts.map