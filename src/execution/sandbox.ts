import { Worker, isMainThread, parentPort, workerData } from 'worker_threads';
import * as path from 'path';
import { randomUUID } from 'crypto';

export interface SandboxOptions {
  timeout?: number;
  memoryLimit?: number;
  cpuLimit?: number;
  allowedModules?: string[];
  workingDirectory?: string;
}

export interface SandboxExecutionResult {
  id: string;
  success: boolean;
  output: string;
  error?: string;
  executionTime: number;
  memoryUsage?: number;
  timestamp: Date;
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
  private taskCounter: number = 0;

  constructor(private options: SandboxOptions = {}) {
    this.defaultTimeout = options.timeout ?? 30000;
    this.defaultMemoryLimit = options.memoryLimit ?? 512 * 1024 * 1024;
    this.defaultCpuLimit = options.cpuLimit ?? 50;
  }

  async execute(task: SandboxedTask): Promise<SandboxExecutionResult> {
    const id = randomUUID();
    const startTime = Date.now();

    if (isMainThread) {
      return this.runInWorker(id, task, startTime);
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
      };
    } catch (error) {
      return {
        id: randomUUID(),
        success: false,
        output: '',
        error: error instanceof Error ? error.message : String(error),
        executionTime: Date.now() - startTime,
        timestamp: new Date(),
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

    const contextKeys = Object.keys(context);
    const contextValues = Object.values(context);
    const contextEntries = contextKeys.map((key, index) => `${key} = args[${index}]`).join(', ');

    const wrappedCode = `
      (function(args) {
        'use strict';
        const { ${contextKeys.join(', ')} } = args;
        ${code}
      })
    `;

    const fn = eval(wrappedCode);
    return fn(contextValues);
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

  getStatus(): { timeout: number; memoryLimit: number; cpuLimit: number } {
    return {
      timeout: this.defaultTimeout,
      memoryLimit: this.defaultMemoryLimit,
      cpuLimit: this.defaultCpuLimit,
    };
  }
}

export const sandboxExecutor = new SandboxExecutor();
