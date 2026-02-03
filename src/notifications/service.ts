import { db } from '../db/index.js';
import { NotificationType, Prisma } from '@prisma/client';

export interface CreateNotificationInput {
    userId: string;
    type: NotificationType;
    title: string;
    content: string;
    metadata?: Record<string, unknown>;
}

export interface NotificationFilters {
    userId: string;
    type?: NotificationType;
    isRead?: boolean;
    limit?: number;
    offset?: number;
}

export class NotificationService {
    async create(input: CreateNotificationInput) {
        return db.notification.create({
            data: {
                userId: input.userId,
                type: input.type,
                title: input.title,
                content: input.content,
                metadata: input.metadata as Prisma.InputJsonValue || {},
            },
        });
    }

    async createBatch(notifications: CreateNotificationInput[]) {
        return db.notification.createMany({
            data: notifications.map((n) => ({
                userId: n.userId,
                type: n.type,
                title: n.title,
                content: n.content,
                metadata: n.metadata as Prisma.InputJsonValue || {},
            })),
        });
    }

    async list(filters: NotificationFilters) {
        const { userId, type, isRead, limit = 20, offset = 0 } = filters;

        return db.notification.findMany({
            where: {
                userId,
                type,
                isRead,
            },
            orderBy: { createdAt: 'desc' },
            take: limit,
            skip: offset,
        });
    }

    async getUnreadCount(userId: string): Promise<number> {
        return db.notification.count({
            where: { userId, isRead: false },
        });
    }

    async markAsRead(id: string): Promise<void> {
        await db.notification.update({
            where: { id },
            data: { isRead: true, readAt: new Date() },
        });
    }

    async markAllAsRead(userId: string): Promise<void> {
        await db.notification.updateMany({
            where: { userId, isRead: false },
            data: { isRead: true, readAt: new Date() },
        });
    }

    async delete(id: string): Promise<void> {
        await db.notification.delete({ where: { id } });
    }

    async deleteOld(userId: string, olderThanDays: number = 30): Promise<number> {
        const cutoff = new Date(Date.now() - olderThanDays * 24 * 60 * 60 * 1000);
        const result = await db.notification.deleteMany({
            where: {
                userId,
                isRead: true,
                createdAt: { lt: cutoff },
            },
        });
        return result.count;
    }

    async notifyTaskCompleted(userId: string, taskName: string, taskId: string): Promise<void> {
        await this.create({
            userId,
            type: NotificationType.TASK_COMPLETED,
            title: 'Task Completed',
            content: `Your task "${taskName}" has been completed successfully.`,
            metadata: { taskId },
        });
    }

    async notifyWorkflowTriggered(userId: string, workflowName: string, workflowId: string): Promise<void> {
        await this.create({
            userId,
            type: NotificationType.WORKFLOW_TRIGGERED,
            title: 'Workflow Triggered',
            content: `Workflow "${workflowName}" has been triggered.`,
            metadata: { workflowId },
        });
    }

    async notifyMention(userId: string, mentionedBy: string, context: string): Promise<void> {
        await this.create({
            userId,
            type: NotificationType.MENTION,
            title: 'You were mentioned',
            content: `${mentionedBy} mentioned you: "${context}"`,
            metadata: { mentionedBy },
        });
    }

    async notifyShare(userId: string, sharedBy: string, resourceType: string, resourceId: string): Promise<void> {
        await this.create({
            userId,
            type: NotificationType.SHARE,
            title: 'Resource Shared',
            content: `${sharedBy} shared a ${resourceType} with you.`,
            metadata: { sharedBy, resourceType, resourceId },
        });
    }

    async notifyError(userId: string, title: string, errorMessage: string): Promise<void> {
        await this.create({
            userId,
            type: NotificationType.ERROR,
            title,
            content: errorMessage,
        });
    }
}

export const notificationService = new NotificationService();
