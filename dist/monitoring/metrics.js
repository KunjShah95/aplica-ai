import { Registry, Counter, Histogram, Gauge, collectDefaultMetrics } from 'prom-client';
export class MetricsService {
    registry;
    httpRequestsTotal;
    httpRequestDuration;
    activeConnections;
    llmRequestsTotal;
    llmTokensUsed;
    llmRequestDuration;
    memoryOperations;
    workflowExecutions;
    errorTotal;
    queueSize;
    constructor() {
        this.registry = new Registry();
        collectDefaultMetrics({ register: this.registry });
        this.httpRequestsTotal = new Counter({
            name: 'http_requests_total',
            help: 'Total number of HTTP requests',
            labelNames: ['method', 'path', 'status'],
            registers: [this.registry],
        });
        this.httpRequestDuration = new Histogram({
            name: 'http_request_duration_seconds',
            help: 'Duration of HTTP requests in seconds',
            labelNames: ['method', 'path', 'status'],
            buckets: [0.01, 0.05, 0.1, 0.5, 1, 2, 5, 10],
            registers: [this.registry],
        });
        this.activeConnections = new Gauge({
            name: 'active_connections',
            help: 'Number of active connections',
            labelNames: ['type'],
            registers: [this.registry],
        });
        this.llmRequestsTotal = new Counter({
            name: 'llm_requests_total',
            help: 'Total number of LLM API requests',
            labelNames: ['provider', 'model', 'status'],
            registers: [this.registry],
        });
        this.llmTokensUsed = new Counter({
            name: 'llm_tokens_total',
            help: 'Total number of tokens used',
            labelNames: ['provider', 'model', 'type'],
            registers: [this.registry],
        });
        this.llmRequestDuration = new Histogram({
            name: 'llm_request_duration_seconds',
            help: 'Duration of LLM requests in seconds',
            labelNames: ['provider', 'model'],
            buckets: [0.5, 1, 2, 5, 10, 30, 60],
            registers: [this.registry],
        });
        this.memoryOperations = new Counter({
            name: 'memory_operations_total',
            help: 'Total number of memory operations',
            labelNames: ['operation', 'type'],
            registers: [this.registry],
        });
        this.workflowExecutions = new Counter({
            name: 'workflow_executions_total',
            help: 'Total number of workflow executions',
            labelNames: ['workflow', 'status'],
            registers: [this.registry],
        });
        this.errorTotal = new Counter({
            name: 'errors_total',
            help: 'Total number of errors',
            labelNames: ['type', 'source'],
            registers: [this.registry],
        });
        this.queueSize = new Gauge({
            name: 'queue_size',
            help: 'Current size of various queues',
            labelNames: ['queue'],
            registers: [this.registry],
        });
    }
    recordHttpRequest(method, path, status, duration) {
        const normalizedPath = this.normalizePath(path);
        this.httpRequestsTotal.labels(method, normalizedPath, String(status)).inc();
        this.httpRequestDuration.labels(method, normalizedPath, String(status)).observe(duration);
    }
    recordLlmRequest(provider, model, status, duration, tokens) {
        this.llmRequestsTotal.labels(provider, model, status).inc();
        this.llmRequestDuration.labels(provider, model).observe(duration);
        if (tokens) {
            this.llmTokensUsed.labels(provider, model, 'prompt').inc(tokens.prompt);
            this.llmTokensUsed.labels(provider, model, 'completion').inc(tokens.completion);
        }
    }
    recordMemoryOperation(operation, type) {
        this.memoryOperations.labels(operation, type).inc();
    }
    recordWorkflowExecution(workflowName, status) {
        this.workflowExecutions.labels(workflowName, status).inc();
    }
    recordError(type, source) {
        this.errorTotal.labels(type, source).inc();
    }
    setActiveConnections(type, count) {
        this.activeConnections.labels(type).set(count);
    }
    setQueueSize(queue, size) {
        this.queueSize.labels(queue).set(size);
    }
    normalizePath(path) {
        return path
            .replace(/\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, '/:id')
            .replace(/\/\d+/g, '/:id')
            .replace(/\?.*$/, '');
    }
    async getMetrics() {
        return this.registry.metrics();
    }
    async getMetricsContentType() {
        return this.registry.contentType;
    }
    getRegistry() {
        return this.registry;
    }
}
export const metricsService = new MetricsService();
export function metricsMiddleware() {
    return async (req, res, next) => {
        const start = Date.now();
        res.on('finish', () => {
            const duration = (Date.now() - start) / 1000;
            metricsService.recordHttpRequest(req.method, req.path, res.statusCode, duration);
        });
        next();
    };
}
//# sourceMappingURL=metrics.js.map