export class QQAdapter {
    router;
    appId;
    token;
    secret;
    isRunning = false;
    constructor(options) {
        this.router = options.router;
        this.appId = options.appId;
        this.token = options.token;
        this.secret = options.secret;
    }
    async start() {
        console.log('QQ adapter started');
        this.isRunning = true;
    }
    async stop() {
        this.isRunning = false;
    }
    handleWebhook(body) {
        const channelId = body.channel_id;
        const guildId = body.guild_id;
        const userId = body.author?.id;
        const messageId = body.id;
        const content = body.content;
        if (!userId || !content) {
            return { status: 400, body: { error: 'Invalid message' } };
        }
        this.processMessage(userId, content, guildId || channelId, messageId);
        return { status: 200, body: { msg: 'success' } };
    }
    handleDirectMessage(body) {
        const userId = body.user_id;
        const messageId = body.message_id;
        const content = body.content || body.message?.content;
        if (!userId) {
            return { status: 400, body: { error: 'Invalid DM' } };
        }
        this.processMessage(userId, content || '[Message]', 'dm', messageId);
        return { status: 200, body: { msg: 'success' } };
    }
    async processMessage(userId, content, chatId, messageId) {
        try {
            await this.router.handleFromWebSocket(userId, content, `qq:${chatId}`);
        }
        catch (error) {
            console.error('Failed to process QQ message:', error);
        }
    }
    async sendMessage(targetId, content) {
        console.log(`Sending to QQ ${targetId}: ${content}`);
    }
    async sendDirectMessage(userId, content) {
        console.log(`Sending DM to QQ ${userId}: ${content}`);
    }
    isActive() {
        return this.isRunning;
    }
}
//# sourceMappingURL=qq.js.map