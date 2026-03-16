import { Agent } from '../../core/agent.js';
import { AgentOptions } from '../../core/agent.js';
/**
 * Chaos Tester Agent - Fault injection and failure testing
 */
export declare class ChaosTesterAgent extends Agent {
    private experiments;
    private injectors;
    private testResults;
    constructor(options: AgentOptions);
    /**
     * Setup chaos injectors
     */
    private setupInjectors;
    /**
     * Inject tool call failure
     */
    private injectToolCallFailure;
    /**
     * Inject timeout
     */
    private injectTimeout;
    /**
     * Inject malformed data
     */
    private injectMalformedData;
    /**
     * Inject exception
     */
    private injectException;
    /**
     * Run chaos experiment
     */
    runExperiment(name: string, config: ChaosConfig): Promise<ExperimentResult>;
    /**
     * Execute function with chaos injection
     */
    private executeWithChaos;
    /**
     * Apply chaos to a function
     */
    private applyChaos;
    /**
     * Run chaos test suite
     */
    runTestSuite(config: TestSuiteConfig): Promise<TestSuiteResult>;
    /**
     * Get experiment history
     */
    getExperiments(): Experiment[];
    /**
     * Get test results
     */
    getTestResults(): TestResult[];
    /**
     * Get summary statistics
     */
    getStats(): {
        totalExperiments: number;
        passRate: number;
        avgDuration: number;
    };
}
export interface ChaosInjector {
    type: string;
    inject: (fn: () => Promise<unknown>, config?: any) => Promise<unknown>;
}
export interface ChaosConfig {
    tests: {
        name: string;
        fn: () => Promise<unknown>;
        chaos: string;
        expectFailure?: boolean;
    }[];
}
export interface TimeoutConfig {
    timeout: number;
}
export interface Experiment {
    id: string;
    name: string;
    config: ChaosConfig;
    status: 'running' | 'completed' | 'failed';
    startedAt: Date;
    completedAt?: Date;
    error?: string;
}
export interface TestResult {
    experimentId: string;
    passed: boolean;
    results: ChaosResult[];
    duration: number;
    timestamp: Date;
}
export interface ChaosResult {
    name: string;
    chaos: string;
    success: boolean;
    result?: unknown;
    error?: string;
}
export interface ExperimentResult {
    experiment: Experiment;
    result: TestResult | null;
    error?: string;
}
export interface TestSuiteConfig {
    experiments: {
        name: string;
        config: ChaosConfig;
    }[];
}
export interface TestSuiteResult {
    passed: boolean;
    totalExperiments: number;
    failedExperiments: string[];
    results: ExperimentResult[];
    timestamp: Date;
}
/**
 * Factory function to create a chaos tester agent
 */
export declare function createChaosTesterAgent(options: AgentOptions): ChaosTesterAgent;
//# sourceMappingURL=chaos-tester-agent.d.ts.map