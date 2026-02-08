import { db } from '../db/index.js';
export class ConversationService {
    async create(input) {
        return db.conversation.create({
            data: {
                userId: input.userId,
                workspaceId: input.workspaceId,
                title: input.title,
                platform: input.platform || 'api',
                metadata: input.metadata || {},
            },
        });
    }
    async get(id) {
        const conversation = await db.conversation.findUnique({
            where: { id },
            include: {
                messages: {
                    orderBy: { createdAt: 'asc' },
                    select: {
                        id: true,
                        role: true,
                        content: true,
                        model: true,
                        createdAt: true,
                    },
                },
            },
        });
        if (!conversation)
            return null;
        return {
            id: conversation.id,
            title: conversation.title,
            summary: conversation.summary,
            platform: conversation.platform,
            createdAt: conversation.createdAt,
            updatedAt: conversation.updatedAt,
            messages: conversation.messages.map((m) => ({
                id: m.id,
                role: m.role,
                content: m.content,
                model: m.model,
                createdAt: m.createdAt,
            })),
        };
    }
    async list(userId, options = {}) {
        const { limit = 20, offset = 0, workspaceId, includeArchived = false } = options;
        const conversations = await db.conversation.findMany({
            where: {
                userId,
                workspaceId,
                isArchived: includeArchived ? undefined : false,
            },
            orderBy: { updatedAt: 'desc' },
            take: limit,
            skip: offset,
            include: {
                messages: {
                    orderBy: { createdAt: 'desc' },
                    take: 1,
                    select: {
                        content: true,
                        role: true,
                    },
                },
                _count: { select: { messages: true } },
            },
        });
        return conversations.map((c) => ({
            id: c.id,
            title: c.title,
            summary: c.summary,
            platform: c.platform,
            lastMessage: c.messages[0],
            messageCount: c._count.messages,
            createdAt: c.createdAt,
            updatedAt: c.updatedAt,
        }));
    }
    async addMessage(input) {
        const message = await db.message.create({
            data: {
                conversationId: input.conversationId,
                role: input.role,
                content: input.content,
                model: input.model,
                tokenCount: input.tokenCount,
                toolCalls: input.toolCalls,
                parentId: input.parentId,
                metadata: input.metadata || {},
            },
        });
        await db.conversation.update({
            where: { id: input.conversationId },
            data: { updatedAt: new Date() },
        });
        return message;
    }
    async getMessages(conversationId, options = {}) {
        const { limit = 50, before } = options;
        return db.message.findMany({
            where: {
                conversationId,
                ...(before && { createdAt: { lt: new Date(before) } }),
            },
            orderBy: { createdAt: 'desc' },
            take: limit,
        });
    }
    async updateTitle(id, title) {
        return db.conversation.update({
            where: { id },
            data: { title },
        });
    }
    async updateSummary(id, summary) {
        return db.conversation.update({
            where: { id },
            data: { summary },
        });
    }
    async archive(id) {
        return db.conversation.update({
            where: { id },
            data: { isArchived: true },
        });
    }
    async unarchive(id) {
        return db.conversation.update({
            where: { id },
            data: { isArchived: false },
        });
    }
    async delete(id) {
        return db.conversation.delete({
            where: { id },
        });
    }
    async share(conversationId, expiresInDays) {
        const { generateShareToken } = await import('../auth/password.js');
        const shareToken = generateShareToken();
        const expiresAt = expiresInDays
            ? new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000)
            : null;
        const share = await db.conversationShare.create({
            data: {
                conversationId,
                shareToken,
                expiresAt,
            },
        });
        return {
            shareToken: share.shareToken,
            expiresAt: share.expiresAt,
        };
    }
    async getByShareToken(shareToken) {
        const share = await db.conversationShare.findUnique({
            where: { shareToken },
            include: {
                conversation: {
                    include: {
                        messages: {
                            orderBy: { createdAt: 'asc' },
                            select: {
                                id: true,
                                role: true,
                                content: true,
                                model: true,
                                createdAt: true,
                            },
                        },
                    },
                },
            },
        });
        if (!share)
            return null;
        if (share.expiresAt && share.expiresAt < new Date())
            return null;
        await db.conversationShare.update({
            where: { id: share.id },
            data: { accessCount: { increment: 1 } },
        });
        const conv = share.conversation;
        return {
            id: conv.id,
            title: conv.title,
            summary: conv.summary,
            platform: conv.platform,
            createdAt: conv.createdAt,
            updatedAt: conv.updatedAt,
            messages: conv.messages.map((m) => ({
                id: m.id,
                role: m.role,
                content: m.content,
                model: m.model,
                createdAt: m.createdAt,
            })),
        };
    }
    async revokeShare(shareToken) {
        await db.conversationShare.delete({
            where: { shareToken },
        });
    }
    async getTokenUsage(userId, startDate, endDate) {
        const result = await db.message.aggregate({
            where: {
                conversation: { userId },
                createdAt: { gte: startDate, lte: endDate },
                tokenCount: { not: null },
            },
            _sum: { tokenCount: true },
            _count: true,
        });
        return {
            totalTokens: result._sum.tokenCount || 0,
            messageCount: result._count,
        };
    }
    async search(userId, query, options = {}) {
        const { limit = 10, workspaceId } = options;
        const messages = await db.message.findMany({
            where: {
                conversation: {
                    userId,
                    workspaceId,
                    isArchived: false,
                },
                content: { contains: query, mode: 'insensitive' },
            },
            orderBy: { createdAt: 'desc' },
            take: limit,
            include: {
                conversation: {
                    select: { id: true, title: true },
                },
            },
        });
        return messages.map((m) => ({
            messageId: m.id,
            conversationId: m.conversation.id,
            conversationTitle: m.conversation.title,
            content: m.content,
            role: m.role,
            createdAt: m.createdAt,
        }));
    }
}
export const conversationService = new ConversationService();
//# sourceMappingURL=conversation.js.map