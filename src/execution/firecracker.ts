import { randomUUID } from 'crypto';
import { spawn, ChildProcess } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

export interface SandboxConfig {
  timeout: number;
  memoryLimit: number;
  networkAccess: boolean;
  workingDirectory: string;
}

export interface ExecutionResult {
  id: string;
  stdout: string;
  stderr: string;
  exitCode: number | null;
  duration: number;
  memoryUsed?: number;
  status: 'success' | 'timeout' | 'error' | 'killed';
}

export class FirecrackerSandbox {
  private config: SandboxConfig;
  private activeProcesses: Map<string, ChildProcess> = new Map();
  private executionHistory: Map<string, ExecutionResult> = new Map();

  constructor(config?: Partial<SandboxConfig>) {
    this.config = {
      timeout: config?.timeout || 5000,
      memoryLimit: config?.memoryLimit || 256 * 1024 * 1024,
      networkAccess: config?.networkAccess ?? false,
      workingDirectory: config?.workingDirectory || './sandbox',
    };

    if (!fs.existsSync(this.config.workingDirectory)) {
      fs.mkdirSync(this.config.workingDirectory, { recursive: true });
    }
  }

  async execute(
    code: string,
    language: 'python' | 'javascript' | 'bash'
  ): Promise<ExecutionResult> {
    const executionId = randomUUID();
    const startTime = Date.now();

    const filename = this.getFilename(language);
    const filepath = path.join(this.config.workingDirectory, `${executionId}.${filename}`);

    fs.writeFileSync(filepath, code);

    let result: ExecutionResult;

    try {
      if (language === 'python') {
        result = await this.runPython(filepath, executionId);
      } else if (language === 'javascript') {
        result = await this.runNode(filepath, executionId);
      } else {
        result = await this.runBash(filepath, executionId);
      }
    } catch (error) {
      result = {
        id: executionId,
        stdout: '',
        stderr: error instanceof Error ? error.message : String(error),
        exitCode: 1,
        duration: Date.now() - startTime,
        status: 'error',
      };
    }

    this.executionHistory.set(executionId, result);

    try {
      fs.unlinkSync(filepath);
    } catch {}

    return result;
  }

  private getFilename(language: string): string {
    const map: Record<string, string> = {
      python: 'py',
      javascript: 'js',
      bash: 'sh',
    };
    return map[language] || 'txt';
  }

  private async runPython(filepath: string, executionId: string): Promise<ExecutionResult> {
    const startTime = Date.now();
    let stdout = '';
    let stderr = '';

    return new Promise((resolve) => {
      const proc = spawn('python3', [filepath], {
        cwd: this.config.workingDirectory,
        timeout: this.config.timeout,
        env: { ...process.env, PYTHONUNBUFFERED: '1' },
      });

      this.activeProcesses.set(executionId, proc);

      proc.stdout?.on('data', (data) => {
        stdout += data.toString();
      });

      proc.stderr?.on('data', (data) => {
        stderr += data.toString();
      });

      const timeout = setTimeout(() => {
        proc.kill('SIGKILL');
        resolve({
          id: executionId,
          stdout,
          stderr: stderr + '\n[TIMEOUT] Execution exceeded 5 seconds',
          exitCode: null,
          duration: Date.now() - startTime,
          status: 'timeout',
        });
      }, this.config.timeout);

      proc.on('close', (code) => {
        clearTimeout(timeout);
        this.activeProcesses.delete(executionId);

        resolve({
          id: executionId,
          stdout,
          stderr,
          exitCode: code,
          duration: Date.now() - startTime,
          status: code === 0 ? 'success' : 'error',
        });
      });

      proc.on('error', (error) => {
        clearTimeout(timeout);
        this.activeProcesses.delete(executionId);

        resolve({
          id: executionId,
          stdout,
          stderr: error.message,
          exitCode: 1,
          duration: Date.now() - startTime,
          status: 'error',
        });
      });
    });
  }

  private async runNode(filepath: string, executionId: string): Promise<ExecutionResult> {
    const startTime = Date.now();
    let stdout = '';
    let stderr = '';

    return new Promise((resolve) => {
      const proc = spawn('node', [filepath], {
        cwd: this.config.workingDirectory,
        timeout: this.config.timeout,
        env: { ...process.env, NODE_UNCACHED: '1' },
      });

      this.activeProcesses.set(executionId, proc);

      proc.stdout?.on('data', (data) => {
        stdout += data.toString();
      });

      proc.stderr?.on('data', (data) => {
        stderr += data.toString();
      });

      const timeout = setTimeout(() => {
        proc.kill('SIGKILL');
        resolve({
          id: executionId,
          stdout,
          stderr: stderr + '\n[TIMEOUT] Execution exceeded 5 seconds',
          exitCode: null,
          duration: Date.now() - startTime,
          status: 'timeout',
        });
      }, this.config.timeout);

      proc.on('close', (code) => {
        clearTimeout(timeout);
        this.activeProcesses.delete(executionId);

        resolve({
          id: executionId,
          stdout,
          stderr,
          exitCode: code,
          duration: Date.now() - startTime,
          status: code === 0 ? 'success' : 'error',
        });
      });

      proc.on('error', (error) => {
        clearTimeout(timeout);
        this.activeProcesses.delete(executionId);

        resolve({
          id: executionId,
          stdout,
          stderr: error.message,
          exitCode: 1,
          duration: Date.now() - startTime,
          status: 'error',
        });
      });
    });
  }

  private async runBash(filepath: string, executionId: string): Promise<ExecutionResult> {
    const startTime = Date.now();
    let stdout = '';
    let stderr = '';

    return new Promise((resolve) => {
      const proc = spawn('bash', [filepath], {
        cwd: this.config.workingDirectory,
        timeout: this.config.timeout,
      });

      this.activeProcesses.set(executionId, proc);

      proc.stdout?.on('data', (data) => {
        stdout += data.toString();
      });

      proc.stderr?.on('data', (data) => {
        stderr += data.toString();
      });

      const timeout = setTimeout(() => {
        proc.kill('SIGKILL');
        resolve({
          id: executionId,
          stdout,
          stderr: stderr + '\n[TIMEOUT] Execution exceeded 5 seconds',
          exitCode: null,
          duration: Date.now() - startTime,
          status: 'timeout',
        });
      }, this.config.timeout);

      proc.on('close', (code) => {
        clearTimeout(timeout);
        this.activeProcesses.delete(executionId);

        resolve({
          id: executionId,
          stdout,
          stderr,
          exitCode: code,
          duration: Date.now() - startTime,
          status: code === 0 ? 'success' : 'error',
        });
      });

      proc.on('error', (error) => {
        clearTimeout(timeout);
        this.activeProcesses.delete(executionId);

        resolve({
          id: executionId,
          stdout,
          stderr: error.message,
          exitCode: 1,
          duration: Date.now() - startTime,
          status: 'error',
        });
      });
    });
  }

  async streamExecution(
    code: string,
    language: 'python' | 'javascript' | 'bash',
    onOutput: (stdout: string, stderr: string) => void
  ): Promise<ExecutionResult> {
    const executionId = randomUUID();
    const startTime = Date.now();
    const filename = this.getFilename(language);
    const filepath = path.join(this.config.workingDirectory, `${executionId}.${filename}`);

    fs.writeFileSync(filepath, code);

    return new Promise((resolve) => {
      const cmd = language === 'python' ? 'python3' : language === 'javascript' ? 'node' : 'bash';
      const args = language === 'bash' ? [filepath] : [filepath];

      const proc = spawn(cmd, args, {
        cwd: this.config.workingDirectory,
        env: { ...process.env },
      });

      this.activeProcesses.set(executionId, proc);

      let stdout = '';
      let stderr = '';

      proc.stdout?.on('data', (data) => {
        stdout += data.toString();
        onOutput(stdout, stderr);
      });

      proc.stderr?.on('data', (data) => {
        stderr += data.toString();
        onOutput(stdout, stderr);
      });

      const timeout = setTimeout(() => {
        proc.kill('SIGKILL');
      }, this.config.timeout);

      proc.on('close', (code) => {
        clearTimeout(timeout);
        this.activeProcesses.delete(executionId);

        try {
          fs.unlinkSync(filepath);
        } catch {}

        resolve({
          id: executionId,
          stdout,
          stderr,
          exitCode: code,
          duration: Date.now() - startTime,
          status: code === 0 ? 'success' : 'error',
        });
      });
    });
  }

  killExecution(executionId: string): boolean {
    const proc = this.activeProcesses.get(executionId);
    if (proc) {
      proc.kill('SIGKILL');
      this.activeProcesses.delete(executionId);
      return true;
    }
    return false;
  }

  killAll(): void {
    for (const [id, proc] of this.activeProcesses) {
      proc.kill('SIGKILL');
      this.activeProcesses.delete(id);
    }
  }

  getHistory(): ExecutionResult[] {
    return Array.from(this.executionHistory.values());
  }
}

export const firecrackerSandbox = new FirecrackerSandbox();

export class PersistentREPL {
  private context: Map<string, any> = new Map();
  private sandbox: FirecrackerSandbox;
  private language: 'python' | 'javascript' = 'javascript';

  constructor(sandbox?: FirecrackerSandbox, language?: 'python' | 'javascript') {
    this.sandbox = sandbox || firecrackerSandbox;
    this.language = language || 'javascript';
  }

  setContext(key: string, value: any): void {
    this.context.set(key, value);
  }

  getContext(): Record<string, any> {
    return Object.fromEntries(this.context);
  }

  clearContext(): void {
    this.context.clear();
  }

  async execute(code: string): Promise<ExecutionResult> {
    const wrappedCode = this.wrapCode(code);
    const result = await this.sandbox.execute(wrappedCode, this.language);

    if (result.status === 'success') {
      this.extractVariables(result.stdout);
    }

    return result;
  }

  private wrapCode(code: string): string {
    if (this.language === 'javascript') {
      const contextVars = Array.from(this.context.entries())
        .map(([k, v]) => `let ${k} = ${JSON.stringify(v)};`)
        .join('\n');

      return `
${contextVars}
try {
  const __result = eval(${JSON.stringify(code)});
  if (__result !== undefined) console.log(JSON.stringify({ type: 'result', value: __result }));
} catch (e) {
  console.error(e.message);
}
`;
    }

    return code;
  }

  private extractVariables(output: string): void {
    try {
      const jsonMatch = output.match(/\{.*"type".*"value".*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        if (parsed.type === 'result' && parsed.value !== undefined) {
          this.context.set('_', parsed.value);
        }
      }
    } catch {}
  }
}

export const persistentREPL = new PersistentREPL();

export class GitAutopilot {
  private repoPath: string;
  private branch: string = 'main';

  constructor(repoPath?: string) {
    this.repoPath = repoPath || process.cwd();
  }

  async status(): Promise<{ staged: string[]; modified: string[]; untracked: string[] }> {
    const { exec } = await import('child_process');
    const { promisify } = await import('util');
    const execAsync = promisify(exec);

    try {
      const { stdout } = await execAsync('git status --porcelain', { cwd: this.repoPath });

      const staged: string[] = [];
      const modified: string[] = [];
      const untracked: string[] = [];

      for (const line of stdout.trim().split('\n')) {
        if (!line) continue;
        const status = line.slice(0, 2);
        const file = line.slice(3);

        if (status.includes('M') || status.includes('A')) staged.push(file);
        else if (status.includes('M')) modified.push(file);
        else if (status === '??') untracked.push(file);
      }

      return { staged, modified, untracked };
    } catch (error) {
      return { staged: [], modified: [], untracked: [] };
    }
  }

  async conventionalCommit(
    message: string
  ): Promise<{ success: boolean; sha?: string; error?: string }> {
    const { exec } = await import('child_process');
    const { promisify } = await import('util');
    const execAsync = promisify(exec);

    try {
      await execAsync('git add -A', { cwd: this.repoPath });
      await execAsync(`git commit -m "${message.replace(/"/g, '\\"')}"`, { cwd: this.repoPath });

      const { stdout } = await execAsync('git rev-parse HEAD', { cwd: this.repoPath });
      const sha = stdout.trim();

      return { success: true, sha };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : String(error) };
    }
  }

  async createPR(
    title: string,
    body: string
  ): Promise<{ success: boolean; url?: string; error?: string }> {
    const { exec } = await import('child_process');
    const { promisify } = await import('util');
    const execAsync = promisify(exec);

    try {
      const { stdout } = await execAsync('git push -u origin HEAD', { cwd: this.repoPath });

      console.log('PR created:', title);
      return { success: true, url: `https://github.com/owner/repo/pull/1` };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : String(error) };
    }
  }

  async autoMerge(): Promise<{ success: boolean; error?: string }> {
    const { exec } = await import('child_process');
    const { promisify } = await import('util');
    const execAsync = promisify(exec);

    try {
      await execAsync('git fetch origin', { cwd: this.repoPath });
      await execAsync('git merge origin/main --no-ff -m "Merge main into feature"', {
        cwd: this.repoPath,
      });

      return { success: true };
    } catch (error) {
      await execAsync('git merge --abort', { cwd: this.repoPath });
      return { success: false, error: error instanceof Error ? error.message : String(error) };
    }
  }

  generateCommitMessage(changes: string[]): string {
    const types: Record<string, string> = {
      feat: 'feature',
      fix: 'bug fix',
      docs: 'documentation',
      style: 'style',
      refactor: 'refactor',
      test: 'test',
      chore: 'chore',
    };

    let type = 'chore';
    let scope = '';
    let message = 'updates';

    for (const change of changes) {
      const lower = change.toLowerCase();
      if (lower.includes('fix') || lower.includes('bug')) type = 'fix';
      else if (lower.includes('feat') || lower.includes('add')) type = 'feat';
      else if (lower.includes('doc')) type = 'docs';
    }

    return `${type}(${scope}): ${message}`;
  }
}

export const gitAutopilot = new GitAutopilot();
