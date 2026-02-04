import { Counter, Histogram, Gauge, Registry, collectDefaultMetrics } from 'prom-client';

export interface MetricsConfig {
  enabled: boolean;
  prefix: string;
  defaultLabels?: Record<string, string>;
  exportInterval: number;
  port: number;
}

export interface MetricTypes {
  counters: Map<string, Counter>;
  histograms: Map<string, Histogram>;
  gauges: Map<string, Gauge>;
}

export class MetricsCollector {
  private registry: Registry;
  private counters: Map<string, Counter>;
  private histograms: Map<string, Histogram>;
  private gauges: Map<string, Gauge>;
  private config: MetricsConfig;
  private httpServer: any;
  private defaultMetricsInterval: NodeJS.Timeout;

  constructor(config: Partial<MetricsConfig> = {}) {
    this.config = {
      enabled: config.enabled ?? true,
      prefix: config.prefix || 'sentinel',
      defaultLabels: config.defaultLabels || {},
      exportInterval: config.exportInterval || 10000,
      port: config.port || 9090,
    };

    this.registry = new Registry();
    this.counters = new Map();
    this.histograms = new Map();
    this.gauges = new Map();

    if (this.config.enabled) {
      this.initializeDefaultMetrics();
      this.initializeCustomMetrics();
    }
  }

  private initializeDefaultMetrics(): void {
    collectDefaultMetrics({
      register: this.registry,
      prefix: this.config.prefix,
      labels: this.config.defaultLabels,
    });

    this.defaultMetricsInterval = setInterval(() => {
      collectDefaultMetrics({
        register: this.registry,
        prefix: this.config.prefix,
        labels: this.config.defaultLabels,
      });
    }, this.config.exportInterval);
  }

  private initializeCustomMetrics(): void {
    this.gauges.set(
      'active_sessions',
      new Gauge({
        name: `${this.config.prefix}_active_sessions`,
        help: 'Number of active user sessions',
        registers: [this.registry],
      })
    );

    this.gauges.set(
      'agents_active',
      new Gauge({
        name: `${this.config.prefix}_agents_active`,
        help: 'Number of active agents',
        registers: [this.registry],
      })
    );

    this.gauges.set(
      'queue_size',
      new Gauge({
        name: `${this.config.prefix}_queue_size`,
        help: 'Size of task queue',
        registers: [this.registry],
      })
    );

    this.gauges.set(
      'memory_usage',
      new Gauge({
        name: `${this.config.prefix}_memory_usage_bytes`,
        help: 'Memory usage in bytes',
        registers: [this.registry],
      })
    );

    this.counters.set(
      'total_requests',
      new Counter({
        name: `${this.config.prefix}_total_requests_total`,
        help: 'Total number of requests',
        labelNames: ['endpoint', 'method', 'status'],
        registers: [this.registry],
      })
    );

    this.histograms.set(
      'request_duration',
      new Histogram({
        name: `${this.config.prefix}_request_duration_seconds`,
        help: 'Request duration in seconds',
        labelNames: ['endpoint', 'method'],
        buckets: [0.001, 0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],
        registers: [this.registry],
      })
    );

    this.counters.set(
      'tool_executions',
      new Counter({
        name: `${this.config.prefix}_tool_executions_total`,
        help: 'Total number of tool executions',
        labelNames: ['tool_name', 'status'],
        registers: [this.registry],
      })
    );

    this.histograms.set(
      'tool_execution_duration',
      new Histogram({
        name: `${this.config.prefix}_tool_execution_duration_seconds`,
        help: 'Tool execution duration in seconds',
        labelNames: ['tool_name'],
        buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1, 5, 30, 60],
        registers: [this.registry],
      })
    );

    this.counters.set(
      'memory_operations',
      new Counter({
        name: `${this.config.prefix}_memory_operations_total`,
        help: 'Total number of memory operations',
        labelNames: ['operation_type', 'status'],
        registers: [this.registry],
      })
    );

    this.histograms.set(
      'memory_retrieval_duration',
      new Histogram({
        name: `${this.config.prefix}_memory_retrieval_duration_seconds`,
        help: 'Memory retrieval duration in seconds',
        labelNames: ['memory_type'],
        buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1, 5],
        registers: [this.registry],
      })
    );

    this.counters.set(
      'safety_violations',
      new Counter({
        name: `${this.config.prefix}_safety_violations_total`,
        help: 'Total number of safety violations',
        labelNames: ['violation_type', 'severity'],
        registers: [this.registry],
      })
    );

    this.gauges.set(
      'context_tokens',
      new Gauge({
        name: `${this.config.prefix}_context_tokens`,
        help: 'Number of tokens in current context',
        labelNames: ['session_id'],
        registers: [this.registry],
      })
    );

    this.histograms.set(
      'agent_iterations',
      new Histogram({
        name: `${this.config.prefix}_agent_iterations`,
        help: 'Number of iterations per agent execution',
        buckets: [1, 2, 3, 5, 10, 20, 50, 100],
        registers: [this.registry],
      })
    );

    this.counters.set(
      'agent_tasks',
      new Counter({
        name: `${this.config.prefix}_agent_tasks_total`,
        help: 'Total number of agent tasks',
        labelNames: ['task_type', 'status'],
        registers: [this.registry],
      })
    );

    this.gauges.set(
      'model_tokens',
      new Gauge({
        name: `${this.config.prefix}_model_tokens_total`,
        help: 'Total tokens processed by model',
        labelNames: ['model_name', 'direction'],
        registers: [this.registry],
      })
    );

    this.histograms.set(
      'model_latency',
      new Histogram({
        name: `${this.config.prefix}_model_latency_seconds`,
        help: 'Model inference latency',
        labelNames: ['model_name'],
        buckets: [0.01, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10, 30, 60],
        registers: [this.registry],
      })
    );

    this.gauges.set(
      'gpu_utilization',
      new Gauge({
        name: `${this.config.prefix}_gpu_utilization_percent`,
        help: 'GPU utilization percentage',
        labelNames: ['gpu_id'],
        registers: [this.registry],
      })
    );

    this.gauges.set(
      'gpu_memory',
      new Gauge({
        name: `${this.config.prefix}_gpu_memory_bytes`,
        help: 'GPU memory usage in bytes',
        labelNames: ['gpu_id'],
        registers: [this.registry],
      })
    );
  }

  recordRequest(endpoint: string, method: string, status: number, duration: number): void {
    if (!this.config.enabled) return;

    const statusClass = `${Math.floor(status / 100)}xx`;

    this.counters.get('total_requests')?.inc({
      endpoint,
      method,
      status: statusClass,
    });

    this.histograms.get('request_duration')?.observe({ endpoint, method }, duration / 1000);
  }

  recordToolExecution(
    toolName: string,
    status: 'success' | 'error' | 'timeout',
    duration: number
  ): void {
    if (!this.config.enabled) return;

    this.counters.get('tool_executions')?.inc({
      tool_name: toolName,
      status,
    });

    this.histograms
      .get('tool_execution_duration')
      ?.observe({ tool_name: toolName }, duration / 1000);
  }

  recordMemoryOperation(
    operationType: 'store' | 'retrieve' | 'search' | 'delete',
    status: 'success' | 'error',
    duration: number,
    memoryType?: string
  ): void {
    if (!this.config.enabled) return;

    this.counters.get('memory_operations')?.inc({
      operation_type: operationType,
      status,
    });

    if (memoryType) {
      this.histograms
        .get('memory_retrieval_duration')
        ?.observe({ memory_type: memoryType }, duration / 1000);
    }
  }

  recordSafetyViolation(
    violationType: string,
    severity: 'low' | 'medium' | 'high' | 'critical'
  ): void {
    if (!this.config.enabled) return;

    this.counters.get('safety_violations')?.inc({
      violation_type: violationType,
      severity,
    });
  }

  recordAgentTask(
    taskType: string,
    status: 'completed' | 'failed' | 'timeout',
    iterations: number,
    duration: number
  ): void {
    if (!this.config.enabled) return;

    this.counters.get('agent_tasks')?.inc({
      task_type: taskType,
      status,
    });

    this.histograms.get('agent_iterations')?.observe(iterations);
  }

  recordModelUsage(
    modelName: string,
    inputTokens: number,
    outputTokens: number,
    latency: number
  ): void {
    if (!this.config.enabled) return;

    this.gauges
      .get('model_tokens')
      ?.inc({ model_name: modelName, direction: 'input' }, inputTokens);

    this.gauges
      .get('model_tokens')
      ?.inc({ model_name: modelName, direction: 'output' }, outputTokens);

    this.histograms.get('model_latency')?.observe({ model_name: modelName }, latency / 1000);
  }

  setActiveSessions(count: number): void {
    if (!this.config.enabled) return;
    this.gauges.get('active_sessions')?.set(count);
  }

  setActiveAgents(count: number): void {
    if (!this.config.enabled) return;
    this.gauges.get('agents_active')?.set(count);
  }

  setQueueSize(size: number): void {
    if (!this.config.enabled) return;
    this.gauges.get('queue_size')?.set(size);
  }

  setContextTokens(sessionId: string, tokens: number): void {
    if (!this.config.enabled) return;
    this.gauges.get('context_tokens')?.set({ session_id: sessionId }, tokens);
  }

  setGPUUtilization(gpuId: string, utilization: number): void {
    if (!this.config.enabled) return;
    this.gauges.get('gpu_utilization')?.set({ gpu_id: gpuId }, utilization);
  }

  setGPUMemory(gpuId: string, memoryBytes: number): void {
    if (!this.config.enabled) return;
    this.gauges.get('gpu_memory')?.set({ gpu_id: gpuId }, memoryBytes);
  }

  setMemoryUsage(bytes: number): void {
    if (!this.config.enabled) return;
    this.gauges.get('memory_usage')?.set(bytes);
  }

  async getMetrics(): Promise<string> {
    if (!this.config.enabled) {
      return '# Metrics collection is disabled';
    }
    return this.registry.metrics();
  }

  async getMetricsJSON(): Promise<Record<string, any>> {
    if (!this.config.enabled) {
      return {};
    }

    const metrics: Record<string, any> = {};

    for (const [name, counter] of this.counters) {
      const value = await counter.get();
      metrics[name] = {
        type: 'counter',
        value: value.values.reduce((sum, v) => sum + v.value, 0),
      };
    }

    for (const [name, histogram] of this.histograms) {
      const value = await histogram.get();
      metrics[name] = {
        type: 'histogram',
        count: value.count,
        sum: value.sum,
        buckets: value.values.map((v) => ({
          le: v.metricName.split('_bucket_')[1],
          count: v.value,
        })),
      };
    }

    for (const [name, gauge] of this.gauges) {
      const value = await gauge.get();
      metrics[name] = {
        type: 'gauge',
        value: value.values.reduce((sum, v) => sum + v.value, 0),
      };
    }

    return metrics;
  }

  async startHTTPServer(): Promise<void> {
    if (!this.config.enabled) return;

    const express = require('express');
    const app = express();

    app.get('/metrics', async (req: any, res: any) => {
      try {
        const metrics = await this.getMetrics();
        res.set('Content-Type', 'text/plain');
        res.send(metrics);
      } catch (error) {
        res.status(500).send('Error collecting metrics');
      }
    });

    app.get('/metrics/json', async (req: any, res: any) => {
      try {
        const metrics = await this.getMetricsJSON();
        res.json(metrics);
      } catch (error) {
        res.status(500).send('Error collecting metrics');
      }
    });

    app.get('/health', (req: any, res: any) => {
      res.json({ status: 'healthy', timestamp: new Date().toISOString() });
    });

    return new Promise((resolve) => {
      this.httpServer = app.listen(this.config.port, () => {
        console.log(`Metrics server listening on port ${this.config.port}`);
        resolve();
      });
    });
  }

  async stop(): Promise<void> {
    if (this.defaultMetricsInterval) {
      clearInterval(this.defaultMetricsInterval);
    }

    if (this.httpServer) {
      await new Promise((resolve) => {
        this.httpServer.close(resolve);
      });
    }
  }
}

export { MetricsCollector };
