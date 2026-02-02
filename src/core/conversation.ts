import { Message, Conversation, ConversationMetadata, MessageMetadata } from './types.js';
import { randomUUID } from 'crypto';

export class ConversationManager {
  private conversations: Map<string, Conversation> = new Map();
  private userConversations: Map<string, Set<string>> = new Map();
  private readonly maxMessages: number;
  private readonly maxAge: number;

  constructor(options: { maxMessages?: number; maxAge?: number } = {}) {
    this.maxMessages = options.maxMessages || 100;
    this.maxAge = options.maxAge || 24 * 60 * 60 * 1000;
  }

  async create(
    userId: string,
    metadata: ConversationMetadata
  ): Promise<Conversation> {
    const id = randomUUID();
    const now = new Date();

    const conversation: Conversation = {
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
    this.userConversations.get(userId)!.add(id);

    console.log(`Created conversation ${id} for user ${userId}`);
    return conversation;
  }

  async get(id: string): Promise<Conversation | null> {
    return this.conversations.get(id) || null;
  }

  async getByUser(userId: string): Promise<Conversation[]> {
    const ids = this.userConversations.get(userId);
    if (!ids) return [];

    return Array.from(ids)
      .map(id => this.conversations.get(id))
      .filter((c): c is Conversation => c !== undefined);
  }

  async addMessage(
    conversationId: string,
    role: 'user' | 'assistant' | 'system',
    content: string,
    metadata?: Partial<MessageMetadata>
  ): Promise<Message | null> {
    const conversation = this.conversations.get(conversationId);
    if (!conversation) {
      console.error(`Conversation ${conversationId} not found`);
      return null;
    }

    const message: Message = {
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

  private pruneIfNeeded(conversation: Conversation): void {
    while (conversation.messages.length > this.maxMessages) {
      conversation.messages.shift();
    }

    const age = Date.now() - conversation.updatedAt.getTime();
    if (age > this.maxAge && conversation.status === 'active') {
      conversation.status = 'paused';
      console.log(`Conversation ${conversation.id} paused due to age`);
    }
  }

  async close(conversationId: string): Promise<void> {
    const conversation = this.conversations.get(conversationId);
    if (conversation) {
      conversation.status = 'closed';
      conversation.updatedAt = new Date();
      console.log(`Conversation ${conversationId} closed`);
    }
  }

  async archive(conversationId: string): Promise<void> {
    const conversation = this.conversations.get(conversationId);
    if (conversation) {
      conversation.status = 'closed';
      this.pruneIfNeeded(conversation);
      console.log(`Conversation ${conversationId} archived`);
    }
  }

  async getStats(): Promise<{
    total: number;
    active: number;
    paused: number;
    closed: number;
  }> {
    let total = 0, active = 0, paused = 0, closed = 0;

    for (const conv of this.conversations.values()) {
      total++;
      switch (conv.status) {
        case 'active': active++; break;
        case 'paused': paused++; break;
        case 'closed': closed++; break;
      }
    }

    return { total, active, paused, closed };
  }

  async clear(): Promise<void> {
    this.conversations.clear();
    this.userConversations.clear();
    console.log('All conversations cleared');
  }
}

export const conversationManager = new ConversationManager();
