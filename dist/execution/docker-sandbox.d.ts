import { SandboxExecutionResult, SandboxedTask, SandboxOptions } from './sandbox.js';
export declare class DockerSandboxExecutor {
    private defaultTimeout;
    private defaultMemoryLimit;
    private defaultCpuLimit;
    private image;
    constructor(options?: SandboxOptions & {
        image?: string;
    });
    execute(task: SandboxedTask): Promise<SandboxExecutionResult>;
}
//# sourceMappingURL=docker-sandbox.d.ts.map