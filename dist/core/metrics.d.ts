import { Registry, Counter, Histogram, Gauge, Summary } from 'prom-client';
export interface MetricsConfig {
    enabled?: boolean;
    prefix?: string;
    defaultLabels?: Record<string, string>;
    ignorePaths?: string[];
    includeStatusCode?: boolean;
}
export declare class MetricsService {
    private registry;
    private prefix;
    private counters;
    private histograms;
    private gauges;
    private summaries;
    constructor(config?: MetricsConfig);
    private initializeDefaultMetrics;
    createCounter(name: string, help: string, labelNames?: string[]): Counter;
    createHistogram(name: string, help: string, labelNames?: string[], buckets?: number[]): Histogram;
    createGauge(name: string, help: string, labelNames?: string[]): Gauge;
    createSummary(name: string, help: string, labelNames?: string[], percentiles?: number[]): Summary;
    getCounter(name: string): Counter | undefined;
    getHistogram(name: string): Histogram | undefined;
    getGauge(name: string): Gauge | undefined;
    getSummary(name: string): Summary | undefined;
    incrementHttpRequests(method: string, path: string, status: number): void;
    observeHttpRequestDuration(method: string, path: string, duration: number): void;
    incrementMessages(platform: string, type: string): void;
    setActiveConversations(count: number): void;
    incrementToolExecution(tool: string, status: 'success' | 'error'): void;
    observeToolDuration(tool: string, duration: number): void;
    incrementMemoryOperation(type: string, status: 'success' | 'error'): void;
    setDatabaseConnections(database: string, count: number): void;
    incrementCacheHit(cache: string): void;
    incrementCacheMiss(cache: string): void;
    incrementWorkflowExecution(workflow: string, status: 'success' | 'error'): void;
    getMetrics(): Promise<string>;
    getMetricsJSON(): Promise<Record<string, any>>;
    getSingleMetric(name: string): Promise<Record<string, any> | null>;
    resetAll(): void;
    removeSingleMetric(name: string): void;
    getContentType(): string;
    getRegistry(): Registry;
}
export declare const metrics: MetricsService;
export declare function createMetricsService(config?: MetricsConfig): MetricsService;
//# sourceMappingURL=metrics.d.ts.map