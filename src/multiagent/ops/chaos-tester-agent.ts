import { randomUUID } from 'crypto';
import { Agent } from '../../core/agent.js';
import { AgentOptions } from '../../core/agent.js';

/**
 * Chaos Tester Agent - Fault injection and failure testing
 */
export class ChaosTesterAgent extends Agent {
  private experiments: Experiment[] = [];
  private injectors: Map<string, ChaosInjector> = new Map();
  private testResults: TestResult[] = [];

  constructor(options: AgentOptions) {
    super(options);
    this.setupInjectors();
  }

  /**
   * Setup chaos injectors
   */
  private setupInjectors(): void {
    this.injectors.set('tool_call', {
      type: 'tool_call',
      inject: (fn: () => Promise<unknown>) => this.injectToolCallFailure(fn),
    });
    this.injectors.set('timeout', {
      type: 'timeout',
      inject: (fn: () => Promise<unknown>, config: TimeoutConfig) => this.injectTimeout(fn, config),
    });
    this.injectors.set('malformed_data', {
      type: 'malformed_data',
      inject: async (fn: () => Promise<unknown>) => {
        const data = await fn();
        return this.injectMalformedData(data);
      },
    });
    this.injectors.set('exception', {
      type: 'exception',
      inject: (fn: () => Promise<unknown>) => this.injectException(fn),
    });
  }

  /**
   * Inject tool call failure
   */
  private async injectToolCallFailure(
    fn: () => Promise<unknown>
  ): Promise<unknown> {
    if (Math.random() < 0.1) { // 10% failure rate
      throw new Error('Tool call failed: simulated failure');
    }
    return fn();
  }

  /**
   * Inject timeout
   */
  private async injectTimeout(
    fn: () => Promise<unknown>,
    config: TimeoutConfig = { timeout: 100 }
  ): Promise<unknown> {
    const { timeout } = config;
    let completed = false;

    const result = await Promise.race([
      fn().then((r) => {
        completed = true;
        return r;
      }),
      new Promise<never>((_, reject) => setTimeout(() => reject(new Error('Timeout')), timeout)),
    ]);

    return result;
  }

  /**
   * Inject malformed data
   */
  private injectMalformedData(data: unknown): unknown {
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
  private async injectException(fn: () => Promise<unknown>): Promise<unknown> {
    if (Math.random() < 0.05) { // 5% exception rate
      throw new Error('Chaos injection: simulated exception');
    }
    return fn();
  }

  /**
   * Run chaos experiment
   */
  async runExperiment(
    name: string,
    config: ChaosConfig
  ): Promise<ExperimentResult> {
    const startTime = Date.now();
    const experiment: Experiment = {
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

      const result: TestResult = {
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
    } catch (error) {
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
  private async executeWithChaos(config: ChaosConfig): Promise<ChaosResult[]> {
    const results: ChaosResult[] = [];

    for (const test of config.tests) {
      let success = true;
      let error: string | undefined;

      try {
        const result = await this.applyChaos(test.chaos, test.fn);
        results.push({
          name: test.name,
          chaos: test.chaos,
          success: true,
          result,
        });
      } catch (err) {
        // Check if this is expected failure
        if (test.expectFailure) {
          success = true;
          error = String(err);
        } else {
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
  private async applyChaos(chaosType: string, fn: () => Promise<unknown>): Promise<unknown> {
    const injector = this.injectors.get(chaosType);
    if (!injector) {
      return fn();
    }

    return injector.inject(fn);
  }

  /**
   * Run chaos test suite
   */
  async runTestSuite(config: TestSuiteConfig): Promise<TestSuiteResult> {
    const results: ExperimentResult[] = [];
    const failedExperiments: string[] = [];

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
  getExperiments(): Experiment[] {
    return this.experiments;
  }

  /**
   * Get test results
   */
  getTestResults(): TestResult[] {
    return this.testResults;
  }

  /**
   * Get summary statistics
   */
  getStats(): {
    totalExperiments: number;
    passRate: number;
    avgDuration: number;
  } {
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
export function createChaosTesterAgent(options: AgentOptions): ChaosTesterAgent {
  return new ChaosTesterAgent(options);
}
