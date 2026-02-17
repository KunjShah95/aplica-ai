import { Worker, isMainThread } from 'worker_threads';
import * as path from 'path';
import { randomUUID } from 'crypto';
import { DockerSandboxExecutor } from './docker-sandbox.js';
export class SandboxExecutor {
    options;
    defaultTimeout = 30000;
    defaultMemoryLimit = 512 * 1024 * 1024;
    defaultCpuLimit = 50;
    useDocker = true;
    allowInsecureFallback = true;
    dockerExecutor;
    constructor(options = {}) {
        this.options = options;
        const secureMode = process.env.SECURE_MODE === 'true';
        this.defaultTimeout = options.timeout ?? 30000;
        this.defaultMemoryLimit = options.memoryLimit ?? 512 * 1024 * 1024;
        this.defaultCpuLimit = options.cpuLimit ?? 50;
        this.useDocker = options.useDocker ?? true;
        this.allowInsecureFallback = options.allowInsecureFallback ?? !secureMode;
        this.dockerExecutor = new DockerSandboxExecutor(options);
    }
    async execute(task) {
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
            }
            catch (e) {
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
    async runInWorker(id, task, startTime) {
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
            worker.stdout?.on('data', (data) => {
                output += data.toString();
            });
            worker.stderr?.on('data', (data) => {
                errorOutput += data.toString();
            });
            worker.on('message', (result) => {
                resolve(result);
            });
            worker.on('error', (error) => {
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
            worker.on('exit', (code) => {
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
    async runInCurrentThread(task, startTime) {
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
        }
        catch (error) {
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
    async evaluteCode(code, input) {
        const context = {
            console: {
                log: (...args) => console.log(...args),
                error: (...args) => console.error(...args),
                warn: (...args) => console.warn(...args),
                info: (...args) => console.info(...args),
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
    async executeJavaScript(code, input) {
        return this.execute({
            code,
            language: 'javascript',
            input,
        });
    }
    async executeTypeScript(code, input) {
        return this.execute({
            code,
            language: 'typescript',
            input,
        });
    }
    getStatus() {
        return {
            timeout: this.defaultTimeout,
            memoryLimit: this.defaultMemoryLimit,
            cpuLimit: this.defaultCpuLimit,
            secureMode: this.useDocker,
        };
    }
}
export const sandboxExecutor = new SandboxExecutor({ useDocker: true });
//# sourceMappingURL=sandbox.js.map