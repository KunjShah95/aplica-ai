import { Prisma } from '@prisma/client';
import { MessageRole } from '../types/prisma-types.js';
export interface CreateConversationInput {
    userId: string;
    workspaceId?: string;
    title?: string;
    platform?: string;
    metadata?: Record<string, unknown>;
}
export interface AddMessageInput {
    conversationId: string;
    role: MessageRole;
    content: string;
    model?: string;
    tokenCount?: number;
    toolCalls?: Record<string, unknown>[];
    parentId?: string;
    metadata?: Record<string, unknown>;
}
export interface ConversationWithMessages {
    id: string;
    title: string | null;
    summary: string | null;
    platform: string;
    createdAt: Date;
    updatedAt: Date;
    messages: {
        id: string;
        role: MessageRole;
        content: string;
        model: string | null;
        createdAt: Date;
    }[];
}
export declare class ConversationService {
    create(input: CreateConversationInput): Promise<{
        id: string;
        userId: string;
        createdAt: Date;
        summary: string | null;
        title: string | null;
        updatedAt: Date;
        workspaceId: string | null;
        platform: string;
        metadata: Prisma.JsonValue;
        isArchived: boolean;
    }>;
    get(id: string): Promise<ConversationWithMessages | null>;
    list(userId: string, options?: {
        limit?: number;
        offset?: number;
        workspaceId?: string;
        includeArchived?: boolean;
    }): Promise<{
        id: any;
        title: any;
        summary: any;
        platform: any;
        lastMessage: any;
        messageCount: any;
        createdAt: any;
        updatedAt: any;
    }[]>;
    addMessage(input: AddMessageInput): Promise<{
        id: string;
        role: import(".prisma/client").$Enums.MessageRole;
        content: string;
        model: string | null;
        toolCalls: Prisma.JsonValue | null;
        conversationId: string;
        createdAt: Date;
        parentId: string | null;
        metadata: Prisma.JsonValue;
        tokenCount: number | null;
    }>;
    getMessages(conversationId: string, options?: {
        limit?: number;
        before?: string;
    }): Promise<{
        id: string;
        role: import(".prisma/client").$Enums.MessageRole;
        content: string;
        model: string | null;
        toolCalls: Prisma.JsonValue | null;
        conversationId: string;
        createdAt: Date;
        parentId: string | null;
        metadata: Prisma.JsonValue;
        tokenCount: number | null;
    }[]>;
    updateTitle(id: string, title: string): Promise<{
        id: string;
        userId: string;
        createdAt: Date;
        summary: string | null;
        title: string | null;
        updatedAt: Date;
        workspaceId: string | null;
        platform: string;
        metadata: Prisma.JsonValue;
        isArchived: boolean;
    }>;
    updateSummary(id: string, summary: string): Promise<{
        id: string;
        userId: string;
        createdAt: Date;
        summary: string | null;
        title: string | null;
        updatedAt: Date;
        workspaceId: string | null;
        platform: string;
        metadata: Prisma.JsonValue;
        isArchived: boolean;
    }>;
    archive(id: string): Promise<{
        id: string;
        userId: string;
        createdAt: Date;
        summary: string | null;
        title: string | null;
        updatedAt: Date;
        workspaceId: string | null;
        platform: string;
        metadata: Prisma.JsonValue;
        isArchived: boolean;
    }>;
    unarchive(id: string): Promise<{
        id: string;
        userId: string;
        createdAt: Date;
        summary: string | null;
        title: string | null;
        updatedAt: Date;
        workspaceId: string | null;
        platform: string;
        metadata: Prisma.JsonValue;
        isArchived: boolean;
    }>;
    delete(id: string): Promise<{
        id: string;
        userId: string;
        createdAt: Date;
        summary: string | null;
        title: string | null;
        updatedAt: Date;
        workspaceId: string | null;
        platform: string;
        metadata: Prisma.JsonValue;
        isArchived: boolean;
    }>;
    share(conversationId: string, expiresInDays?: number): Promise<{
        shareToken: string;
        expiresAt: Date | null;
    }>;
    getByShareToken(shareToken: string): Promise<ConversationWithMessages | null>;
    revokeShare(shareToken: string): Promise<void>;
    getTokenUsage(userId: string, startDate: Date, endDate: Date): Promise<{
        totalTokens: number;
        messageCount: number;
    }>;
    search(userId: string, query: string, options?: {
        limit?: number;
        workspaceId?: string;
    }): Promise<{
        messageId: any;
        conversationId: any;
        conversationTitle: any;
        content: any;
        role: any;
        createdAt: any;
    }[]>;
}
export declare const conversationService: ConversationService;
//# sourceMappingURL=conversation.d.ts.map