export { ShellExecutor, shellExecutor } from './shell.js';
export { FileSystemExecutor, fileSystemExecutor } from './filesystem.js';
export { BrowserExecutor, browserExecutor } from './browser.js';
export { SandboxExecutor, sandboxExecutor } from './sandbox.js';
import { shellExecutor } from './shell.js';
import { fileSystemExecutor } from './filesystem.js';
import { browserExecutor } from './browser.js';
import { sandboxExecutor } from './sandbox.js';
import { workspaceIsolation, } from '../core/security/workspace-isolation.js';
let currentUserContext;
export function setExecutionContext(context) {
    currentUserContext = context;
}
export function getExecutionContext() {
    return currentUserContext;
}
export const executionContext = {
    shell: shellExecutor,
    filesystem: fileSystemExecutor,
    browser: browserExecutor,
    sandbox: sandboxExecutor,
    workspace: workspaceIsolation,
};
export async function executeCommand(type, operation, params, options = {}) {
    const userContext = options.userContext || currentUserContext;
    if (userContext?.workspaceId && type === 'filesystem') {
        const filePath = params.path;
        const op = operation;
        if (['readFile', 'writeFile', 'deleteFile', 'listDirectory', 'createDirectory'].includes(op)) {
            const accessCheck = workspaceIsolation.checkAccess(userContext, filePath, op === 'readFile' ? 'read' : op === 'writeFile' ? 'write' : 'delete');
            if (!accessCheck.allowed) {
                return {
                    success: false,
                    path: filePath,
                    operation: op,
                    error: accessCheck.error || 'Access denied',
                    timestamp: new Date(),
                };
            }
            params.path = accessCheck.resolvedPath;
        }
    }
    switch (type) {
        case 'shell':
            return shellExecutor.execute({
                command: operation,
                args: params.args,
                workingDirectory: params.workingDirectory,
                environment: params.environment,
                timeout: params.timeout,
            });
        case 'filesystem':
            const fsOp = operation;
            if (fsOp === 'readFile') {
                return fileSystemExecutor.readFile(params.path);
            }
            else if (fsOp === 'writeFile') {
                return fileSystemExecutor.writeFile(params.path, params.content);
            }
            else if (fsOp === 'listDirectory') {
                return fileSystemExecutor.listDirectory(params.path);
            }
            else if (fsOp === 'search') {
                return fileSystemExecutor.search({
                    pattern: params.pattern,
                    recursive: params.recursive,
                    maxDepth: params.maxDepth,
                    fileTypes: params.fileTypes,
                });
            }
            else if (fsOp === 'deleteFile') {
                return fileSystemExecutor.deleteFile(params.path);
            }
            else if (fsOp === 'createDirectory') {
                return fileSystemExecutor.createDirectory(params.path);
            }
            throw new Error(`Unknown filesystem operation: ${operation}`);
        case 'browser':
            const browserOp = operation;
            if (browserOp === 'navigate') {
                return browserExecutor.navigate({
                    url: params.url,
                    waitUntil: params.waitUntil,
                    timeout: params.timeout,
                });
            }
            else if (browserOp === 'click') {
                return browserExecutor.click(params.selector);
            }
            else if (browserOp === 'fill') {
                return browserExecutor.fill(params.selector, params.value);
            }
            else if (browserOp === 'screenshot') {
                return browserExecutor.screenshot({
                    fullPage: params.fullPage,
                });
            }
            else if (browserOp === 'getText') {
                return browserExecutor.getText(params.selector);
            }
            throw new Error(`Unknown browser operation: ${operation}`);
        case 'sandbox':
            return sandboxExecutor.execute({
                code: params.code,
                language: params.language,
                input: params.input,
            });
        default:
            throw new Error(`Unknown execution type: ${type}`);
    }
}
//# sourceMappingURL=index.js.map