import client, {
  Registry,
  Counter,
  Histogram,
  Gauge,
  Summary,
  RegistryContentType,
} from 'prom-client';

export interface MetricsConfig {
  enabled?: boolean;
  prefix?: string;
  defaultLabels?: Record<string, string>;
  ignorePaths?: string[];
  includeStatusCode?: boolean;
}

export class MetricsService {
  private registry: Registry;
  private prefix: string;
  private counters: Map<string, Counter> = new Map();
  private histograms: Map<string, Histogram> = new Map();
  private gauges: Map<string, Gauge> = new Map();
  private summaries: Map<string, Summary> = new Map();

  constructor(config: MetricsConfig = {}) {
    this.registry = new Registry();
    this.prefix = config.prefix || 'alpicia';
    this.registry.setDefaultLabels(config.defaultLabels || {});

    client.collectDefaultMetrics({
      prefix: `${this.prefix}_`,
      register: this.registry,
    });

    this.initializeDefaultMetrics();
  }

  private initializeDefaultMetrics(): void {
    this.createCounter('http_requests_total', 'Total HTTP requests', ['method', 'path', 'status']);
    this.createHistogram('http_request_duration_seconds', 'HTTP request duration in seconds', [
      'method',
      'path',
    ]);
    this.createCounter('messages_total', 'Total messages processed', ['platform', 'type']);
    this.createHistogram('message_processing_duration_seconds', 'Message processing duration', [
      'platform',
    ]);
    this.createGauge('active_conversations', 'Number of active conversations');
    this.createCounter('conversations_total', 'Total conversations', ['platform']);
    this.createCounter('tool_executions_total', 'Total tool executions', ['tool', 'status']);
    this.createHistogram('tool_execution_duration_seconds', 'Tool execution duration', ['tool']);
    this.createCounter('memory_operations_total', 'Total memory operations', ['type', 'status']);
    this.createGauge('database_connections', 'Number of database connections', ['database']);
    this.createCounter('api_keys_used_total', 'Total API key usages', ['key_prefix']);
    this.createGauge('cache_size', 'Cache size in entries', ['cache']);
    this.createCounter('cache_hits_total', 'Total cache hits', ['cache']);
    this.createCounter('cache_misses_total', 'Total cache misses', ['cache']);
    this.createCounter('workflows_executed_total', 'Total workflows executed', [
      'workflow',
      'status',
    ]);
    this.createCounter('workflow_steps_total', 'Total workflow steps', ['workflow', 'status']);
    this.createHistogram('workflow_execution_duration_seconds', 'Workflow execution duration', [
      'workflow',
    ]);
  }

  createCounter(name: string, help: string, labelNames: string[] = []): Counter {
    const fullName = `${this.prefix}_${name}`;
    const counter = new Counter({
      name: fullName,
      help,
      labelNames,
      registers: [this.registry],
    });
    this.counters.set(name, counter);
    return counter;
  }

  createHistogram(
    name: string,
    help: string,
    labelNames: string[] = [],
    buckets?: number[]
  ): Histogram {
    const fullName = `${this.prefix}_${name}`;
    const histogram = new Histogram({
      name: fullName,
      help,
      labelNames,
      buckets: buckets || [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],
      registers: [this.registry],
    });
    this.histograms.set(name, histogram);
    return histogram;
  }

  createGauge(name: string, help: string, labelNames: string[] = []): Gauge {
    const fullName = `${this.prefix}_${name}`;
    const gauge = new Gauge({
      name: fullName,
      help,
      labelNames,
      registers: [this.registry],
    });
    this.gauges.set(name, gauge);
    return gauge;
  }

  createSummary(
    name: string,
    help: string,
    labelNames: string[] = [],
    percentiles?: number[]
  ): Summary {
    const fullName = `${this.prefix}_${name}`;
    const summary = new Summary({
      name: fullName,
      help,
      labelNames,
      percentiles: percentiles || [0.01, 0.05, 0.5, 0.95, 0.99],
      registers: [this.registry],
    });
    this.summaries.set(name, summary);
    return summary;
  }

  getCounter(name: string): Counter | undefined {
    return this.counters.get(name);
  }

  getHistogram(name: string): Histogram | undefined {
    return this.histograms.get(name);
  }

  getGauge(name: string): Gauge | undefined {
    return this.gauges.get(name);
  }

  getSummary(name: string): Summary | undefined {
    return this.summaries.get(name);
  }

  incrementHttpRequests(method: string, path: string, status: number): void {
    const counter = this.counters.get('http_requests_total');
    if (counter) {
      counter.inc({ method, path, status: Math.floor(status / 100) * 100 });
    }
  }

  observeHttpRequestDuration(method: string, path: string, duration: number): void {
    const histogram = this.histograms.get('http_request_duration_seconds');
    if (histogram) {
      histogram.observe({ method, path }, duration);
    }
  }

  incrementMessages(platform: string, type: string): void {
    const counter = this.counters.get('messages_total');
    if (counter) {
      counter.inc({ platform, type });
    }
  }

  setActiveConversations(count: number): void {
    const gauge = this.gauges.get('active_conversations');
    if (gauge) {
      gauge.set(count);
    }
  }

  incrementToolExecution(tool: string, status: 'success' | 'error'): void {
    const counter = this.counters.get('tool_executions_total');
    if (counter) {
      counter.inc({ tool, status });
    }
  }

  observeToolDuration(tool: string, duration: number): void {
    const histogram = this.histograms.get('tool_execution_duration_seconds');
    if (histogram) {
      histogram.observe({ tool }, duration);
    }
  }

  incrementMemoryOperation(type: string, status: 'success' | 'error'): void {
    const counter = this.counters.get('memory_operations_total');
    if (counter) {
      counter.inc({ type, status });
    }
  }

  setDatabaseConnections(database: string, count: number): void {
    const gauge = this.gauges.get('database_connections');
    if (gauge) {
      gauge.set({ database }, count);
    }
  }

  incrementCacheHit(cache: string): void {
    const counter = this.counters.get('cache_hits_total');
    if (counter) {
      counter.inc({ cache });
    }
  }

  incrementCacheMiss(cache: string): void {
    const counter = this.counters.get('cache_misses_total');
    if (counter) {
      counter.inc({ cache });
    }
  }

  incrementWorkflowExecution(workflow: string, status: 'success' | 'error'): void {
    const counter = this.counters.get('workflows_executed_total');
    if (counter) {
      counter.inc({ workflow, status });
    }
  }

  async getMetrics(): Promise<string> {
    return this.registry.metrics();
  }

  async getMetricsJSON(): Promise<Record<string, any>> {
    const metrics: Record<string, any> = {};
    const content = await this.registry.metrics();
    const parsed = JSON.parse(content);

    for (const metric of parsed) {
      metrics[metric.name] = {
        help: metric.help,
        type: metric.type,
        value: metric.values?.map((v: any) => ({
          labels: v.metric,
          value: v.value,
        })),
      };
    }

    return metrics;
  }

  async getSingleMetric(name: string): Promise<Record<string, any> | null> {
    const content = await this.registry.metrics();
    const parsed = JSON.parse(content);
    return parsed.find((m: any) => m.name === `${this.prefix}_${name}`) || null;
  }

  resetAll(): void {
    for (const counter of this.counters.values()) {
      counter.reset();
    }
    for (const histogram of this.histograms.values()) {
      histogram.reset();
    }
    for (const gauge of this.gauges.values()) {
      gauge.reset();
    }
    for (const summary of this.summaries.values()) {
      summary.reset();
    }
  }

  removeSingleMetric(name: string): void {
    this.registry.removeSingleMetric(`${this.prefix}_${name}`);
  }





  getContentType(): string {
    return this.registry.contentType;
  }

  getRegistry(): Registry {
    return this.registry;
  }
}

export const metrics = new MetricsService();

export function createMetricsService(config?: MetricsConfig): MetricsService {
  return new MetricsService(config);
}
