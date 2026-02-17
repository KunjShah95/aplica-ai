export interface SandboxOptions {
    timeout?: number;
    memoryLimit?: number;
    cpuLimit?: number;
    allowedModules?: string[];
    workingDirectory?: string;
    useDocker?: boolean;
    allowInsecureFallback?: boolean;
}
export interface SandboxExecutionResult {
    id: string;
    success: boolean;
    output: string;
    error?: string;
    executionTime: number;
    memoryUsage?: number;
    timestamp: Date;
    secure?: boolean;
}
export interface SandboxedTask {
    code: string;
    language: 'javascript' | 'typescript';
    input?: Record<string, unknown>;
}
export declare class SandboxExecutor {
    private options;
    private defaultTimeout;
    private defaultMemoryLimit;
    private defaultCpuLimit;
    private useDocker;
    private allowInsecureFallback;
    private dockerExecutor;
    constructor(options?: SandboxOptions);
    execute(task: SandboxedTask): Promise<SandboxExecutionResult>;
    private runInWorker;
    private runInCurrentThread;
    private evaluteCode;
    executeJavaScript(code: string, input?: Record<string, unknown>): Promise<SandboxExecutionResult>;
    executeTypeScript(code: string, input?: Record<string, unknown>): Promise<SandboxExecutionResult>;
    getStatus(): {
        timeout: number;
        memoryLimit: number;
        cpuLimit: number;
        secureMode: boolean;
    };
}
export declare const sandboxExecutor: SandboxExecutor;
//# sourceMappingURL=sandbox.d.ts.map