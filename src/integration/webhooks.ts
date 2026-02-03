import { randomBytes } from 'crypto';

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

export class WebhookService {
  private subscriptions: Map<string, WebhookSubscription> = new Map();
  private deliveries: Map<string, WebhookDelivery[]> = new Map();
  private config: WebhookConfig;

  constructor(config: WebhookConfig = {}) {
    this.config = {
      signatureHeader: 'x-webhook-signature',
      timestampHeader: 'x-webhook-timestamp',
      tolerance: 300,
      ...config,
    };
  }

  createSubscription(url: string, events: string[], secret?: string): WebhookSubscription {
    const subscription: WebhookSubscription = {
      id: this.generateId(),
      url,
      events,
      secret: secret || this.generateSecret(),
      active: true,
      createdAt: new Date(),
      failureCount: 0,
    };

    this.subscriptions.set(subscription.id, subscription);
    return subscription;
  }

  getSubscription(id: string): WebhookSubscription | undefined {
    return this.subscriptions.get(id);
  }

  getAllSubscriptions(): WebhookSubscription[] {
    return Array.from(this.subscriptions.values());
  }

  getSubscriptionsForEvent(event: string): WebhookSubscription[] {
    return Array.from(this.subscriptions.values()).filter(
      (sub) => sub.active && sub.events.includes(event)
    );
  }

  updateSubscription(
    id: string,
    updates: Partial<WebhookSubscription>
  ): WebhookSubscription | null {
    const subscription = this.subscriptions.get(id);
    if (!subscription) return null;

    const updated = { ...subscription, ...updates };
    this.subscriptions.set(id, updated);
    return updated;
  }

  deleteSubscription(id: string): boolean {
    this.deliveries.delete(id);
    return this.subscriptions.delete(id);
  }

  async trigger(event: string, data: any): Promise<WebhookDelivery[]> {
    const subscriptions = this.getSubscriptionsForEvent(event);
    const deliveries: WebhookDelivery[] = [];

    for (const subscription of subscriptions) {
      const delivery = await this.sendWebhook(subscription, event, data);
      deliveries.push(delivery);
    }

    return deliveries;
  }

  private async sendWebhook(
    subscription: WebhookSubscription,
    event: string,
    data: any
  ): Promise<WebhookDelivery> {
    const delivery: WebhookDelivery = {
      id: this.generateId(),
      webhookId: subscription.id,
      event,
      payload: data,
      status: 'pending',
      attemptCount: 0,
      createdAt: new Date(),
    };

    const payload: WebhookPayload = {
      id: delivery.id,
      event,
      timestamp: Date.now(),
      data,
    };

    const signature = this.generateSignature(JSON.stringify(payload), subscription.secret);
    const timestamp = Date.now().toString();

    try {
      const response = await fetch(subscription.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          [this.config.signatureHeader!]: signature,
          [this.config.timestampHeader!]: timestamp,
          'X-Webhook-Id': subscription.id,
          'X-Webhook-Event': event,
        },
        body: JSON.stringify(payload),
      });

      delivery.statusCode = response.status;
      delivery.attemptCount++;
      delivery.deliveredAt = new Date();

      if (response.ok) {
        delivery.status = 'success';
        delivery.response = await response.text().catch(() => '');
        subscription.failureCount = 0;
        subscription.lastTriggeredAt = new Date();
      } else {
        delivery.status = 'failed';
        delivery.error = `HTTP ${response.status}: ${response.statusText}`;
        delivery.response = await response.text().catch(() => '');
        subscription.failureCount++;
      }
    } catch (error: any) {
      delivery.status = 'failed';
      delivery.error = error.message;
      delivery.attemptCount++;
      subscription.failureCount++;
    }

    if (!this.deliveries.has(subscription.id)) {
      this.deliveries.set(subscription.id, []);
    }
    this.deliveries.get(subscription.id)!.push(delivery);

    if (subscription.failureCount >= 5) {
      subscription.active = false;
    }

    return delivery;
  }

  async retryFailedDeliveries(): Promise<number> {
    let retried = 0;

    for (const subscription of this.subscriptions.values()) {
      const subsDeliveries = this.deliveries.get(subscription.id) || [];
      const failedDeliveries = subsDeliveries.filter(
        (d) => d.status === 'failed' && d.attemptCount < 3
      );

      for (const delivery of failedDeliveries) {
        await this.sendWebhook(subscription, delivery.event, delivery.payload);
        retried++;
      }
    }

    return retried;
  }

  getDeliveries(
    subscriptionId: string,
    options?: { limit?: number; status?: string }
  ): WebhookDelivery[] {
    const deliveries = this.deliveries.get(subscriptionId) || [];
    let filtered = deliveries;

    if (options?.status) {
      filtered = filtered.filter((d) => d.status === options.status);
    }

    if (options?.limit) {
      filtered = filtered.slice(0, options.limit);
    }

    return filtered.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  verifySignature(payload: string, signature: string, secret: string): boolean {
    const expected = this.generateSignature(payload, secret);
    return this.secureCompare(signature, expected);
  }

  private generateSignature(payload: string, secret: string): string {
    const crypto = require('crypto');
    return crypto.createHmac('sha256', secret).update(payload).digest('hex');
  }

  private secureCompare(a: string, b: string): boolean {
    if (a.length !== b.length) return false;
    return require('crypto').timingSafeEqual(Buffer.from(a), Buffer.from(b));
  }

  private generateId(): string {
    return randomBytes(16).toString('hex');
  }

  private generateSecret(): string {
    return randomBytes(32).toString('hex');
  }

  async ping(
    url: string,
    secret: string
  ): Promise<{ success: boolean; latency?: number; error?: string }> {
    const payload = JSON.stringify({
      event: 'ping',
      timestamp: Date.now(),
    });

    const signature = this.generateSignature(payload, secret);
    const timestamp = Date.now().toString();

    const start = Date.now();

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          [this.config.signatureHeader!]: signature,
          [this.config.timestampHeader!]: timestamp,
        },
        body: payload,
      });

      const latency = Date.now() - start;

      return {
        success: response.ok,
        latency,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  getStats(): {
    totalSubscriptions: number;
    activeSubscriptions: number;
    totalDeliveries: number;
    successRate: number;
    recentDeliveries: WebhookDelivery[];
  } {
    const subscriptions = Array.from(this.subscriptions.values());
    const allDeliveries = Array.from(this.deliveries.values()).flat();

    const successDeliveries = allDeliveries.filter((d) => d.status === 'success');
    const totalDeliveries = allDeliveries.length;

    return {
      totalSubscriptions: subscriptions.length,
      activeSubscriptions: subscriptions.filter((s) => s.active).length,
      totalDeliveries,
      successRate: totalDeliveries > 0 ? (successDeliveries.length / totalDeliveries) * 100 : 100,
      recentDeliveries: allDeliveries
        .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
        .slice(0, 10),
    };
  }
}

export const webhookService = new WebhookService();
