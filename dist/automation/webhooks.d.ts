export interface WebhookConfig {
    id: string;
    name: string;
    url: string;
    method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
    headers?: Record<string, string>;
    events: WebhookEventType[];
    enabled: boolean;
    secret?: string;
    createdAt: Date;
    lastTriggered?: Date;
    failureCount: number;
}
export type WebhookEventType = 'message:received' | 'message:sent' | 'conversation:created' | 'conversation:closed' | 'task:completed' | 'task:failed' | 'user:joined' | 'user:left' | 'gateway:started' | 'gateway:stopped' | 'error:critical' | 'custom';
export interface WebhookPayload {
    event: WebhookEventType;
    timestamp: Date;
    data: Record<string, unknown>;
    webhookId: string;
}
export interface WebhookResponse {
    success: boolean;
    statusCode?: number;
    responseTime?: number;
    error?: string;
}
export declare class WebhookManager {
    private webhooks;
    private eventSubscriptions;
    private retryConfig;
    constructor(retryConfig?: Partial<typeof this.retryConfig>);
    registerWebhook(config: Omit<WebhookConfig, 'id' | 'createdAt' | 'failureCount'>): WebhookConfig;
    unregisterWebhook(webhookId: string): boolean;
    triggerEvent(event: WebhookEventType, data: Record<string, unknown>): Promise<void>;
    private sendWebhook;
    retryFailedWebhooks(): Promise<void>;
    private lastPayloads;
    private getLastPayload;
    private setLastPayload;
    getWebhook(webhookId: string): WebhookConfig | undefined;
    getAllWebhooks(): WebhookConfig[];
    getWebhooksByEvent(event: WebhookEventType): WebhookConfig[];
    updateWebhook(webhookId: string, updates: Partial<WebhookConfig>): WebhookConfig | null;
    enableWebhook(webhookId: string): boolean;
    disableWebhook(webhookId: string): boolean;
    getStats(): {
        total: number;
        enabled: number;
        disabled: number;
        failed: number;
        byEvent: Record<string, number>;
    };
}
export declare const webhookManager: WebhookManager;
//# sourceMappingURL=webhooks.d.ts.map