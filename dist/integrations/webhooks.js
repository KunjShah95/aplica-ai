import { db } from '../db/index.js';
export class WebhookService {
    async create(data) {
        return db.webhook.create({
            data: {
                name: data.name,
                url: data.url,
                events: data.events,
                secret: data.secret,
                integrationId: data.integrationId,
            },
        });
    }
    async list(integrationId) {
        return db.webhook.findMany({
            where: { integrationId },
            orderBy: { createdAt: 'desc' },
        });
    }
    async get(id) {
        return db.webhook.findUnique({ where: { id } });
    }
    async update(id, data) {
        return db.webhook.update({
            where: { id },
            data,
        });
    }
    async delete(id) {
        return db.webhook.delete({ where: { id } });
    }
    async trigger(event, data) {
        const webhooks = await db.webhook.findMany({
            where: {
                isActive: true,
                events: { has: event },
            },
        });
        for (const webhook of webhooks) {
            this.send(webhook.id, webhook.url, webhook.secret, event, data).catch((error) => {
                console.error(`Webhook ${webhook.id} failed:`, error);
            });
        }
    }
    async send(webhookId, url, secret, event, data) {
        const payload = {
            event,
            timestamp: new Date().toISOString(),
            data,
        };
        const body = JSON.stringify(payload);
        const headers = {
            'Content-Type': 'application/json',
            'User-Agent': 'Alpicia-Webhook/1.0',
        };
        if (secret) {
            const { createHmac } = await import('crypto');
            const signature = createHmac('sha256', secret).update(body).digest('hex');
            headers['X-Webhook-Signature'] = `sha256=${signature}`;
        }
        try {
            const response = await fetch(url, {
                method: 'POST',
                headers,
                body,
                signal: AbortSignal.timeout(30000),
            });
            const responseData = await response.text();
            const success = response.ok;
            await db.webhookDelivery.create({
                data: {
                    webhookId,
                    event,
                    payload: payload,
                    statusCode: response.status,
                    response: responseData,
                    success,
                },
            });
            await db.webhook.update({
                where: { id: webhookId },
                data: { lastTriggeredAt: new Date() },
            });
            return {
                success,
                statusCode: response.status,
                response: responseData,
            };
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            await db.webhookDelivery.create({
                data: {
                    webhookId,
                    event,
                    payload: payload,
                    success: false,
                    error: errorMessage,
                },
            });
            return {
                success: false,
                error: errorMessage,
            };
        }
    }
    async getDeliveries(webhookId, limit = 20) {
        return db.webhookDelivery.findMany({
            where: { webhookId },
            orderBy: { createdAt: 'desc' },
            take: limit,
        });
    }
    async retry(deliveryId) {
        const delivery = await db.webhookDelivery.findUnique({
            where: { id: deliveryId },
            include: { webhook: true },
        });
        if (!delivery) {
            throw new Error('Delivery not found');
        }
        const payload = delivery.payload;
        return this.send(delivery.webhookId, delivery.webhook.url, delivery.webhook.secret, payload.event, payload.data);
    }
}
export const webhookService = new WebhookService();
//# sourceMappingURL=webhooks.js.map