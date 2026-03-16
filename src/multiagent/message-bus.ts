import { randomUUID } from 'crypto';
import { EventEmitter } from 'events';
import {
  AgentMessage,
  AgentTask,
  AgentStats,
  AgentConfig,
  RoutingDecision,
} from './types.js';

/**
 * Message Bus - Inter-agent communication hub
 */
export class MessageBus extends EventEmitter {
  private messageQueue: AgentMessage[] = [];
  private subscriptions: Map<string, Set<(msg: AgentMessage) => void>> = new Map();
  private pendingRequests: Map<string, { resolve: (data: unknown) => void; reject: (err: Error) => void; timeout: NodeJS.Timeout }> = new Map();
  private messageHistory: AgentMessage[] = [];
  private maxHistory = 1000;

  constructor() {
    super();
    this.setupInternalHandlers();
  }

  /**
   * Setup internal message handlers
   */
  private setupInternalHandlers(): void {
    // Handle task messages
    this.on('message:task', (msg: AgentMessage) => {
      this.handleTaskMessage(msg);
    });

    // Handle response messages
    this.on('message:response', (msg: AgentMessage) => {
      this.handleResponseMessage(msg);
    });

    // Handle query messages
    this.on('message:query', (msg: AgentMessage) => {
      this.handleQueryMessage(msg);
    });
  }

  /**
   * Publish a message to the bus
   */
  publish(message: Omit<AgentMessage, 'id' | 'timestamp'>): string {
    const msg: AgentMessage = {
      ...message,
      id: randomUUID(),
      timestamp: new Date(),
    };

    this.messageQueue.push(msg);
    this.messageHistory.push(msg);

    // Keep history bounded
    if (this.messageHistory.length > this.maxHistory) {
      this.messageHistory.shift();
    }

    // Emit to subscribers
    this.emit('message', msg);

    const subscribers = this.subscriptions.get(msg.to) || new Set();
    for (const handler of subscribers) {
      try {
        handler(msg);
      } catch (error) {
        console.error(`[MessageBus] Error in handler for ${msg.to}:`, error);
      }
    }

    return msg.id;
  }

  /**
   * Subscribe to messages for a specific agent
   */
  subscribe(agentId: string, handler: (msg: AgentMessage) => void): () => void {
    if (!this.subscriptions.has(agentId)) {
      this.subscriptions.set(agentId, new Set());
    }

    this.subscriptions.get(agentId)?.add(handler);

    // Return unsubscribe function
    return () => {
      this.subscriptions.get(agentId)?.delete(handler);
    };
  }

  /**
   * Send a request and wait for response
   */
  request(to: string, payload: unknown, timeoutMs: number = 5000): Promise<unknown> {
    return new Promise((resolve, reject) => {
      const requestId = randomUUID();
      const timeout = setTimeout(() => {
        this.pendingRequests.delete(requestId);
        reject(new Error(`Request timeout after ${timeoutMs}ms`));
      }, timeoutMs);

      const payloadObject =
        payload && typeof payload === 'object' && !Array.isArray(payload)
          ? (payload as Record<string, unknown>)
          : { value: payload };

      this.pendingRequests.set(requestId, { resolve, reject, timeout });

      this.publish({
        from: 'system',
        to,
        type: 'request',
        payload: {
          requestId,
          ...payloadObject,
        },
      });
    });
  }

  /**
   * Send a response to a request
   */
  respond(requestId: string, from: string, payload: unknown): void {
    const payloadObject =
      payload && typeof payload === 'object' && !Array.isArray(payload)
        ? (payload as Record<string, unknown>)
        : { value: payload };

    this.publish({
      from,
      to: 'system',
      type: 'response',
      payload: { requestId, ...payloadObject },
    });
  }

  /**
   * Handle task messages
   */
  private handleTaskMessage(msg: AgentMessage): void {
    this.emit('task', msg.payload as AgentTask);
  }

  /**
   * Handle response messages
   */
  private handleResponseMessage(msg: AgentMessage): void {
    const requestId = (msg.payload as any)?.requestId;
    if (requestId && this.pendingRequests.has(requestId)) {
      const { resolve, reject, timeout } = this.pendingRequests.get(requestId)!;
      clearTimeout(timeout);
      this.pendingRequests.delete(requestId);
      resolve(msg.payload);
    }
  }

  /**
   * Handle query messages (for stats, configuration, etc.)
   */
  private handleQueryMessage(msg: AgentMessage): void {
    const query = msg.payload as { type: string; agentId?: string };

    switch (query.type) {
      case 'stats':
        this.handleStatsQuery(msg);
        break;
      case 'config':
        this.handleConfigQuery(msg);
        break;
      case 'list_agents':
        this.handleListAgentsQuery(msg);
        break;
      default:
        this.respond(msg.id, msg.to, { error: `Unknown query type: ${query.type}` });
    }
  }

  /**
   * Handle stats query
   */
  private handleStatsQuery(msg: AgentMessage): void {
    const stats = this.generateStats();
    this.respond(msg.id, msg.to, stats);
  }

  /**
   * Handle config query
   */
  private handleConfigQuery(msg: AgentMessage): void {
    const config = this.generateConfig();
    this.respond(msg.id, msg.to, config);
  }

  /**
   * Handle list agents query
   */
  private handleListAgentsQuery(msg: AgentMessage): void {
    const agents = this.getRegisteredAgents();
    this.respond(msg.id, msg.to, { agents });
  }

  /**
   * Broadcast message to all agents
   */
  broadcast(type: AgentMessage['type'], payload: unknown, exclude?: string[]): void {
    this.publish({
      from: 'system',
      to: 'broadcast',
      type,
      payload,
    });
  }

  /**
   * Broadcast task to all agents
   */
  broadcastTask(task: Omit<AgentTask, 'id' | 'createdAt' | 'updatedAt' | 'status'>): void {
    const taskMsg: AgentTask = {
      ...task,
      id: randomUUID(),
      status: 'pending',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.broadcast('task', taskMsg);
  }

  /**
   * Generate current statistics
   */
  private generateStats(): AgentStats {
    return {
      totalTasks: this.messageHistory.filter((m) => m.type === 'task').length,
      completedTasks: 0, // Would need additional tracking
      failedTasks: 0,
      avgResponseTime: 0,
      modelUsage: {},
    };
  }

  /**
   * Generate agent configuration summary
   */
  private generateConfig(): { messageBus: Record<string, unknown> } {
    return {
      messageBus: {
        subscribers: this.subscriptions.size,
        pendingRequests: this.pendingRequests.size,
        messageHistory: this.messageHistory.length,
        maxHistory: this.maxHistory,
      },
    };
  }

  /**
   * Get list of registered agents
   */
  private getRegisteredAgents(): { agentId: string; messageCount: number }[] {
    // This would integrate with an agent registry
    return [];
  }

  /**
   * Clear message history (for memory management)
   */
  clearHistory(): void {
    this.messageHistory = [];
    console.log('[MessageBus] History cleared');
  }

  /**
   * Get message count by type
   */
  getMessageCountByType(): Record<string, number> {
    const counts: Record<string, number> = {};
    for (const msg of this.messageHistory) {
      counts[msg.type] = (counts[msg.type] || 0) + 1;
    }
    return counts;
  }

  /**
   * Get recent messages (last n)
   */
  getRecentMessages(count: number = 10): AgentMessage[] {
    return this.messageHistory.slice(-count);
  }

  /**
   * Get message history between two agents
   */
  getConversationHistory(agent1: string, agent2: string): AgentMessage[] {
    return this.messageHistory.filter(
      (m) =>
        (m.from === agent1 && m.to === agent2) ||
        (m.from === agent2 && m.to === agent1)
    );
  }
}

/**
 * Global message bus instance
 */
export const messageBus = new MessageBus();
