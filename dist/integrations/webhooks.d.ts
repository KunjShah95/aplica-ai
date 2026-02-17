import { Prisma } from '@prisma/client';
export interface WebhookPayload {
    event: string;
    timestamp: string;
    data: Record<string, unknown>;
}
export interface WebhookResult {
    success: boolean;
    statusCode?: number;
    response?: unknown;
    error?: string;
}
export declare class WebhookService {
    create(data: {
        name: string;
        url: string;
        events: string[];
        secret?: string;
        integrationId?: string;
    }): Promise<{
        name: string;
        id: string;
        createdAt: Date;
        isActive: boolean;
        updatedAt: Date;
        url: string;
        secret: string | null;
        events: string[];
        lastTriggeredAt: Date | null;
        integrationId: string | null;
    }>;
    list(integrationId?: string): Promise<{
        name: string;
        id: string;
        createdAt: Date;
        isActive: boolean;
        updatedAt: Date;
        url: string;
        secret: string | null;
        events: string[];
        lastTriggeredAt: Date | null;
        integrationId: string | null;
    }[]>;
    get(id: string): Promise<{
        name: string;
        id: string;
        createdAt: Date;
        isActive: boolean;
        updatedAt: Date;
        url: string;
        secret: string | null;
        events: string[];
        lastTriggeredAt: Date | null;
        integrationId: string | null;
    } | null>;
    update(id: string, data: {
        name?: string;
        url?: string;
        events?: string[];
        isActive?: boolean;
    }): Promise<{
        name: string;
        id: string;
        createdAt: Date;
        isActive: boolean;
        updatedAt: Date;
        url: string;
        secret: string | null;
        events: string[];
        lastTriggeredAt: Date | null;
        integrationId: string | null;
    }>;
    delete(id: string): Promise<{
        name: string;
        id: string;
        createdAt: Date;
        isActive: boolean;
        updatedAt: Date;
        url: string;
        secret: string | null;
        events: string[];
        lastTriggeredAt: Date | null;
        integrationId: string | null;
    }>;
    trigger(event: string, data: Record<string, unknown>): Promise<void>;
    private send;
    getDeliveries(webhookId: string, limit?: number): Promise<{
        error: string | null;
        id: string;
        payload: Prisma.JsonValue;
        createdAt: Date;
        success: boolean;
        response: Prisma.JsonValue | null;
        webhookId: string;
        statusCode: number | null;
        event: string;
    }[]>;
    retry(deliveryId: string): Promise<WebhookResult>;
}
export declare const webhookService: WebhookService;
//# sourceMappingURL=webhooks.d.ts.map