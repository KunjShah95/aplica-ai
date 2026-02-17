export { ShellExecutor, shellExecutor } from './shell.js';
export { FileSystemExecutor, fileSystemExecutor } from './filesystem.js';
export { BrowserExecutor, browserExecutor } from './browser.js';
export { SandboxExecutor, sandboxExecutor } from './sandbox.js';

import { shellExecutor } from './shell.js';
import { fileSystemExecutor } from './filesystem.js';
import { browserExecutor } from './browser.js';
import { sandboxExecutor } from './sandbox.js';
import {
  workspaceIsolation,
  WorkspaceIsolation,
  type UserContext,
} from '../core/security/workspace-isolation.js';

export interface ExecutionContext {
  shell: typeof shellExecutor;
  filesystem: typeof fileSystemExecutor;
  browser: typeof browserExecutor;
  sandbox: typeof sandboxExecutor;
  workspace: WorkspaceIsolation;
}

export interface ExecuteOptions {
  userContext?: UserContext;
}

let currentUserContext: UserContext | undefined;

export function setExecutionContext(context: UserContext | undefined): void {
  currentUserContext = context;
}

export function getExecutionContext(): UserContext | undefined {
  return currentUserContext;
}

export const executionContext: ExecutionContext = {
  shell: shellExecutor,
  filesystem: fileSystemExecutor,
  browser: browserExecutor,
  sandbox: sandboxExecutor,
  workspace: workspaceIsolation,
};

export type ExecutionResult =
  | ReturnType<typeof shellExecutor.execute>
  | ReturnType<typeof fileSystemExecutor.readFile>
  | ReturnType<typeof browserExecutor.navigate>
  | ReturnType<typeof sandboxExecutor.execute>;

export async function executeCommand(
  type: 'shell' | 'filesystem' | 'browser' | 'sandbox',
  operation: string,
  params: Record<string, unknown>,
  options: ExecuteOptions = {}
): Promise<ExecutionResult> {
  const userContext = options.userContext || currentUserContext;

  if (userContext?.workspaceId && type === 'filesystem') {
    const filePath = params.path as string;
    const op = operation as
      | 'readFile'
      | 'writeFile'
      | 'deleteFile'
      | 'listDirectory'
      | 'createDirectory';

    if (['readFile', 'writeFile', 'deleteFile', 'listDirectory', 'createDirectory'].includes(op)) {
      const accessCheck = workspaceIsolation.checkAccess(
        userContext,
        filePath,
        op === 'readFile' ? 'read' : op === 'writeFile' ? 'write' : 'delete'
      );

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
        args: params.args as string[],
        workingDirectory: params.workingDirectory as string,
        environment: params.environment as Record<string, string>,
        timeout: params.timeout as number,
      });

    case 'filesystem':
      const fsOp = operation as keyof Omit<
        typeof fileSystemExecutor,
        'constructor' | 'isPathAllowed' | 'getStatus'
      >;
      if (fsOp === 'readFile') {
        return fileSystemExecutor.readFile(params.path as string);
      } else if (fsOp === 'writeFile') {
        return fileSystemExecutor.writeFile(params.path as string, params.content as string);
      } else if (fsOp === 'listDirectory') {
        return fileSystemExecutor.listDirectory(params.path as string);
      } else if (fsOp === 'search') {
        return fileSystemExecutor.search({
          pattern: params.pattern as string,
          recursive: params.recursive as boolean,
          maxDepth: params.maxDepth as number,
          fileTypes: params.fileTypes as string[],
        });
      } else if (fsOp === 'deleteFile') {
        return fileSystemExecutor.deleteFile(params.path as string);
      } else if (fsOp === 'createDirectory') {
        return fileSystemExecutor.createDirectory(params.path as string);
      }
      throw new Error(`Unknown filesystem operation: ${operation}`);

    case 'browser':
      const browserOp = operation as keyof Omit<
        typeof browserExecutor,
        'constructor' | 'initialize' | 'ensureInitialized' | 'close' | 'isReady' | 'getCurrentUrl'
      >;
      if (browserOp === 'navigate') {
        return browserExecutor.navigate({
          url: params.url as string,
          waitUntil: params.waitUntil as 'load' | 'domcontentloaded' | 'networkidle' | 'commit',
          timeout: params.timeout as number,
        });
      } else if (browserOp === 'click') {
        return browserExecutor.click(params.selector as string);
      } else if (browserOp === 'fill') {
        return browserExecutor.fill(params.selector as string, params.value as string);
      } else if (browserOp === 'screenshot') {
        return browserExecutor.screenshot({
          fullPage: params.fullPage as boolean,
        });
      } else if (browserOp === 'getText') {
        return browserExecutor.getText(params.selector as string);
      }
      throw new Error(`Unknown browser operation: ${operation}`);

    case 'sandbox':
      return sandboxExecutor.execute({
        code: params.code as string,
        language: params.language as 'javascript' | 'typescript',
        input: params.input as Record<string, unknown>,
      });

    default:
      throw new Error(`Unknown execution type: ${type}`);
  }
}
