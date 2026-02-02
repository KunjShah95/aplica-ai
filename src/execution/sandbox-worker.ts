import { parentPort, workerData } from 'worker_threads';
import { SandboxExecutionResult } from './sandbox.js';

interface WorkerTask {
  id: string;
  code: string;
  language: 'javascript' | 'typescript';
  input?: Record<string, unknown>;
  timeout: number;
  memoryLimit: number;
}

const task = workerData as WorkerTask;
const startTime = Date.now();

async function execute(): Promise<SandboxExecutionResult> {
  try {
    const result = await evaluateCode(task.code, task.input);
    return {
      id: task.id,
      success: true,
      output: typeof result === 'string' ? result : JSON.stringify(result, null, 2),
      executionTime: Date.now() - startTime,
      timestamp: new Date(),
    };
  } catch (error) {
    return {
      id: task.id,
      success: false,
      output: '',
      error: error instanceof Error ? error.message : String(error),
      executionTime: Date.now() - startTime,
      timestamp: new Date(),
    };
  }
}

async function evaluateCode(code: string, input?: Record<string, unknown>): Promise<unknown> {
  const context: Record<string, unknown> = {
    console: {
      log: (...args: unknown[]) =>
        parentPort?.postMessage({ type: 'stdout', data: args.map(String).join(' ') }),
      error: (...args: unknown[]) =>
        parentPort?.postMessage({ type: 'stderr', data: args.map(String).join(' ') }),
      warn: (...args: unknown[]) =>
        parentPort?.postMessage({ type: 'stderr', data: args.map(String).join(' ') }),
      info: (...args: unknown[]) =>
        parentPort?.postMessage({ type: 'stdout', data: args.map(String).join(' ') }),
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

execute()
  .then((result) => {
    parentPort?.postMessage(result);
  })
  .catch((error) => {
    parentPort?.postMessage({
      id: task.id,
      success: false,
      output: '',
      error: error.message,
      executionTime: Date.now() - startTime,
      timestamp: new Date(),
    });
  });
