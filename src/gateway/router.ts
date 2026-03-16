import { Agent } from '../core/agent.js';
import { randomUUID } from 'crypto';
import { promptGuard } from '../security/prompt-guard.js';
import { RateLimiter } from '../security/rate-limit.js';
import { smartModelRouter } from '../agents/model-router.js';
import { budgetGovernor } from '../analytics/budget-governor.js';
import { usageTracker } from '../analytics/usage.js';
import { llmOpsTelemetry } from '../analytics/llm-ops.js';
import { metricsService } from '../monitoring/metrics.js';
import { costTracker } from '../monitoring/cost-tracker.js';

export interface RouterMessage {
  id: string;
  content: string;
  userId: string;
  conversationId?: string;
  source:
    | 'telegram'
    | 'discord'
    | 'websocket'
    | 'cli'
    | 'signal'
    | 'googlechat'
    | 'msteams'
    | 'matrix'
    | 'webchat'
    | 'slack'
    | 'whatsapp';
  metadata?: Record<string, unknown>;
  timestamp: Date;
}

export interface RouterResponse {
  id: string;
  content: string;
  conversationId: string;
  tokensUsed: number;
  timestamp: Date;
}

export type MessageHandler = (message: RouterMessage) => Promise<RouterResponse>;

export class MessageRouter {
  private agent: Agent | null = null;
  private handlers: Map<string, MessageHandler> = new Map();
  private rateLimiter: RateLimiter;
  private stats: RouterStats = {
    totalMessages: 0,
    successfulMessages: 0,
    failedMessages: 0,
    averageResponseTime: 0,
  };

  constructor(agent?: Agent) {
    const windowMs = parseInt(process.env.GATEWAY_RATE_LIMIT_WINDOW || '60000');
    const maxRequests = parseInt(process.env.GATEWAY_RATE_LIMIT_MAX || '60');
    this.rateLimiter = new RateLimiter({ windowMs, maxRequests, keyGenerator: (id) => `gw:${id}` });
    if (agent) {
      this.agent = agent;
    }
  }

  setAgent(agent: Agent): void {
    this.agent = agent;
  }

  async route(message: RouterMessage): Promise<RouterResponse> {
    const startTime = Date.now();
    this.stats.totalMessages++;

    if (!this.agent) {
      throw new Error('Agent not initialized in MessageRouter');
    }

    try {
      const safeContent = promptGuard.sanitize(message.content || '');
      const guardResult = promptGuard.validate(safeContent);
      if (!guardResult.valid) {
        throw new Error(guardResult.reason || 'Message blocked by safety policy');
      }

      if (safeContent.length > 10000) {
        throw new Error('Message exceeds maximum length');
      }

      const rate = this.rateLimiter.check(message.userId || 'anonymous');
      if (!rate.allowed) {
        throw new Error(`Rate limit exceeded. Retry after ${rate.retryAfter}s.`);
      }

      const preferredModel =
        typeof message.metadata?.preferredModel === 'string'
          ? (message.metadata.preferredModel as string)
          : undefined;
      let routingDecision = smartModelRouter.routeMessage(safeContent, preferredModel);
      metricsService.recordModelRoutingDecision(routingDecision.tier, routingDecision.model);
      llmOpsTelemetry.trackRoutingDecision(routingDecision.tier, routingDecision.model);

      const provider = this.agent.getConfig().llm.provider;
      const estimatedPromptTokens = this.estimateTokens(safeContent);
      const estimatedCompletionTokens =
        routingDecision.tier === 'simple'
          ? 300
          : routingDecision.tier === 'medium'
            ? 700
            : 1400;

      let estimatedCost = budgetGovernor.estimateCost(
        provider,
        routingDecision.model,
        estimatedPromptTokens,
        estimatedCompletionTokens
      );

      let budgetCheck = budgetGovernor.check(message.userId, estimatedCost);
      if (!budgetCheck.allowed && routingDecision.tier !== 'simple') {
        const simpleDecision = smartModelRouter.routeMessage(safeContent, process.env.MODEL_ROUTER_SIMPLE_MODEL);
        const simpleCost = budgetGovernor.estimateCost(
          provider,
          simpleDecision.model,
          estimatedPromptTokens,
          300
        );
        const fallbackCheck = budgetGovernor.check(message.userId, simpleCost);

        if (fallbackCheck.allowed) {
          routingDecision = simpleDecision;
          estimatedCost = simpleCost;
          budgetCheck = fallbackCheck;
          metricsService.recordBudgetEvent('downgrade');
          llmOpsTelemetry.trackBudgetEvent('downgrade');
        }
      }

      if (!budgetCheck.allowed) {
        metricsService.recordBudgetEvent(
          budgetCheck.reason === 'global_limit_exceeded' ? 'global_limit' : 'user_limit'
        );
        llmOpsTelemetry.trackBudgetEvent(
          budgetCheck.reason === 'global_limit_exceeded' ? 'global_limit' : 'user_limit'
        );
        throw new Error(
          budgetCheck.reason === 'global_limit_exceeded'
            ? 'Global daily budget reached. Please try again later.'
            : 'Daily user budget reached. Please try again tomorrow or use a cheaper model.'
        );
      }

      let conversationId = message.conversationId;

      if (!conversationId) {
        const result = await this.agent.startConversation(
          message.userId,
          message.source,
          safeContent
        );
        conversationId = result.conversationId;
      }

      const response = await this.agent.processMessage(
        safeContent,
        conversationId,
        message.userId,
        message.source,
        {
          modelOverride: routingDecision.model,
          routingTier: routingDecision.tier,
        }
      );

      const promptTokens = estimatedPromptTokens;
      const completionTokens = Math.max(0, response.tokensUsed - promptTokens);
      const modelUsed = response.model || routingDecision.model;
      const actualCost = budgetGovernor.estimateCost(provider, modelUsed, promptTokens, completionTokens);

      budgetGovernor.record(message.userId, actualCost);
      metricsService.recordBudgetEvent('allow');
      metricsService.recordLlmSpend(provider, modelUsed, actualCost);
      llmOpsTelemetry.trackBudgetEvent('allow');
      llmOpsTelemetry.trackSpend(modelUsed, actualCost);
      metricsService.recordLlmRequest(
        provider,
        modelUsed,
        'success',
        (Date.now() - startTime) / 1000,
        { prompt: promptTokens, completion: completionTokens }
      );

      try {
        await usageTracker.recordLLM(modelUsed, promptTokens, completionTokens, actualCost, {
          userId: message.userId,
          conversationId,
          metadata: {
            source: message.source,
            routingTier: response.routingTier || routingDecision.tier,
            estimatedCost,
          },
        });

        costTracker.track(
          conversationId,
          message.userId,
          provider,
          modelUsed,
          {
            promptTokens,
            completionTokens,
            totalTokens: response.tokensUsed,
          },
          'message-router'
        );
      } catch (trackingError) {
        console.warn('Usage tracking warning:', trackingError);
      }

      this.stats.successfulMessages++;
      const responseTime = Date.now() - startTime;
      this.updateAverageResponseTime(responseTime);

      console.log(`Message ${message.id} routed successfully in ${responseTime}ms`);

      return {
        id: randomUUID(),
        content: response.message,
        conversationId: response.conversationId,
        tokensUsed: response.tokensUsed,
        timestamp: response.timestamp,
      };
    } catch (error) {
      this.stats.failedMessages++;
      if (this.agent) {
        const provider = this.agent.getConfig().llm.provider;
        metricsService.recordLlmRequest(provider, this.agent.getConfig().llm.model, 'error', (Date.now() - startTime) / 1000);
      }
      console.error(`Message ${message.id} routing failed:`, error);
      throw error;
    }
  }

  private estimateTokens(text: string): number {
    return Math.ceil(text.length / 4);
  }

  private updateAverageResponseTime(newTime: number): void {
    const total = this.stats.successfulMessages;
    this.stats.averageResponseTime =
      (this.stats.averageResponseTime * (total - 1) + newTime) / total;
  }

  registerHandler(source: string, handler: MessageHandler): void {
    this.handlers.set(source, handler);
    console.log(`Registered handler for source: ${source}`);
  }

  unregisterHandler(source: string): boolean {
    return this.handlers.delete(source);
  }

  async handleFromTelegram(
    userId: string,
    message: string,
    conversationId?: string
  ): Promise<RouterResponse> {
    return this.route({
      id: randomUUID(),
      content: message,
      userId,
      conversationId,
      source: 'telegram',
      timestamp: new Date(),
    });
  }

  async handleFromDiscord(
    userId: string,
    message: string,
    conversationId?: string
  ): Promise<RouterResponse> {
    return this.route({
      id: randomUUID(),
      content: message,
      userId,
      conversationId,
      source: 'discord',
      timestamp: new Date(),
    });
  }

  async handleFromWebSocket(
    userId: string,
    message: string,
    conversationId?: string,
    metadata?: Record<string, unknown>
  ): Promise<RouterResponse> {
    return this.route({
      id: randomUUID(),
      content: message,
      userId,
      conversationId,
      source: 'websocket',
      metadata,
      timestamp: new Date(),
    });
  }

  async handleFromSlack(
    userId: string,
    message: string,
    conversationId?: string
  ): Promise<RouterResponse> {
    return this.route({
      id: randomUUID(),
      content: message,
      userId,
      conversationId,
      source: 'slack',
      timestamp: new Date(),
    });
  }

  async handleFromCLI(
    userId: string,
    message: string,
    conversationId?: string
  ): Promise<RouterResponse> {
    return this.route({
      id: randomUUID(),
      content: message,
      userId,
      conversationId,
      source: 'cli',
      timestamp: new Date(),
    });
  }

  async handleFromWhatsApp(
    userId: string,
    message: string,
    conversationId?: string
  ): Promise<RouterResponse> {
    return this.route({
      id: randomUUID(),
      content: message,
      userId,
      conversationId,
      source: 'whatsapp',
      timestamp: new Date(),
    });
  }

  async handleFromSignal(
    userId: string,
    message: string,
    conversationId?: string
  ): Promise<RouterResponse> {
    return this.route({
      id: randomUUID(),
      content: message,
      userId,
      conversationId,
      source: 'signal',
      timestamp: new Date(),
    });
  }

  async handleFromGoogleChat(
    userId: string,
    message: string,
    conversationId?: string
  ): Promise<RouterResponse> {
    return this.route({
      id: randomUUID(),
      content: message,
      userId,
      conversationId,
      source: 'googlechat',
      timestamp: new Date(),
    });
  }

  async handleFromMSTeams(
    userId: string,
    message: string,
    conversationId?: string
  ): Promise<RouterResponse> {
    return this.route({
      id: randomUUID(),
      content: message,
      userId,
      conversationId,
      source: 'msteams',
      timestamp: new Date(),
    });
  }

  async handleFromMatrix(
    userId: string,
    message: string,
    conversationId?: string
  ): Promise<RouterResponse> {
    return this.route({
      id: randomUUID(),
      content: message,
      userId,
      conversationId,
      source: 'matrix',
      timestamp: new Date(),
    });
  }

  async handleFromWebChat(
    userId: string,
    message: string,
    conversationId?: string
  ): Promise<RouterResponse> {
    return this.route({
      id: randomUUID(),
      content: message,
      userId,
      conversationId,
      source: 'webchat',
      timestamp: new Date(),
    });
  }

  getStats(): RouterStats {
    return { ...this.stats };
  }

  resetStats(): void {
    this.stats = {
      totalMessages: 0,
      successfulMessages: 0,
      failedMessages: 0,
      averageResponseTime: 0,
    };
  }
}

interface RouterStats {
  totalMessages: number;
  successfulMessages: number;
  failedMessages: number;
  averageResponseTime: number;
}

export const messageRouter = new MessageRouter();
