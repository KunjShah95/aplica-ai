import { randomBytes } from 'crypto';
export class WebhookService {
    subscriptions = new Map();
    deliveries = new Map();
    config;
    constructor(config = {}) {
        this.config = {
            signatureHeader: 'x-webhook-signature',
            timestampHeader: 'x-webhook-timestamp',
            tolerance: 300,
            ...config,
        };
    }
    createSubscription(url, events, secret) {
        const subscription = {
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
    getSubscription(id) {
        return this.subscriptions.get(id);
    }
    getAllSubscriptions() {
        return Array.from(this.subscriptions.values());
    }
    getSubscriptionsForEvent(event) {
        return Array.from(this.subscriptions.values()).filter((sub) => sub.active && sub.events.includes(event));
    }
    updateSubscription(id, updates) {
        const subscription = this.subscriptions.get(id);
        if (!subscription)
            return null;
        const updated = { ...subscription, ...updates };
        this.subscriptions.set(id, updated);
        return updated;
    }
    deleteSubscription(id) {
        this.deliveries.delete(id);
        return this.subscriptions.delete(id);
    }
    async trigger(event, data) {
        const subscriptions = this.getSubscriptionsForEvent(event);
        const deliveries = [];
        for (const subscription of subscriptions) {
            const delivery = await this.sendWebhook(subscription, event, data);
            deliveries.push(delivery);
        }
        return deliveries;
    }
    async sendWebhook(subscription, event, data) {
        const delivery = {
            id: this.generateId(),
            webhookId: subscription.id,
            event,
            payload: data,
            status: 'pending',
            attemptCount: 0,
            createdAt: new Date(),
        };
        const payload = {
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
                    [this.config.signatureHeader]: signature,
                    [this.config.timestampHeader]: timestamp,
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
            }
            else {
                delivery.status = 'failed';
                delivery.error = `HTTP ${response.status}: ${response.statusText}`;
                delivery.response = await response.text().catch(() => '');
                subscription.failureCount++;
            }
        }
        catch (error) {
            delivery.status = 'failed';
            delivery.error = error.message;
            delivery.attemptCount++;
            subscription.failureCount++;
        }
        if (!this.deliveries.has(subscription.id)) {
            this.deliveries.set(subscription.id, []);
        }
        this.deliveries.get(subscription.id).push(delivery);
        if (subscription.failureCount >= 5) {
            subscription.active = false;
        }
        return delivery;
    }
    async retryFailedDeliveries() {
        let retried = 0;
        for (const subscription of this.subscriptions.values()) {
            const subsDeliveries = this.deliveries.get(subscription.id) || [];
            const failedDeliveries = subsDeliveries.filter((d) => d.status === 'failed' && d.attemptCount < 3);
            for (const delivery of failedDeliveries) {
                await this.sendWebhook(subscription, delivery.event, delivery.payload);
                retried++;
            }
        }
        return retried;
    }
    getDeliveries(subscriptionId, options) {
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
    verifySignature(payload, signature, secret) {
        const expected = this.generateSignature(payload, secret);
        return this.secureCompare(signature, expected);
    }
    generateSignature(payload, secret) {
        const crypto = require('crypto');
        return crypto.createHmac('sha256', secret).update(payload).digest('hex');
    }
    secureCompare(a, b) {
        if (a.length !== b.length)
            return false;
        return require('crypto').timingSafeEqual(Buffer.from(a), Buffer.from(b));
    }
    generateId() {
        return randomBytes(16).toString('hex');
    }
    generateSecret() {
        return randomBytes(32).toString('hex');
    }
    async ping(url, secret) {
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
                    [this.config.signatureHeader]: signature,
                    [this.config.timestampHeader]: timestamp,
                },
                body: payload,
            });
            const latency = Date.now() - start;
            return {
                success: response.ok,
                latency,
            };
        }
        catch (error) {
            return {
                success: false,
                error: error.message,
            };
        }
    }
    getStats() {
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
//# sourceMappingURL=webhooks.js.map