import { Message, Conversation, ConversationMetadata, MessageMetadata } from './types.js';
export declare class ConversationManager {
    private conversations;
    private userConversations;
    private readonly maxMessages;
    private readonly maxAge;
    constructor(options?: {
        maxMessages?: number;
        maxAge?: number;
    });
    create(userId: string, metadata: ConversationMetadata): Promise<Conversation>;
    get(id: string): Promise<Conversation | null>;
    getByUser(userId: string): Promise<Conversation[]>;
    addMessage(conversationId: string, role: 'user' | 'assistant' | 'system', content: string, metadata?: Partial<MessageMetadata>): Promise<Message | null>;
    private pruneIfNeeded;
    close(conversationId: string): Promise<void>;
    archive(conversationId: string): Promise<void>;
    getStats(): Promise<{
        total: number;
        active: number;
        paused: number;
        closed: number;
    }>;
    clear(): Promise<void>;
}
export declare const conversationManager: ConversationManager;
//# sourceMappingURL=conversation.d.ts.map