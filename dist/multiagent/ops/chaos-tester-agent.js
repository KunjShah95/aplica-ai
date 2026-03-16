import { randomUUID } from 'crypto';
import { Agent } from '../../core/agent.js';
/**
 * Chaos Tester Agent - Fault injection and failure testing
 */
export class ChaosTesterAgent extends Agent {
    experiments = [];
    injectors = new Map();
    testResults = [];
    constructor(options) {
        super(options);
        this.setupInjectors();
    }
    /**
     * Setup chaos injectors
     */
    setupInjectors() {
        this.injectors.set('tool_call', {
            type: 'tool_call',
            inject: (fn) => this.injectToolCallFailure(fn),
        });
        this.injectors.set('timeout', {
            type: 'timeout',
            inject: (fn, config) => this.injectTimeout(fn, config),
        });
        this.injectors.set('malformed_data', {
            type: 'malformed_data',
            inject: async (fn) => {
                const data = await fn();
                return this.injectMalformedData(data);
            },
        });
        this.injectors.set('exception', {
            type: 'exception',
            inject: (fn) => this.injectException(fn),
        });
    }
    /**
     * Inject tool call failure
     */
    async injectToolCallFailure(fn) {
        if (Math.random() < 0.1) { // 10% failure rate
            throw new Error('Tool call failed: simulated failure');
        }
        return fn();
    }
    /**
     * Inject timeout
     */
    async injectTimeout(fn, config = { timeout: 100 }) {
        const { timeout } = config;
        let completed = false;
        const result = await Promise.race([
            fn().then((r) => {
                completed = true;
                return r;
            }),
            new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), timeout)),
        ]);
        return result;
    }
    /**
     * Inject malformed data
     */
    injectMalformedData(data) {
        if (Math.random() < 0.1) { // 10% malformed data rate
            if (typeof data === 'object' && data !== null) {
                // Add malformed fields
                return {
                    ...data,
                    _malformed: true,
                    corrupted: ' data',
                };
            }
        }
        return data;
    }
    /**
     * Inject exception
     */
    async injectException(fn) {
        if (Math.random() < 0.05) { // 5% exception rate
            throw new Error('Chaos injection: simulated exception');
        }
        return fn();
    }
    /**
     * Run chaos experiment
     */
    async runExperiment(name, config) {
        const startTime = Date.now();
        const experiment = {
            id: randomUUID(),
            name,
            config,
            status: 'running',
            startedAt: new Date(),
        };
        this.experiments.push(experiment);
        try {
            const results = await this.executeWithChaos(config);
            const duration = Date.now() - startTime;
            const result = {
                experimentId: experiment.id,
                passed: results.every((r) => r.success),
                results,
                duration,
                timestamp: new Date(),
            };
            this.testResults.push(result);
            experiment.status = 'completed';
            experiment.completedAt = new Date();
            return {
                experiment,
                result,
            };
        }
        catch (error) {
            const duration = Date.now() - startTime;
            experiment.status = 'failed';
            experiment.error = String(error);
            experiment.completedAt = new Date();
            return {
                experiment,
                error: String(error),
                result: null,
            };
        }
    }
    /**
     * Execute function with chaos injection
     */
    async executeWithChaos(config) {
        const results = [];
        for (const test of config.tests) {
            let success = true;
            let error;
            try {
                const result = await this.applyChaos(test.chaos, test.fn);
                results.push({
                    name: test.name,
                    chaos: test.chaos,
                    success: true,
                    result,
                });
            }
            catch (err) {
                // Check if this is expected failure
                if (test.expectFailure) {
                    success = true;
                    error = String(err);
                }
                else {
                    success = false;
                    error = String(err);
                }
                results.push({
                    name: test.name,
                    chaos: test.chaos,
                    success,
                    error,
                });
            }
        }
        return results;
    }
    /**
     * Apply chaos to a function
     */
    async applyChaos(chaosType, fn) {
        const injector = this.injectors.get(chaosType);
        if (!injector) {
            return fn();
        }
        return injector.inject(fn);
    }
    /**
     * Run chaos test suite
     */
    async runTestSuite(config) {
        const results = [];
        const failedExperiments = [];
        for (const expConfig of config.experiments) {
            const result = await this.runExperiment(expConfig.name, expConfig.config);
            results.push(result);
            if (result.result && !result.result.passed) {
                failedExperiments.push(expConfig.name);
            }
        }
        return {
            passed: failedExperiments.length === 0,
            totalExperiments: config.experiments.length,
            failedExperiments,
            results,
            timestamp: new Date(),
        };
    }
    /**
     * Get experiment history
     */
    getExperiments() {
        return this.experiments;
    }
    /**
     * Get test results
     */
    getTestResults() {
        return this.testResults;
    }
    /**
     * Get summary statistics
     */
    getStats() {
        if (this.testResults.length === 0) {
            return {
                totalExperiments: 0,
                passRate: 0,
                avgDuration: 0,
            };
        }
        const passed = this.testResults.filter((r) => r.passed).length;
        return {
            totalExperiments: this.testResults.length,
            passRate: passed / this.testResults.length,
            avgDuration: this.testResults.reduce((a, r) => a + r.duration, 0) / this.testResults.length,
        };
    }
}
/**
 * Factory function to create a chaos tester agent
 */
export function createChaosTesterAgent(options) {
    return new ChaosTesterAgent(options);
}
//# sourceMappingURL=chaos-tester-agent.js.map