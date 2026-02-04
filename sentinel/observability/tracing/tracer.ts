import { EventEmitter } from 'events';
import { Tracer } from './tracer.js';

export interface Span {
  id: string;
  traceId: string;
  parentId?: string;
  name: string;
  kind: SpanKind;
  status: SpanStatus;
  startTime: number;
  endTime?: number;
  duration?: number;
  attributes: Map<string, any>;
  events: SpanEvent[];
  logs: SpanLog[];
  children: Span[];
}

export enum SpanKind {
  SERVER = 'server',
  CLIENT = 'client',
  PRODUCER = 'producer',
  CONSUMER = 'consumer',
  INTERNAL = 'internal',
}

export enum SpanStatus {
  UNSET = 'unset',
  OK = 'ok',
  ERROR = 'error',
}

export interface SpanEvent {
  name: string;
  timestamp: number;
  attributes?: Record<string, any>;
}

export interface SpanLog {
  timestamp: number;
  fields: Record<string, any>;
}

export interface TraceContext {
  traceId: string;
  spanId: string;
  sampled: boolean;
}

export interface TraceConfig {
  enabled: boolean;
  serviceName: string;
  exporter: 'console' | 'jaeger' | 'zipkin' | 'otlp';
  endpoint?: string;
  sampleRate: number;
  maxSpans: number;
}

export class TracingSystem extends EventEmitter {
  private config: TraceConfig;
  private tracer: Tracer;
  private spanProcessor: SpanProcessor;
  private propagator: ContextPropagator;
  private localRootSpans: Map<string, Span>;
  private activeSpanStack: Span[];

  constructor(config: Partial<TraceConfig> = {}) {
    super();
    this.config = {
      enabled: config.enabled ?? true,
      serviceName: config.serviceName || 'sentinel',
      exporter: config.exporter || 'console',
      endpoint: config.endpoint,
      sampleRate: config.sampleRate || 1.0,
      maxSpans: config.maxSpans || 10000,
    };

    this.tracer = new Tracer(this.config.serviceName);
    this.spanProcessor = new SpanProcessor(this.config);
    this.propagator = new ContextPropagator();
    this.localRootSpans = new Map();
    this.activeSpanStack = [];
  }

  getTracer(name?: string): Tracer {
    return this.tracer;
  }

  startSpan(name: string, options: Partial<SpanOptions> = {}): Span | null {
    if (!this.config.enabled) {
      return null;
    }

    const parent = this.activeSpanStack[this.activeSpanStack.length - 1];
    const sampled = Math.random() < this.config.sampleRate;

    if (!sampled) {
      return {
        id: this.generateSpanId(),
        traceId: parent?.traceId || this.generateTraceId(),
        parentId: parent?.id,
        name,
        kind: options.kind || SpanKind.INTERNAL,
        status: SpanStatus.UNSET,
        startTime: Date.now(),
        attributes: new Map(Object.entries(options.attributes || {})),
        events: [],
        logs: [],
        children: [],
      };
    }

    const span: Span = {
      id: this.generateSpanId(),
      traceId: parent?.traceId || this.generateTraceId(),
      parentId: parent?.id,
      name,
      kind: options.kind || SpanKind.INTERNAL,
      status: SpanStatus.UNSET,
      startTime: Date.now(),
      attributes: new Map(Object.entries(options.attributes || {})),
      events: [],
      logs: [],
      children: [],
    };

    this.activeSpanStack.push(span);

    if (!parent) {
      this.localRootSpans.set(span.traceId, span);
    } else {
      parent.children.push(span);
    }

    this.emit('spanStarted', span);
    return span;
  }

  endSpan(span: Span, status: SpanStatus = SpanStatus.OK): void {
    if (!span || !this.config.enabled) return;

    span.endTime = Date.now();
    span.duration = span.endTime - span.startTime;
    span.status = status;

    const popped = this.activeSpanStack.pop();
    if (popped?.id !== span.id) {
      console.warn('Span stack mismatch');
    }

    this.spanProcessor.processSpan(span);
    this.emit('spanEnded', span);
  }

  addEvent(span: Span, name: string, attributes?: Record<string, any>): void {
    if (!span || !this.config.enabled) return;

    span.events.push({
      name,
      timestamp: Date.now(),
      attributes,
    });
  }

  setAttribute(span: Span, key: string, value: any): void {
    if (!span) return;
    span.attributes.set(key, value);
  }

  setStatus(span: Span, status: SpanStatus, message?: string): void {
    if (!span) return;
    span.status = status;
    if (message) {
      span.attributes.set('status.message', message);
    }
  }

  recordException(span: Span, exception: Error): void {
    if (!span || !this.config.enabled) return;

    span.logs.push({
      timestamp: Date.now(),
      fields: {
        'exception.type': exception.constructor.name,
        'exception.message': exception.message,
        'exception.stacktrace': exception.stack,
      },
    });

    span.status = SpanStatus.ERROR;
  }

  createContext(span: Span): TraceContext {
    return {
      traceId: span.traceId,
      spanId: span.id,
      sampled: true,
    };
  }

  extractContext(carrier: Record<string, string>): TraceContext | null {
    return this.propagator.extract(carrier);
  }

  injectContext(span: Span, carrier: Record<string, string>): void {
    this.propagator.inject(this.createContext(span), carrier);
  }

  async flush(): Promise<void> {
    await this.spanProcessor.flush();
  }

  private generateSpanId(): string {
    return 'xxxxxxxxxxxx4xxxyxxxxxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      const v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }

  private generateTraceId(): string {
    return 'xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      const v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }

  getActiveSpans(): Span[] {
    return [...this.activeSpanStack];
  }

  getRootSpan(traceId: string): Span | undefined {
    return this.localRootSpans.get(traceId);
  }

  async shutdown(): Promise<void> {
    await this.spanProcessor.shutdown();
  }
}

interface SpanOptions {
  kind?: SpanKind;
  attributes?: Record<string, any>;
  parent?: Span;
}

class SpanProcessor {
  private config: TraceConfig;
  private spanBuffer: Span[];
  private flushInterval: NodeJS.Timeout;

  constructor(config: TraceConfig) {
    this.config = config;
    this.spanBuffer = [];

    this.flushInterval = setInterval(() => {
      this.flush();
    }, 5000);
  }

  processSpan(span: Span): void {
    this.spanBuffer.push(span);

    if (this.spanBuffer.length >= this.config.maxSpans) {
      this.flush();
    }
  }

  async flush(): Promise<void> {
    if (this.spanBuffer.length === 0) return;

    const spans = [...this.spanBuffer];
    this.spanBuffer = [];

    switch (this.config.exporter) {
      case 'console':
        this.exportToConsole(spans);
        break;
      case 'jaeger':
        await this.exportToJaeger(spans);
        break;
      case 'zipkin':
        await this.exportToZipkin(spans);
        break;
      case 'otlp':
        await this.exportToOTLP(spans);
        break;
    }
  }

  private exportToConsole(spans: Span[]): void {
    for (const span of spans) {
      console.log(
        JSON.stringify({
          traceId: span.traceId,
          spanId: span.id,
          parentId: span.parentId,
          name: span.name,
          kind: span.kind,
          status: span.status,
          duration: span.duration,
          attributes: Object.fromEntries(span.attributes),
          events: span.events,
          logs: span.logs,
          children: span.children.length,
        })
      );
    }
  }

  private async exportToJaeger(spans: Span[]): Promise<void> {
    if (!this.config.endpoint) return;

    const axios = require('axios');

    const jaegerSpans = spans.map((span) => ({
      traceId: span.traceId,
      spanId: span.id,
      parentSpanId: span.parentId,
      operationName: span.name,
      flags: 1,
      startTime: span.startTime,
      duration: span.duration || 0,
      tags: [
        { key: 'span.kind', vType: 'STRING', vStr: span.kind },
        { key: 'status.code', vType: 'INT64', vInt64: span.status === SpanStatus.ERROR ? 2 : 0 },
        ...Array.from(span.attributes.entries()).map(([key, value]) => ({
          key,
          vType: typeof value === 'string' ? 'STRING' : 'INT64',
          vStr: typeof value === 'string' ? value : undefined,
          vInt64: typeof value === 'number' ? value : undefined,
        })),
      ],
      logs: span.logs.map((log) => ({
        timestamp: log.timestamp,
        fields: Object.entries(log.fields).map(([key, value]) => ({
          key,
          vType: typeof value === 'string' ? 'STRING' : 'INT64',
          vStr: typeof value === 'string' ? value : undefined,
          vInt64: typeof value === 'number' ? value : undefined,
        })),
      })),
    }));

    try {
      await axios.post(`${this.config.endpoint}/api/traces`, {
        spans: jaegerSpans,
      });
    } catch (error) {
      console.error('Failed to export spans to Jaeger:', error);
    }
  }

  private async exportToZipkin(spans: Span[]): Promise<void> {
    if (!this.config.endpoint) return;

    const axios = require('axios');

    const zipkinSpans = spans.map((span) => ({
      traceId: span.traceId,
      id: span.id,
      parentId: span.parentId,
      name: span.name,
      kind: span.kind.toUpperCase(),
      timestamp: span.startTime * 1000,
      duration: (span.duration || 0) * 1000,
      localEndpoint: {
        serviceName: this.config.serviceName,
      },
      tags: Object.fromEntries(span.attributes),
      annotations: span.events.map((event) => ({
        timestamp: event.timestamp * 1000,
        value: event.name,
      })),
    }));

    try {
      await axios.post(`${this.config.endpoint}/api/v2/spans`, zipkinSpans);
    } catch (error) {
      console.error('Failed to export spans to Zipkin:', error);
    }
  }

  private async exportToOTLP(spans: Span[]): Promise<void> {
    if (!this.config.endpoint) return;

    const axios = require('axios');

    const otlpSpans = spans.map((span) => ({
      traceId: span.traceId,
      spanId: span.id,
      parentSpanId: span.parentId,
      name: span.name,
      kind: span.kind,
      startTimeUnixNano: span.startTime * 1000000,
      endTimeUnixNano: (span.endTime || Date.now()) * 1000000,
      status: {
        code: span.status === SpanStatus.ERROR ? 2 : 0,
      },
      attributes: Array.from(span.attributes.entries()).map(([key, value]) => ({
        key,
        value: {
          stringValue: typeof value === 'string' ? value : undefined,
          intValue: typeof value === 'number' ? value : undefined,
          doubleValue: typeof value === 'number' ? value : undefined,
          boolValue: typeof value === 'boolean' ? value : undefined,
        },
      })),
      events: span.events.map((event) => ({
        name: event.name,
        timeUnixNano: event.timestamp * 1000000,
        attributes: event.attributes
          ? Object.entries(event.attributes).map(([key, value]) => ({
              key,
              value: { stringValue: String(value) },
            }))
          : [],
      })),
      links: [],
    }));

    try {
      await axios.post(`${this.config.endpoint}/v1/traces`, {
        resourceSpans: [
          {
            resource: {
              attributes: [
                { key: 'service.name', value: { stringValue: this.config.serviceName } },
              ],
            },
            instrumentationLibrarySpans: [
              {
                spans: otlpSpans,
              },
            ],
          },
        ],
      });
    } catch (error) {
      console.error('Failed to export spans to OTLP:', error);
    }
  }

  async shutdown(): Promise<void> {
    clearInterval(this.flushInterval);
    await this.flush();
  }
}

class ContextPropagator {
  private formats: Map<string, Propagator>;

  constructor() {
    this.formats = new Map();
    this.formats.set('traceparent', new W3CTraceContextPropagator());
    this.formats.set('b3', new B3Propagator());
  }

  registerFormat(name: string, propagator: Propagator): void {
    this.formats.set(name, propagator);
  }

  extract(carrier: Record<string, string>): TraceContext | null {
    for (const [, propagator] of this.formats) {
      const context = propagator.extract(carrier);
      if (context) return context;
    }

    return {
      traceId: this.generateTraceId(),
      spanId: this.generateSpanId(),
      sampled: true,
    };
  }

  inject(context: TraceContext, carrier: Record<string, string>): void {
    for (const [, propagator] of this.formats) {
      propagator.inject(context, carrier);
    }
  }

  private generateTraceId(): string {
    return 'xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      const v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }

  private generateSpanId(): string {
    return 'xxxxxxxxxxxx4xxxyxxxxxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      const v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }
}

interface Propagator {
  extract(carrier: Record<string, string>): TraceContext | null;
  inject(context: TraceContext, carrier: Record<string, string>): void;
}

class W3CTraceContextPropagator implements Propagator {
  extract(carrier: Record<string, string>): TraceContext | null {
    const traceparent = carrier['traceparent'];
    if (!traceparent) return null;

    const parts = traceparent.split('-');
    if (parts.length !== 4 || parts[0] !== '00') return null;

    return {
      traceId: parts[1],
      spanId: parts[2],
      sampled: parts[3] === '01',
    };
  }

  inject(context: TraceContext, carrier: Record<string, string>): void {
    carrier['traceparent'] =
      `00-${context.traceId}-${context.spanId}-${context.sampled ? '01' : '00'}`;
  }
}

class B3Propagator implements Propagator {
  extract(carrier: Record<string, string>): TraceContext | null {
    const traceId = carrier['X-B3-TraceId'];
    const spanId = carrier['X-B3-SpanId'];
    const sampled = carrier['X-B3-Sampled'];

    if (!traceId || !spanId) return null;

    return {
      traceId,
      spanId,
      sampled: sampled === '1' || sampled === 'true',
    };
  }

  inject(context: TraceContext, carrier: Record<string, string>): void {
    carrier['X-B3-TraceId'] = context.traceId;
    carrier['X-B3-SpanId'] = context.spanId;
    carrier['X-B3-Sampled'] = context.sampled ? '1' : '0';
  }
}

export { TracingSystem, Span, SpanKind, SpanStatus, TraceContext };
