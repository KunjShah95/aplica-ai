
import { spawn } from 'child_process';
import { randomUUID } from 'crypto';
import { SandboxExecutionResult, SandboxedTask, SandboxOptions } from './sandbox.js';

export class DockerSandboxExecutor {
  private defaultTimeout: number;
  private defaultMemoryLimit: string;
  private defaultCpuLimit: number;
  private image: string;

  constructor(options: SandboxOptions & { image?: string } = {}) {
    this.defaultTimeout = options.timeout ?? 30000;
    // Docker memory needs units like 512m
    this.defaultMemoryLimit = options.memoryLimit ? `${Math.floor(options.memoryLimit / 1024 / 1024)}m` : '512m';
    this.defaultCpuLimit = options.cpuLimit ? options.cpuLimit / 100 : 0.5; // converts % to cpu units (0.5 = 50%)
    this.image = options.image || 'node:20-alpine';
  }

  async execute(task: SandboxedTask): Promise<SandboxExecutionResult> {
    const id = randomUUID();
    const startTime = Date.now();

    // Wrap code to include input
    const inputStr = JSON.stringify(task.input || {});
    // We create a wrapper that:
    // 1. Assigns 'input' variable
    // 2. Wraps user code in async IIFE
    // 3. Catches errors
    const wrappedCode = `
      const input = ${inputStr};
      const consoleLog = console.log;
      // Override console.log if we want strict json output, but for now standard stdout is fine
      (async () => {
        try {
          ${task.code}
        } catch (e) {
          console.error(e);
          process.exit(1);
        }
      })();
    `;

    return new Promise((resolve) => {
      const args = [
        'run',
        '--rm',                     // Auto-remove
        '-i',                       // Interactive (stdin)
        '--network', 'none',        // No network
        '--read-only',              // Read-only filesystem
        '--tmpfs', '/tmp:rw,noexec,nosuid,size=64m',
        '--pids-limit', '50',
        '--ipc', 'none',
        '--memory', this.defaultMemoryLimit,
        '--cpus', String(this.defaultCpuLimit),
        '--security-opt', 'no-new-privileges',
        '--cap-drop', 'ALL',        // Drop capabilities
        '--user', 'node',
        '--workdir', '/tmp',
        this.image,
        'node'                      // Read from stdin
      ];

      const child = spawn('docker', args);

      let stdout = '';
      let stderr = '';
      let timeoutId: NodeJS.Timeout;

      timeoutId = setTimeout(() => {
        child.kill();
        resolve({
          id,
          success: false,
          output: stdout,
          error: `Execution timed out after ${this.defaultTimeout}ms`,
          executionTime: Date.now() - startTime,
          timestamp: new Date(),
          secure: true
        });
      }, this.defaultTimeout);

      if (child.stdin) {
        child.stdin.write(wrappedCode);
        child.stdin.end();
      }

      child.stdout?.on('data', (data) => {
        stdout += data.toString();
      });

      child.stderr?.on('data', (data) => {
        stderr += data.toString();
      });

      child.on('close', (code) => {
        clearTimeout(timeoutId);
        resolve({
          id,
          success: code === 0,
          output: stdout,
          error: code !== 0 ? (stderr || `Process exited with code ${code}`) : undefined,
          executionTime: Date.now() - startTime,
          timestamp: new Date(),
          secure: true
        });
      });

      child.on('error', (err) => {
        clearTimeout(timeoutId);
        resolve({
          id,
          success: false,
          output: stdout,
          error: `Docker failed to start: ${err.message}. Is Docker installed and running?`,
          executionTime: Date.now() - startTime,
          timestamp: new Date(),
          secure: true
        });
      });
    });
  }
}
