import { parentPort, workerData } from 'worker_threads';
const task = workerData;
const startTime = Date.now();
async function execute() {
    try {
        const result = await evaluateCode(task.code, task.input);
        return {
            id: task.id,
            success: true,
            output: typeof result === 'string' ? result : JSON.stringify(result, null, 2),
            executionTime: Date.now() - startTime,
            timestamp: new Date(),
        };
    }
    catch (error) {
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
async function evaluateCode(code, input) {
    const context = {
        console: {
            log: (...args) => parentPort?.postMessage({ type: 'stdout', data: args.map(String).join(' ') }),
            error: (...args) => parentPort?.postMessage({ type: 'stderr', data: args.map(String).join(' ') }),
            warn: (...args) => parentPort?.postMessage({ type: 'stderr', data: args.map(String).join(' ') }),
            info: (...args) => parentPort?.postMessage({ type: 'stdout', data: args.map(String).join(' ') }),
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
    return vm.runInNewContext(wrappedCode, context, { timeout: task.timeout });
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
//# sourceMappingURL=sandbox-worker.js.map