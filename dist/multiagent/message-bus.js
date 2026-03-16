import { randomUUID } from 'crypto';
import { EventEmitter } from 'events';
/**
 * Message Bus - Inter-agent communication hub
 */
export class MessageBus extends EventEmitter {
    messageQueue = [];
    subscriptions = new Map();
    pendingRequests = new Map();
    messageHistory = [];
    maxHistory = 1000;
    constructor() {
        super();
        this.setupInternalHandlers();
    }
    /**
     * Setup internal message handlers
     */
    setupInternalHandlers() {
        // Handle task messages
        this.on('message:task', (msg) => {
            this.handleTaskMessage(msg);
        });
        // Handle response messages
        this.on('message:response', (msg) => {
            this.handleResponseMessage(msg);
        });
        // Handle query messages
        this.on('message:query', (msg) => {
            this.handleQueryMessage(msg);
        });
    }
    /**
     * Publish a message to the bus
     */
    publish(message) {
        const msg = {
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
            }
            catch (error) {
                console.error(`[MessageBus] Error in handler for ${msg.to}:`, error);
            }
        }
        return msg.id;
    }
    /**
     * Subscribe to messages for a specific agent
     */
    subscribe(agentId, handler) {
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
    request(to, payload, timeoutMs = 5000) {
        return new Promise((resolve, reject) => {
            const requestId = randomUUID();
            const timeout = setTimeout(() => {
                this.pendingRequests.delete(requestId);
                reject(new Error(`Request timeout after ${timeoutMs}ms`));
            }, timeoutMs);
            const payloadObject = payload && typeof payload === 'object' && !Array.isArray(payload)
                ? payload
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
    respond(requestId, from, payload) {
        const payloadObject = payload && typeof payload === 'object' && !Array.isArray(payload)
            ? payload
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
    handleTaskMessage(msg) {
        this.emit('task', msg.payload);
    }
    /**
     * Handle response messages
     */
    handleResponseMessage(msg) {
        const requestId = msg.payload?.requestId;
        if (requestId && this.pendingRequests.has(requestId)) {
            const { resolve, reject, timeout } = this.pendingRequests.get(requestId);
            clearTimeout(timeout);
            this.pendingRequests.delete(requestId);
            resolve(msg.payload);
        }
    }
    /**
     * Handle query messages (for stats, configuration, etc.)
     */
    handleQueryMessage(msg) {
        const query = msg.payload;
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
    handleStatsQuery(msg) {
        const stats = this.generateStats();
        this.respond(msg.id, msg.to, stats);
    }
    /**
     * Handle config query
     */
    handleConfigQuery(msg) {
        const config = this.generateConfig();
        this.respond(msg.id, msg.to, config);
    }
    /**
     * Handle list agents query
     */
    handleListAgentsQuery(msg) {
        const agents = this.getRegisteredAgents();
        this.respond(msg.id, msg.to, { agents });
    }
    /**
     * Broadcast message to all agents
     */
    broadcast(type, payload, exclude) {
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
    broadcastTask(task) {
        const taskMsg = {
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
    generateStats() {
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
    generateConfig() {
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
    getRegisteredAgents() {
        // This would integrate with an agent registry
        return [];
    }
    /**
     * Clear message history (for memory management)
     */
    clearHistory() {
        this.messageHistory = [];
        console.log('[MessageBus] History cleared');
    }
    /**
     * Get message count by type
     */
    getMessageCountByType() {
        const counts = {};
        for (const msg of this.messageHistory) {
            counts[msg.type] = (counts[msg.type] || 0) + 1;
        }
        return counts;
    }
    /**
     * Get recent messages (last n)
     */
    getRecentMessages(count = 10) {
        return this.messageHistory.slice(-count);
    }
    /**
     * Get message history between two agents
     */
    getConversationHistory(agent1, agent2) {
        return this.messageHistory.filter((m) => (m.from === agent1 && m.to === agent2) ||
            (m.from === agent2 && m.to === agent1));
    }
}
/**
 * Global message bus instance
 */
export const messageBus = new MessageBus();
//# sourceMappingURL=message-bus.js.map