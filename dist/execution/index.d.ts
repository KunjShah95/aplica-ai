export { ShellExecutor, shellExecutor } from './shell.js';
export { FileSystemExecutor, fileSystemExecutor } from './filesystem.js';
export { BrowserExecutor, browserExecutor } from './browser.js';
export { SandboxExecutor, sandboxExecutor } from './sandbox.js';
import { shellExecutor } from './shell.js';
import { fileSystemExecutor } from './filesystem.js';
import { browserExecutor } from './browser.js';
import { sandboxExecutor } from './sandbox.js';
export interface ExecutionContext {
    shell: typeof shellExecutor;
    filesystem: typeof fileSystemExecutor;
    browser: typeof browserExecutor;
    sandbox: typeof sandboxExecutor;
}
export declare const executionContext: ExecutionContext;
export type ExecutionResult = ReturnType<typeof shellExecutor.execute> | ReturnType<typeof fileSystemExecutor.readFile> | ReturnType<typeof browserExecutor.navigate> | ReturnType<typeof sandboxExecutor.execute>;
export declare function executeCommand(type: 'shell' | 'filesystem' | 'browser' | 'sandbox', operation: string, params: Record<string, unknown>): Promise<ExecutionResult>;
//# sourceMappingURL=index.d.ts.map