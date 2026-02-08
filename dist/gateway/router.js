import { randomUUID } from 'crypto';
export class MessageRouter {
    agent = null;
    handlers = new Map();
    stats = {
        totalMessages: 0,
        successfulMessages: 0,
        failedMessages: 0,
        averageResponseTime: 0,
    };
    constructor(agent) {
        if (agent) {
            this.agent = agent;
        }
    }
    setAgent(agent) {
        this.agent = agent;
    }
    async route(message) {
        const startTime = Date.now();
        this.stats.totalMessages++;
        if (!this.agent) {
            throw new Error('Agent not initialized in MessageRouter');
        }
        try {
            let conversationId = message.conversationId;
            if (!conversationId) {
                const result = await this.agent.startConversation(message.userId, message.source, message.content);
                conversationId = result.conversationId;
            }
            const response = await this.agent.processMessage(message.content, conversationId, message.userId, message.source);
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
        }
        catch (error) {
            this.stats.failedMessages++;
            console.error(`Message ${message.id} routing failed:`, error);
            throw error;
        }
    }
    updateAverageResponseTime(newTime) {
        const total = this.stats.successfulMessages;
        this.stats.averageResponseTime =
            (this.stats.averageResponseTime * (total - 1) + newTime) / total;
    }
    registerHandler(source, handler) {
        this.handlers.set(source, handler);
        console.log(`Registered handler for source: ${source}`);
    }
    unregisterHandler(source) {
        return this.handlers.delete(source);
    }
    async handleFromTelegram(userId, message, conversationId) {
        return this.route({
            id: randomUUID(),
            content: message,
            userId,
            conversationId,
            source: 'telegram',
            timestamp: new Date(),
        });
    }
    async handleFromDiscord(userId, message, conversationId) {
        return this.route({
            id: randomUUID(),
            content: message,
            userId,
            conversationId,
            source: 'discord',
            timestamp: new Date(),
        });
    }
    async handleFromWebSocket(userId, message, conversationId) {
        return this.route({
            id: randomUUID(),
            content: message,
            userId,
            conversationId,
            source: 'websocket',
            timestamp: new Date(),
        });
    }
    async handleFromSlack(userId, message, conversationId) {
        return this.route({
            id: randomUUID(),
            content: message,
            userId,
            conversationId,
            source: 'slack',
            timestamp: new Date(),
        });
    }
    async handleFromCLI(userId, message, conversationId) {
        return this.route({
            id: randomUUID(),
            content: message,
            userId,
            conversationId,
            source: 'cli',
            timestamp: new Date(),
        });
    }
    async handleFromSignal(userId, message, conversationId) {
        return this.route({
            id: randomUUID(),
            content: message,
            userId,
            conversationId,
            source: 'signal',
            timestamp: new Date(),
        });
    }
    async handleFromGoogleChat(userId, message, conversationId) {
        return this.route({
            id: randomUUID(),
            content: message,
            userId,
            conversationId,
            source: 'googlechat',
            timestamp: new Date(),
        });
    }
    async handleFromMSTeams(userId, message, conversationId) {
        return this.route({
            id: randomUUID(),
            content: message,
            userId,
            conversationId,
            source: 'msteams',
            timestamp: new Date(),
        });
    }
    async handleFromMatrix(userId, message, conversationId) {
        return this.route({
            id: randomUUID(),
            content: message,
            userId,
            conversationId,
            source: 'matrix',
            timestamp: new Date(),
        });
    }
    async handleFromWebChat(userId, message, conversationId) {
        return this.route({
            id: randomUUID(),
            content: message,
            userId,
            conversationId,
            source: 'webchat',
            timestamp: new Date(),
        });
    }
    getStats() {
        return { ...this.stats };
    }
    resetStats() {
        this.stats = {
            totalMessages: 0,
            successfulMessages: 0,
            failedMessages: 0,
            averageResponseTime: 0,
        };
    }
}
export const messageRouter = new MessageRouter();
//# sourceMappingURL=router.js.map