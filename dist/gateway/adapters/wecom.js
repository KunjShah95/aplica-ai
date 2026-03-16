export class WeComAdapter {
    router;
    corpId;
    corpSecret;
    agentId;
    token;
    encodingAesKey;
    accessToken;
    isRunning = false;
    constructor(options) {
        this.router = options.router;
        this.corpId = options.corpId;
        this.corpSecret = options.corpSecret;
        this.agentId = options.agentId;
        this.token = options.token;
        this.encodingAesKey = options.encodingAesKey;
    }
    async start() {
        console.log('WeCom (WeChat Work) adapter starting...');
        await this.refreshAccessToken();
        this.isRunning = true;
    }
    async stop() {
        this.isRunning = false;
    }
    async refreshAccessToken() {
        try {
            const url = `https://qyapi.weixin.qq.com/cgi-bin/gettoken?corpid=${this.corpId}&corpsecret=${this.corpSecret}`;
            const response = await fetch(url);
            const data = await response.json();
            if (data.errcode === 0) {
                this.accessToken = data.access_token;
                console.log('WeCom access token refreshed');
            }
            else {
                console.error('Failed to get WeCom access token:', data);
            }
        }
        catch (error) {
            console.error('Error refreshing WeCom token:', error);
        }
    }
    handleWebhook(query, body) {
        const msgSignature = query.msg_signature;
        const timestamp = query.timestamp;
        const nonce = query.nonce;
        const encryptedMsg = body.encrypt;
        if (!this.token) {
            return { status: 400, body: { error: 'Token not configured' } };
        }
        if (body.msgtype === 'text') {
            const userId = body.from_user_name;
            const content = body.content;
            this.processMessage(userId, content, body.msgid);
        }
        if (body.msgtype === 'event') {
            this.handleEvent(body);
        }
        return { status: 200, body: { msg: 'success' } };
    }
    verifyURL(msgSignature, timestamp, nonce, echostr) {
        if (!this.token)
            return '';
        const signature = this.generateSignature(timestamp, nonce, echostr);
        if (signature === msgSignature) {
            return echostr;
        }
        return '';
    }
    generateSignature(timestamp, nonce, ...params) {
        const sorted = [this.token, timestamp, nonce, ...params].sort();
        const str = sorted.join('');
        return '';
    }
    handleEvent(event) {
        const eventType = event.event;
        const userId = event.from_user_name;
        switch (eventType) {
            case 'subscribe':
                console.log(`User ${userId} subscribed to WeCom`);
                break;
            case 'unsubscribe':
                console.log(`User ${userId} unsubscribed from WeCom`);
                break;
            default:
                console.log(`WeCom event: ${eventType}`);
        }
    }
    async processMessage(userId, content, messageId) {
        try {
            await this.router.handleFromWebSocket(userId, content, `wecom:${messageId}`);
        }
        catch (error) {
            console.error('Failed to process WeCom message:', error);
        }
    }
    async sendMessage(toUser, content) {
        if (!this.accessToken) {
            console.error('No access token available');
            return;
        }
        const url = `https://qyapi.weixin.qq.com/cgi-bin/message/send?access_token=${this.accessToken}`;
        await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                touser: toUser,
                msgtype: 'text',
                agentid: this.agentId,
                text: { content },
            }),
        });
    }
    async sendMarkdown(toUser, content) {
        if (!this.accessToken)
            return;
        const url = `https://qyapi.weixin.qq.com/cgi-bin/message/send?access_token=${this.accessToken}`;
        await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                touser: toUser,
                msgtype: 'markdown',
                agentid: this.agentId,
                markdown: { content },
            }),
        });
    }
    isActive() {
        return this.isRunning;
    }
}
//# sourceMappingURL=wecom.js.map