import { Worker, isMainThread } from 'worker_threads';
import * as path from 'path';
import { randomUUID } from 'crypto';
import { DockerSandboxExecutor } from './docker-sandbox.js';

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
  secure?: boolean; // Indicates if the execution was securely sandboxed (e.g. via Docker)
}

export interface SandboxedTask {
  code: string;
  language: 'javascript' | 'typescript';
  input?: Record<string, unknown>;
}

export class SandboxExecutor {
  private defaultTimeout: number = 30000;
  private defaultMemoryLimit: number = 512 * 1024 * 1024;
  private defaultCpuLimit: number = 50;
  private useDocker: boolean = true;
  private allowInsecureFallback: boolean = true;
  private dockerExecutor: DockerSandboxExecutor;

  constructor(private options: SandboxOptions = {}) {
    const secureMode = process.env.SECURE_MODE === 'true';
    this.defaultTimeout = options.timeout ?? 30000;
    this.defaultMemoryLimit = options.memoryLimit ?? 512 * 1024 * 1024;
    this.defaultCpuLimit = options.cpuLimit ?? 50;
    this.useDocker = options.useDocker ?? true;
    this.allowInsecureFallback = options.allowInsecureFallback ?? !secureMode;
    this.dockerExecutor = new DockerSandboxExecutor(options);
  }

  async execute(task: SandboxedTask): Promise<SandboxExecutionResult> {
    const id = randomUUID();
    const startTime = Date.now();

    if (this.useDocker) {
      try {
        const dockerResult = await this.dockerExecutor.execute(task);
        if (dockerResult.success || (dockerResult.error && !dockerResult.error.includes('Docker failed'))) {
          return { ...dockerResult, secure: true };
        }
        // If docker failed to start (not code error), fallback or error out
        if (!this.allowInsecureFallback) {
          return {
            ...dockerResult,
            success: false,
            error: 'Secure sandbox unavailable; insecure fallback is disabled.',
            secure: true,
          };
        }

        console.warn('Docker sandbox failed to start, falling back to VM isolation (LESS SECURE). Error:', dockerResult.error);
      } catch (e) {
        if (!this.allowInsecureFallback) {
          return {
            id,
            success: false,
            output: '',
            error: 'Secure sandbox unavailable; insecure fallback is disabled.',
            executionTime: Date.now() - startTime,
            timestamp: new Date(),
            secure: true,
          };
        }

        console.warn('Docker sandbox exception, falling back to VM isolation (LESS SECURE).', e);
      }
    }

    // Fallback to minimal VM isolation (Legacy / Dev mode)
    // WARN: This is not secure for untrusted code
    if (isMainThread) {
      const result = await this.runInWorker(id, task, startTime);
      return { ...result, secure: false };
    }

    return this.runInCurrentThread(task, startTime);
  }

  private async runInWorker(
    id: string,
    task: SandboxedTask,
    startTime: number
  ): Promise<SandboxExecutionResult> {
    return new Promise((resolve) => {
      const workerPath = path.join(__dirname, 'sandbox-worker.js');
      const worker = new Worker(workerPath, {
        workerData: {
          id,
          code: task.code,
          language: task.language,
          input: task.input,
          timeout: this.defaultTimeout,
          memoryLimit: this.defaultMemoryLimit,
        },
      });

      let output = '';
      let errorOutput = '';

      worker.stdout?.on('data', (data: Buffer) => {
        output += data.toString();
      });

      worker.stderr?.on('data', (data: Buffer) => {
        errorOutput += data.toString();
      });

      worker.on('message', (result: SandboxExecutionResult) => {
        resolve(result);
      });

      worker.on('error', (error: Error) => {
        resolve({
          id,
          success: false,
          output,
          error: error.message || errorOutput,
          executionTime: Date.now() - startTime,
          timestamp: new Date(),
          secure: false,
        });
      });

      worker.on('exit', (code: number) => {
        if (code !== 0 && !output && !errorOutput) {
          resolve({
            id,
            success: false,
            output,
            error: `Worker exited with code ${code}`,
            executionTime: Date.now() - startTime,
            timestamp: new Date(),
            secure: false,
          });
        }
      });

      setTimeout(() => {
        worker.terminate();
        resolve({
          id,
          success: false,
          output,
          error: `Execution timed out after ${this.defaultTimeout}ms`,
          executionTime: Date.now() - startTime,
          timestamp: new Date(),
          secure: false,
        });
      }, this.defaultTimeout);
    });
  }

  private async runInCurrentThread(
    task: SandboxedTask,
    startTime: number
  ): Promise<SandboxExecutionResult> {
    try {
      const result = await this.evaluteCode(task.code, task.input);
      return {
        id: randomUUID(),
        success: true,
        output: typeof result === 'string' ? result : JSON.stringify(result),
        executionTime: Date.now() - startTime,
        timestamp: new Date(),
        secure: false,
      };
    } catch (error) {
      return {
        id: randomUUID(),
        success: false,
        output: '',
        error: error instanceof Error ? error.message : String(error),
        executionTime: Date.now() - startTime,
        timestamp: new Date(),
        secure: false,
      };
    }
  }

  private async evaluteCode(code: string, input?: Record<string, unknown>): Promise<unknown> {
    const context: Record<string, unknown> = {
      console: {
        log: (...args: unknown[]) => console.log(...args),
        error: (...args: unknown[]) => console.error(...args),
        warn: (...args: unknown[]) => console.warn(...args),
        info: (...args: unknown[]) => console.info(...args),
      },
      setTimeout: setTimeout,
      setInterval: setInterval,
      clearTimeout: clearTimeout,
      clearInterval: clearInterval,
      Math: Math,
      Date: Date,
      JSON: JSON,
      Array: Array,
      Object: Object,
      String: String,
      Number: Number,
      Boolean: Boolean,
      Map: Map,
      Set: Set,
      Promise: Promise,
      ...input,
    };

    // Use vm.runInNewContext which provides a sandboxed environment
    // We wrap code in an IIFE to allow 'return' statements
    const wrappedCode = `(function() {
      'use strict';
      ${code}
    })()`;

    const vm = require('vm');
    return vm.runInNewContext(wrappedCode, context);
  }

  async executeJavaScript(
    code: string,
    input?: Record<string, unknown>
  ): Promise<SandboxExecutionResult> {
    return this.execute({
      code,
      language: 'javascript',
      input,
    });
  }

  async executeTypeScript(
    code: string,
    input?: Record<string, unknown>
  ): Promise<SandboxExecutionResult> {
    return this.execute({
      code,
      language: 'typescript',
      input,
    });
  }

  getStatus(): { timeout: number; memoryLimit: number; cpuLimit: number; secureMode: boolean } {
    return {
      timeout: this.defaultTimeout,
      memoryLimit: this.defaultMemoryLimit,
      cpuLimit: this.defaultCpuLimit,
      secureMode: this.useDocker,
    };
  }
}

export const sandboxExecutor = new SandboxExecutor({ useDocker: true });
