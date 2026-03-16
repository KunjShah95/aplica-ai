export class LineAdapter {
    router;
    channelId;
    channelSecret;
    channelAccessToken;
    isRunning = false;
    constructor(options) {
        this.router = options.router;
        this.channelId = options.channelId;
        this.channelSecret = options.channelSecret;
        this.channelAccessToken = options.channelAccessToken;
    }
    async start() {
        console.log('LINE adapter started');
        this.isRunning = true;
    }
    async stop() {
        this.isRunning = false;
    }
    handleWebhook(body, signature) {
        const channelSecret = this.channelSecret;
        const hash = crypto
            .createHmac('SHA256', channelSecret)
            .update(JSON.stringify(body))
            .digest('base64');
        if (hash !== signature) {
            return { status: 401, body: { error: 'Invalid signature' } };
        }
        for (const event of body.events || []) {
            this.processEvent(event);
        }
        return { status: 200, body: { status: 'ok' } };
    }
    async processEvent(event) {
        if (event.type !== 'message')
            return;
        if (event.message.type !== 'text')
            return;
        const userId = event.source.userId;
        const content = event.message.text || '';
        const channelId = event.source.groupId || event.source.roomId || userId;
        try {
            await this.router.handleFromWebSocket(userId, content, channelId);
        }
        catch (error) {
            console.error('Failed to process LINE message:', error);
        }
    }
    async sendMessage(to, content) {
        await fetch('https://api.line.me/v2/bot/message/push', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${this.channelAccessToken}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                to,
                messages: [{ type: 'text', text: content }],
            }),
        });
    }
    async reply(replyToken, content) {
        await fetch('https://api.line.me/v2/bot/message/reply', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${this.channelAccessToken}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                replyToken,
                messages: [{ type: 'text', text: content }],
            }),
        });
    }
    isActive() {
        return this.isRunning;
    }
}
import crypto from 'crypto';
//# sourceMappingURL=line.js.map