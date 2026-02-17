import { Prisma } from '@prisma/client';
import { NotificationType } from '../types/prisma-types.js';
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
export declare class NotificationService {
    create(input: CreateNotificationInput): Promise<{
        type: import(".prisma/client").$Enums.NotificationType;
        id: string;
        content: string;
        userId: string;
        createdAt: Date;
        title: string;
        metadata: Prisma.JsonValue;
        isRead: boolean;
        readAt: Date | null;
    }>;
    createBatch(notifications: CreateNotificationInput[]): Promise<Prisma.BatchPayload>;
    list(filters: NotificationFilters): Promise<{
        type: import(".prisma/client").$Enums.NotificationType;
        id: string;
        content: string;
        userId: string;
        createdAt: Date;
        title: string;
        metadata: Prisma.JsonValue;
        isRead: boolean;
        readAt: Date | null;
    }[]>;
    getUnreadCount(userId: string): Promise<number>;
    markAsRead(id: string): Promise<void>;
    markAllAsRead(userId: string): Promise<void>;
    delete(id: string): Promise<void>;
    deleteOld(userId: string, olderThanDays?: number): Promise<number>;
    notifyTaskCompleted(userId: string, taskName: string, taskId: string): Promise<void>;
    notifyWorkflowTriggered(userId: string, workflowName: string, workflowId: string): Promise<void>;
    notifyMention(userId: string, mentionedBy: string, context: string): Promise<void>;
    notifyShare(userId: string, sharedBy: string, resourceType: string, resourceId: string): Promise<void>;
    notifyError(userId: string, title: string, errorMessage: string): Promise<void>;
}
export declare const notificationService: NotificationService;
//# sourceMappingURL=service.d.ts.map