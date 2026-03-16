import { EventEmitter } from 'events';
import { AgentMessage, AgentTask } from './types.js';
/**
 * Message Bus - Inter-agent communication hub
 */
export declare class MessageBus extends EventEmitter {
    private messageQueue;
    private subscriptions;
    private pendingRequests;
    private messageHistory;
    private maxHistory;
    constructor();
    /**
     * Setup internal message handlers
     */
    private setupInternalHandlers;
    /**
     * Publish a message to the bus
     */
    publish(message: Omit<AgentMessage, 'id' | 'timestamp'>): string;
    /**
     * Subscribe to messages for a specific agent
     */
    subscribe(agentId: string, handler: (msg: AgentMessage) => void): () => void;
    /**
     * Send a request and wait for response
     */
    request(to: string, payload: unknown, timeoutMs?: number): Promise<unknown>;
    /**
     * Send a response to a request
     */
    respond(requestId: string, from: string, payload: unknown): void;
    /**
     * Handle task messages
     */
    private handleTaskMessage;
    /**
     * Handle response messages
     */
    private handleResponseMessage;
    /**
     * Handle query messages (for stats, configuration, etc.)
     */
    private handleQueryMessage;
    /**
     * Handle stats query
     */
    private handleStatsQuery;
    /**
     * Handle config query
     */
    private handleConfigQuery;
    /**
     * Handle list agents query
     */
    private handleListAgentsQuery;
    /**
     * Broadcast message to all agents
     */
    broadcast(type: AgentMessage['type'], payload: unknown, exclude?: string[]): void;
    /**
     * Broadcast task to all agents
     */
    broadcastTask(task: Omit<AgentTask, 'id' | 'createdAt' | 'updatedAt' | 'status'>): void;
    /**
     * Generate current statistics
     */
    private generateStats;
    /**
     * Generate agent configuration summary
     */
    private generateConfig;
    /**
     * Get list of registered agents
     */
    private getRegisteredAgents;
    /**
     * Clear message history (for memory management)
     */
    clearHistory(): void;
    /**
     * Get message count by type
     */
    getMessageCountByType(): Record<string, number>;
    /**
     * Get recent messages (last n)
     */
    getRecentMessages(count?: number): AgentMessage[];
    /**
     * Get message history between two agents
     */
    getConversationHistory(agent1: string, agent2: string): AgentMessage[];
}
/**
 * Global message bus instance
 */
export declare const messageBus: MessageBus;
//# sourceMappingURL=message-bus.d.ts.map