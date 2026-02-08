import { randomUUID } from 'crypto';
export class ConversationManager {
    conversations = new Map();
    userConversations = new Map();
    maxMessages;
    maxAge;
    constructor(options = {}) {
        this.maxMessages = options.maxMessages || 100;
        this.maxAge = options.maxAge || 24 * 60 * 60 * 1000;
    }
    async create(userId, metadata) {
        const id = randomUUID();
        const now = new Date();
        const conversation = {
            id,
            userId,
            messages: [],
            createdAt: now,
            updatedAt: now,
            status: 'active',
            metadata
        };
        this.conversations.set(id, conversation);
        if (!this.userConversations.has(userId)) {
            this.userConversations.set(userId, new Set());
        }
        this.userConversations.get(userId).add(id);
        console.log(`Created conversation ${id} for user ${userId}`);
        return conversation;
    }
    async get(id) {
        return this.conversations.get(id) || null;
    }
    async getByUser(userId) {
        const ids = this.userConversations.get(userId);
        if (!ids)
            return [];
        return Array.from(ids)
            .map(id => this.conversations.get(id))
            .filter((c) => c !== undefined);
    }
    async addMessage(conversationId, role, content, metadata) {
        const conversation = this.conversations.get(conversationId);
        if (!conversation) {
            console.error(`Conversation ${conversationId} not found`);
            return null;
        }
        const message = {
            id: randomUUID(),
            role,
            content,
            timestamp: new Date(),
            metadata: {
                source: metadata?.source || 'websocket',
                userId: metadata?.userId || conversation.userId,
                conversationId,
                platformMessageId: metadata?.platformMessageId
            }
        };
        conversation.messages.push(message);
        conversation.updatedAt = new Date();
        this.pruneIfNeeded(conversation);
        return message;
    }
    pruneIfNeeded(conversation) {
        while (conversation.messages.length > this.maxMessages) {
            conversation.messages.shift();
        }
        const age = Date.now() - conversation.updatedAt.getTime();
        if (age > this.maxAge && conversation.status === 'active') {
            conversation.status = 'paused';
            console.log(`Conversation ${conversation.id} paused due to age`);
        }
    }
    async close(conversationId) {
        const conversation = this.conversations.get(conversationId);
        if (conversation) {
            conversation.status = 'closed';
            conversation.updatedAt = new Date();
            console.log(`Conversation ${conversationId} closed`);
        }
    }
    async archive(conversationId) {
        const conversation = this.conversations.get(conversationId);
        if (conversation) {
            conversation.status = 'closed';
            this.pruneIfNeeded(conversation);
            console.log(`Conversation ${conversationId} archived`);
        }
    }
    async getStats() {
        let total = 0, active = 0, paused = 0, closed = 0;
        for (const conv of this.conversations.values()) {
            total++;
            switch (conv.status) {
                case 'active':
                    active++;
                    break;
                case 'paused':
                    paused++;
                    break;
                case 'closed':
                    closed++;
                    break;
            }
        }
        return { total, active, paused, closed };
    }
    async clear() {
        this.conversations.clear();
        this.userConversations.clear();
        console.log('All conversations cleared');
    }
}
export const conversationManager = new ConversationManager();
//# sourceMappingURL=conversation.js.map