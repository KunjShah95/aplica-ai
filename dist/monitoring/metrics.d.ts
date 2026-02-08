import { Registry, Counter, Histogram, Gauge } from 'prom-client';
export declare class MetricsService {
    private registry;
    httpRequestsTotal: Counter;
    httpRequestDuration: Histogram;
    activeConnections: Gauge;
    llmRequestsTotal: Counter;
    llmTokensUsed: Counter;
    llmRequestDuration: Histogram;
    memoryOperations: Counter;
    workflowExecutions: Counter;
    errorTotal: Counter;
    queueSize: Gauge;
    constructor();
    recordHttpRequest(method: string, path: string, status: number, duration: number): void;
    recordLlmRequest(provider: string, model: string, status: 'success' | 'error', duration: number, tokens?: {
        prompt: number;
        completion: number;
    }): void;
    recordMemoryOperation(operation: 'add' | 'search' | 'get' | 'delete', type: string): void;
    recordWorkflowExecution(workflowName: string, status: 'success' | 'failed' | 'cancelled'): void;
    recordError(type: string, source: string): void;
    setActiveConnections(type: string, count: number): void;
    setQueueSize(queue: string, size: number): void;
    private normalizePath;
    getMetrics(): Promise<string>;
    getMetricsContentType(): Promise<string>;
    getRegistry(): Registry;
}
export declare const metricsService: MetricsService;
export declare function metricsMiddleware(): (req: any, res: any, next: () => void) => Promise<void>;
//# sourceMappingURL=metrics.d.ts.map