import { Agent } from '../core/agent.js';
import { randomUUID } from 'crypto';

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
    | 'slack';
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
  private stats: RouterStats = {
    totalMessages: 0,
    successfulMessages: 0,
    failedMessages: 0,
    averageResponseTime: 0,
  };

  constructor(agent?: Agent) {
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
      let conversationId = message.conversationId;

      if (!conversationId) {
        const result = await this.agent.startConversation(
          message.userId,
          message.source,
          message.content
        );
        conversationId = result.conversationId;
      }

      const response = await this.agent.processMessage(
        message.content,
        conversationId,
        message.userId,
        message.source
      );

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
      console.error(`Message ${message.id} routing failed:`, error);
      throw error;
    }
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
    conversationId?: string
  ): Promise<RouterResponse> {
    return this.route({
      id: randomUUID(),
      content: message,
      userId,
      conversationId,
      source: 'websocket',
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
