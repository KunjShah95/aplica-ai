import { randomUUID } from 'crypto';

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

export type WebhookEventType =
  | 'message:received'
  | 'message:sent'
  | 'conversation:created'
  | 'conversation:closed'
  | 'task:completed'
  | 'task:failed'
  | 'user:joined'
  | 'user:left'
  | 'gateway:started'
  | 'gateway:stopped'
  | 'error:critical'
  | 'custom';

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

export class WebhookManager {
  private webhooks: Map<string, WebhookConfig> = new Map();
  private eventSubscriptions: Map<WebhookEventType, Set<string>> = new Map();
  private retryConfig: {
    maxRetries: number;
    retryDelay: number;
    backoffMultiplier: number;
  };

  constructor(retryConfig?: Partial<typeof this.retryConfig>) {
    this.retryConfig = {
      maxRetries: retryConfig?.maxRetries ?? 3,
      retryDelay: retryConfig?.retryDelay ?? 1000,
      backoffMultiplier: retryConfig?.backoffMultiplier ?? 2,
    };
  }

  registerWebhook(config: Omit<WebhookConfig, 'id' | 'createdAt' | 'failureCount'>): WebhookConfig {
    const webhook: WebhookConfig = {
      ...config,
      id: randomUUID(),
      createdAt: new Date(),
      failureCount: 0,
    };

    this.webhooks.set(webhook.id, webhook);

    for (const event of webhook.events) {
      if (!this.eventSubscriptions.has(event)) {
        this.eventSubscriptions.set(event, new Set());
      }
      this.eventSubscriptions.get(event)!.add(webhook.id);
    }

    console.log(`Registered webhook: ${webhook.name} (${webhook.id})`);
    return webhook;
  }

  unregisterWebhook(webhookId: string): boolean {
    const webhook = this.webhooks.get(webhookId);
    if (!webhook) return false;

    for (const event of webhook.events) {
      const subscribers = this.eventSubscriptions.get(event);
      if (subscribers) {
        subscribers.delete(webhookId);
        if (subscribers.size === 0) {
          this.eventSubscriptions.delete(event);
        }
      }
    }

    this.webhooks.delete(webhookId);
    console.log(`Unregistered webhook: ${webhook.name} (${webhookId})`);
    return true;
  }

  async triggerEvent(event: WebhookEventType, data: Record<string, unknown>): Promise<void> {
    const subscribers = this.eventSubscriptions.get(event);
    if (!subscribers || subscribers.size === 0) return;

    const payload: WebhookPayload = {
      event,
      timestamp: new Date(),
      data,
      webhookId: '',
    };

    const promises = Array.from(subscribers).map(async (webhookId) => {
      const webhook = this.webhooks.get(webhookId);
      if (!webhook || !webhook.enabled) return;

      payload.webhookId = webhookId;
      await this.sendWebhook(webhook, payload);
    });

    await Promise.all(promises);
  }

  private async sendWebhook(
    webhook: WebhookConfig,
    payload: WebhookPayload
  ): Promise<WebhookResponse> {
    const startTime = Date.now();

    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        ...webhook.headers,
      };

      if (webhook.secret) {
        const crypto = await import('crypto');
        const signature = crypto
          .createHmac('sha256', webhook.secret)
          .update(JSON.stringify(payload))
          .digest('hex');
        headers['X-Webhook-Signature'] = `sha256=${signature}`;
      }

      headers['X-Webhook-Event'] = payload.event;
      headers['X-Webhook-ID'] = webhook.id;
      headers['X-Webhook-Timestamp'] = payload.timestamp.toISOString();

      const response = await fetch(webhook.url, {
        method: webhook.method,
        headers,
        body: JSON.stringify(payload),
      });

      const responseTime = Date.now() - startTime;

      if (response.ok) {
        webhook.lastTriggered = new Date();
        webhook.failureCount = 0;

        console.log(`Webhook ${webhook.name} triggered successfully in ${responseTime}ms`);
        return { success: true, statusCode: response.status, responseTime };
      } else {
        webhook.failureCount++;
        console.warn(`Webhook ${webhook.name} returned status ${response.status}`);
        return { success: false, statusCode: response.status, responseTime };
      }
    } catch (error) {
      const responseTime = Date.now() - startTime;
      webhook.failureCount++;

      console.error(`Webhook ${webhook.name} failed:`, error);
      return {
        success: false,
        responseTime,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  async retryFailedWebhooks(): Promise<void> {
    for (const webhook of this.webhooks.values()) {
      if (webhook.failureCount > 0 && webhook.failureCount <= this.retryConfig.maxRetries) {
        const lastPayload = this.getLastPayload(webhook.id);
        if (lastPayload) {
          const delay =
            this.retryConfig.retryDelay *
            Math.pow(this.retryConfig.backoffMultiplier, webhook.failureCount - 1);
          setTimeout(() => this.sendWebhook(webhook, lastPayload), delay);
        }
      }
    }
  }

  private lastPayloads: Map<string, WebhookPayload> = new Map();

  private getLastPayload(webhookId: string): WebhookPayload | undefined {
    return this.lastPayloads.get(webhookId);
  }

  private setLastPayload(webhookId: string, payload: WebhookPayload): void {
    this.lastPayloads.set(webhookId, payload);
  }

  getWebhook(webhookId: string): WebhookConfig | undefined {
    return this.webhooks.get(webhookId);
  }

  getAllWebhooks(): WebhookConfig[] {
    return Array.from(this.webhooks.values());
  }

  getWebhooksByEvent(event: WebhookEventType): WebhookConfig[] {
    const webhookIds = this.eventSubscriptions.get(event);
    if (!webhookIds) return [];

    return Array.from(webhookIds)
      .map((id) => this.webhooks.get(id))
      .filter((w): w is WebhookConfig => w !== undefined);
  }

  updateWebhook(webhookId: string, updates: Partial<WebhookConfig>): WebhookConfig | null {
    const webhook = this.webhooks.get(webhookId);
    if (!webhook) return null;

    const updatedWebhook = { ...webhook, ...updates };
    this.webhooks.set(webhookId, updatedWebhook);
    return updatedWebhook;
  }

  enableWebhook(webhookId: string): boolean {
    const webhook = this.webhooks.get(webhookId);
    if (!webhook) return false;

    webhook.enabled = true;
    return true;
  }

  disableWebhook(webhookId: string): boolean {
    const webhook = this.webhooks.get(webhookId);
    if (!webhook) return false;

    webhook.enabled = false;
    return true;
  }

  getStats(): {
    total: number;
    enabled: number;
    disabled: number;
    failed: number;
    byEvent: Record<string, number>;
  } {
    const stats = {
      total: this.webhooks.size,
      enabled: 0,
      disabled: 0,
      failed: 0,
      byEvent: {} as Record<string, number>,
    };

    for (const webhook of this.webhooks.values()) {
      if (webhook.enabled) {
        stats.enabled++;
      } else {
        stats.disabled++;
      }

      if (webhook.failureCount > 0) {
        stats.failed++;
      }

      for (const event of webhook.events) {
        stats.byEvent[event] = (stats.byEvent[event] || 0) + 1;
      }
    }

    return stats;
  }
}

export const webhookManager = new WebhookManager();
