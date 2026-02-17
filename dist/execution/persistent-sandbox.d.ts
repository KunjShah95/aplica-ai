export interface ExecutionResult {
    stdout: string;
    stderr: string;
    exitCode: number;
}
export declare class PersistentSandbox {
    private containerId;
    private image;
    id: string;
    constructor(image?: string);
    /**
     * Starts the persistent container (The "Computer")
     */
    start(): Promise<string>;
    /**
     * Runs a shell command inside the container
     */
    exec(command: string, workDir?: string): Promise<ExecutionResult>;
    /**
     * Writes a file to the container
     */
    writeFile(filePath: string, content: string): Promise<void>;
    /**
     * Reads a file from the container
     */
    readFile(filePath: string): Promise<string>;
    /**
     * Stops and cleans up the container
     */
    stop(): Promise<void>;
}
//# sourceMappingURL=persistent-sandbox.d.ts.map