import { Tracer } from './tracer.js';

export class Tracer {
  private name: string;
  private tracingSystem: any;

  constructor(name: string) {
    this.name = name;
  }

  trace<T>(name: string, fn: (span: any) => Promise<T>): Promise<T> {
    const span = this.tracingSystem?.startSpan?.(name);
    return fn(span);
  }

  createSpanContext(name: string): any {
    return { id: `span_${Date.now()}`, name };
  }
}

export { Tracer };
