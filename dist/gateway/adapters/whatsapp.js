export class WhatsAppAdapter {
    router;
    phoneNumberId;
    accessToken;
    verifyToken;
    isRunning = false;
    constructor(options) {
        this.router = options.router;
        this.phoneNumberId = options.phoneNumberId;
        this.accessToken = options.accessToken;
        this.verifyToken = options.verifyToken || randomUUID();
    }
    async start() {
        console.log('WhatsApp adapter started');
        this.isRunning = true;
    }
    async stop() {
        this.isRunning = false;
    }
    handleWebhook(body) {
        if (body.object !== 'whatsapp_business_account') {
            return { status: 404, body: { error: 'Not a WhatsApp webhook' } };
        }
        for (const entry of body.entry || []) {
            for (const change of entry.changes || []) {
                const messages = change.value?.messages;
                if (messages) {
                    for (const msg of messages) {
                        this.processMessage(msg, change.value?.metadata);
                    }
                }
            }
        }
        return { status: 200, body: { status: 'ok' } };
    }
    handleVerify(mode, token) {
        if (mode === 'subscribe' && token === this.verifyToken) {
            return true;
        }
        return false;
    }
    async processMessage(message, metadata) {
        const from = message.from;
        const type = message.type;
        let content = '';
        switch (type) {
            case 'text':
                content = message.text.body;
                break;
            case 'image':
                content = `[Image: ${message.image?.mime_type}]`;
                break;
            case 'audio':
                content = '[Audio message]';
                break;
            case 'video':
                content = `[Video: ${message.video?.mime_type}]`;
                break;
            case 'document':
                content = `[Document: ${message.document?.filename}]`;
                break;
            case 'voice':
                content = '[Voice message]';
                break;
            case 'location':
                content = `[Location: ${message.location?.latitude}, ${message.location?.longitude}]`;
                break;
            default:
                content = `[${type} message]`;
        }
        try {
            await this.router.handleFromWhatsApp(from, content);
        }
        catch (error) {
            console.error('Failed to process WhatsApp message:', error);
        }
    }
    async sendMessage(to, content) {
        const url = `https://graph.facebook.com/v18.0/${this.phoneNumberId}/messages`;
        await fetch(url, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${this.accessToken}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                messaging_product: 'whatsapp',
                to,
                text: { body: content },
            }),
        });
    }
    isActive() {
        return this.isRunning;
    }
}
import { randomUUID } from 'crypto';
//# sourceMappingURL=whatsapp.js.map