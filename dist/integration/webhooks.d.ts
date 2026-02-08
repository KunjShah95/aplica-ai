export interface WebhookConfig {
    secret?: string;
    signatureHeader?: string;
    timestampHeader?: string;
    tolerance?: number;
}
export interface WebhookPayload {
    id: string;
    event: string;
    timestamp: number;
    data: any;
}
export interface WebhookDelivery {
    id: string;
    webhookId: string;
    event: string;
    payload: any;
    status: 'pending' | 'success' | 'failed';
    statusCode?: number;
    response?: string;
    error?: string;
    attemptCount: number;
    createdAt: Date;
    deliveredAt?: Date;
}
export interface WebhookSubscription {
    id: string;
    url: string;
    events: string[];
    secret: string;
    active: boolean;
    createdAt: Date;
    lastTriggeredAt?: Date;
    failureCount: number;
}
export declare class WebhookService {
    private subscriptions;
    private deliveries;
    private config;
    constructor(config?: WebhookConfig);
    createSubscription(url: string, events: string[], secret?: string): WebhookSubscription;
    getSubscription(id: string): WebhookSubscription | undefined;
    getAllSubscriptions(): WebhookSubscription[];
    getSubscriptionsForEvent(event: string): WebhookSubscription[];
    updateSubscription(id: string, updates: Partial<WebhookSubscription>): WebhookSubscription | null;
    deleteSubscription(id: string): boolean;
    trigger(event: string, data: any): Promise<WebhookDelivery[]>;
    private sendWebhook;
    retryFailedDeliveries(): Promise<number>;
    getDeliveries(subscriptionId: string, options?: {
        limit?: number;
        status?: string;
    }): WebhookDelivery[];
    verifySignature(payload: string, signature: string, secret: string): boolean;
    private generateSignature;
    private secureCompare;
    private generateId;
    private generateSecret;
    ping(url: string, secret: string): Promise<{
        success: boolean;
        latency?: number;
        error?: string;
    }>;
    getStats(): {
        totalSubscriptions: number;
        activeSubscriptions: number;
        totalDeliveries: number;
        successRate: number;
        recentDeliveries: WebhookDelivery[];
    };
}
export declare const webhookService: WebhookService;
//# sourceMappingURL=webhooks.d.ts.map