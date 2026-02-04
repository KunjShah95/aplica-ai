import { EventEmitter } from 'events';
import { GatewayRouter } from '../gateway/router.js';
import { VoiceService } from './voice/voice.service.js';
import { VisionService } from './vision/vision.service.js';
import { TextService } from './text/text.service.js';
import { ReasoningEngine } from './reasoning/reasoning.engine.js';
import { SafetyLayer } from './safety/safety.layer.js';
import { ContextManager } from './context/manager.js';
import { ToolRegistry } from '../tools/registry.js';
import { MemorySystem } from '../memory/system.js';
import { MetricsCollector } from '../observability/metrics/collector.js';
import { Tracer } from '../observability/tracing/tracer.js';
import { config } from '../config/index.js';

export interface UnifiedInput {
  type: 'voice' | 'vision' | 'text' | 'multimodal';
  content: Buffer | string | { voice?: Buffer; vision?: Buffer; text?: string };
  metadata: {
    userId: string;
    sessionId: string;
    platform: string;
    timestamp: Date;
    context?: Record<string, any>;
  };
}

export interface ProcessingResult {
  embedding: number[];
  intent: string;
  entities: Entity[];
  sentiment: Sentiment;
  confidence: number;
  requiresAction: boolean;
  suggestedActions: SuggestedAction[];
}

export interface Entity {
  type: 'person' | 'location' | 'date' | 'organization' | 'custom';
  value: string;
  confidence: number;
}

export interface Sentiment {
  polarity: 'positive' | 'negative' | 'neutral';
  score: number;
}

export interface SuggestedAction {
  type: 'tool' | 'information' | 'confirmation';
  tool?: string;
  parameters?: Record<string, any>;
  description: string;
  confidence: number;
}

export class APIGateway extends EventEmitter {
  private voiceService: VoiceService;
  private visionService: VisionService;
  private textService: TextService;
  private reasoningEngine: ReasoningEngine;
  private safetyLayer: SafetyLayer;
  private contextManager: ContextManager;
  private toolRegistry: ToolRegistry;
  private memorySystem: MemorySystem;
  private metrics: MetricsCollector;
  private tracer: Tracer;
  private rateLimiter: Map<string, { count: number; resetTime: number }>;
  private requestQueue: PriorityQueue<UnifiedInput>;

  constructor(private gateway: GatewayRouter) {
    super();
    this.voiceService = new VoiceService();
    this.visionService = new VisionService();
    this.textService = new TextService();
    this.reasoningEngine = new ReasoningEngine();
    this.safetyLayer = new SafetyLayer();
    this.contextManager = new ContextManager();
    this.toolRegistry = new ToolRegistry();
    this.memorySystem = new MemorySystem();
    this.metrics = new MetricsCollector();
    this.tracer = new Tracer('api-gateway');
    this.rateLimiter = new Map();
    this.requestQueue = new PriorityQueue();

    this.initializeMiddlewares();
  }

  private initializeMiddlewares(): void {
    this.gateway.use('*', this.rateLimitMiddleware.bind(this));
    this.gateway.use('*', this.authenticationMiddleware.bind(this));
    this.gateway.use('*', this.loggingMiddleware.bind(this));
    this.gateway.use('*', this.metricsMiddleware.bind(this));
  }

  private async rateLimitMiddleware(ctx: any, next: Function): Promise<void> {
    const clientId = ctx.userId || ctx.ip;
    const now = Date.now();
    const windowMs = 60000;
    const maxRequests = 100;

    let record = this.rateLimiter.get(clientId);
    if (!record || record.resetTime < now) {
      record = { count: 0, resetTime: now + windowMs };
      this.rateLimiter.set(clientId, record);
    }

    if (record.count >= maxRequests) {
      ctx.status = 429;
      ctx.body = { error: 'Rate limit exceeded', retryAfter: record.resetTime - now };
      return;
    }

    record.count++;
    await next();
  }

  private async authenticationMiddleware(ctx: any, next: Function): Promise<void> {
    const token = ctx.headers.authorization?.replace('Bearer ', '');
    if (!token && !ctx.session?.userId) {
      ctx.status = 401;
      ctx.body = { error: 'Authentication required' };
      return;
    }
    await next();
  }

  private async loggingMiddleware(ctx: any, next: Function): Promise<void> {
    const startTime = Date.now();
    await next();
    const duration = Date.now() - startTime;
    console.log(`${ctx.method} ${ctx.path} - ${ctx.status} - ${duration}ms`);
  }

  private async metricsMiddleware(ctx: any, next: Function): Promise<void> {
    await next();
    this.metrics.recordRequest(ctx.path, ctx.status, Date.now() - (ctx.startTime || Date.now()));
  }

  async processInput(input: UnifiedInput): Promise<ProcessingResult> {
    return this.tracer.trace('processInput', async (span) => {
      span.setAttribute('userId', input.metadata.userId);
      span.setAttribute('inputType', input.type);

      const spanContext = this.tracer.createSpanContext('input-processing');
      try {
        const context = await this.contextManager.loadContext(
          input.metadata.sessionId,
          input.metadata.userId
        );

        let embedding: number[];
        let intent: string;
        let entities: Entity[] = [];
        let sentiment: Sentiment = { polarity: 'neutral', score: 0 };

        switch (input.type) {
          case 'voice':
            const voiceResult = await this.voiceService.process(input.content as Buffer, context);
            embedding = voiceResult.embedding;
            intent = voiceResult.intent;
            entities = voiceResult.entities;
            sentiment = voiceResult.sentiment;
            break;

          case 'vision':
            const visionResult = await this.visionService.process(input.content as Buffer, context);
            embedding = visionResult.embedding;
            intent = visionResult.intent;
            entities = visionResult.entities;
            sentiment = visionResult.sentiment;
            break;

          case 'text':
            const textResult = await this.textService.process(input.content as string, context);
            embedding = textResult.embedding;
            intent = textResult.intent;
            entities = textResult.entities;
            sentiment = textResult.sentiment;
            break;

          case 'multimodal':
            const multimodalInput = input.content as {
              voice?: Buffer;
              vision?: Buffer;
              text?: string;
            };
            const results = await Promise.all([
              multimodalInput.voice
                ? this.voiceService.process(multimodalInput.voice, context)
                : null,
              multimodalInput.vision
                ? this.visionService.process(multimodalInput.vision, context)
                : null,
              multimodalInput.text ? this.textService.process(multimodalInput.text, context) : null,
            ]);

            embedding = this.fuseEmbeddings(results.filter((r) => r).map((r) => r!.embedding));
            intent = this.fuseIntent(results.filter((r) => r).map((r) => r!.intent));
            entities = results.flatMap((r) => r?.entities || []);
            sentiment = this.fuseSentiment(results.filter((r) => r).map((r) => r!.sentiment));
            break;
        }

        const safetyResult = await this.safetyLayer.evaluate(intent, { entities, sentiment });

        if (safetyResult.blocked) {
          return {
            embedding,
            intent: 'BLOCKED',
            entities,
            sentiment,
            confidence: 0,
            requiresAction: false,
            suggestedActions: [],
          };
        }

        const memoryResults = await this.memorySystem.recall(intent, embedding, context);

        const suggestedActions = await this.reasoningEngine.suggestActions(
          intent,
          entities,
          memoryResults
        );

        const requiresAction = this.determineIfActionRequired(intent, entities, safetyResult);

        span.setAttribute('confidence', confidence);
        span.setAttribute('requiresAction', requiresAction);

        return {
          embedding,
          intent,
          entities,
          sentiment,
          confidence,
          requiresAction,
          suggestedActions,
        };
      } catch (error) {
        span.recordException(error as Error);
        throw error;
      }
    });
  }

  private fuseEmbeddings(embeddings: number[][]): number[] {
    if (embeddings.length === 0) return [];
    if (embeddings.length === 1) return embeddings[0];

    const maxLength = Math.max(...embeddings.map((e) => e.length));
    const result = new Array(maxLength).fill(0);
    const count = new Array(maxLength).fill(0);

    for (const embedding of embeddings) {
      for (let i = 0; i < embedding.length; i++) {
        result[i] += embedding[i];
        count[i]++;
      }
    }

    return result.map((sum, i) => sum / count[i]);
  }

  private fuseIntent(intents: string[]): string {
    const intentCounts = intents.reduce(
      (acc, intent) => {
        acc[intent] = (acc[intent] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>
    );

    return Object.entries(intentCounts).sort((a, b) => b[1] - a[1])[0][0];
  }

  private fuseSentiment(sentiments: Sentiment[]): Sentiment {
    if (sentiments.length === 0) return { polarity: 'neutral', score: 0 };

    const avgScore = sentiments.reduce((sum, s) => sum + s.score, 0) / sentiments.length;
    const polarity = avgScore > 0.2 ? 'positive' : avgScore < -0.2 ? 'negative' : 'neutral';

    return { polarity, score: avgScore };
  }

  private determineIfActionRequired(
    intent: string,
    entities: Entity[],
    safetyResult: any
  ): boolean {
    const actionIntents = [
      'create',
      'update',
      'delete',
      'execute',
      'send',
      'schedule',
      'navigate',
      'search',
    ];

    return actionIntents.some((ai) => intent.toLowerCase().includes(ai)) || entities.length > 0;
  }
}

class PriorityQueue<T> {
  private queues: Map<number, T[]> = new Map();

  enqueue(item: T, priority: number = 0): void {
    if (!this.queues.has(priority)) {
      this.queues.set(priority, []);
    }
    this.queues.get(priority)!.push(item);
  }

  dequeue(): T | undefined {
    const priorities = Array.from(this.queues.keys()).sort((a, b) => b - a);
    for (const priority of priorities) {
      const queue = this.queues.get(priority)!;
      if (queue.length > 0) {
        return queue.shift();
      }
    }
    return undefined;
  }
}

export { APIGateway };
