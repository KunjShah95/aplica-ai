export interface CommandResult {
    success: boolean;
    command: string;
    exitCode: number | null;
    stdout: string;
    stderr: string;
    duration: number;
}
export interface CommandOptions {
    cwd?: string;
    env?: Record<string, string>;
    timeout?: number;
    maxBuffer?: number;
    shell?: string;
}
export interface ProcessInfo {
    pid: number;
    command: string;
    arguments: string[];
    startTime: Date;
    cwd: string;
}
export interface StreamingResult {
    command: string;
    pid: number;
    stdout: string;
    stderr: string;
    exitCode: number | null;
}
export declare class ShellTool {
    private allowedCommands;
    private blockedCommands;
    private commandHistory;
    private readonly MAX_HISTORY;
    private readonly DEFAULT_TIMEOUT;
    private readonly MAX_BUFFER;
    private readonly DEFAULT_SHELL;
    constructor(config?: {
        allowedCommands?: string[];
        blockedCommands?: string[];
    });
    execute(command: string, options?: CommandOptions): Promise<CommandResult>;
    executeSync(command: string, options?: CommandOptions): Promise<CommandResult>;
    executeStreaming(command: string, onData?: (data: string, type: 'stdout' | 'stderr') => void, options?: CommandOptions): Promise<StreamingResult>;
    backgroundExecute(command: string, options?: CommandOptions): Promise<ProcessInfo>;
    killProcess(pid: number, signal?: string): Promise<boolean>;
    getProcessInfo(pid: number): Promise<ProcessInfo | null>;
    listProcesses(): Promise<ProcessInfo[]>;
    which(command: string): Promise<string | null>;
    checkCommandExists(command: string): Promise<boolean>;
    getHistory(): CommandResult[];
    getHistoryByCommand(commandPrefix: string): CommandResult[];
    clearHistory(): void;
    allowCommand(command: string): void;
    blockCommand(command: string): void;
    private validateCommand;
    private parseCommand;
    private addToHistory;
}
//# sourceMappingURL=shell.d.ts.map