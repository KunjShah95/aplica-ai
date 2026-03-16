export class SMSAdapter {
    router;
    accountSid;
    authToken;
    phoneNumber;
    isRunning = false;
    constructor(options) {
        this.router = options.router;
        this.accountSid = options.accountSid;
        this.authToken = options.authToken;
        this.phoneNumber = options.phoneNumber;
    }
    async start() {
        console.log('SMS (Twilio) adapter started');
        this.isRunning = true;
    }
    async stop() {
        this.isRunning = false;
    }
    handleWebhook(body) {
        const from = body.From;
        const bodyText = body.Body;
        const messageSid = body.MessageSid;
        if (!from || !bodyText) {
            return { status: 400, body: { error: 'Missing From or Body' } };
        }
        this.processMessage(from, bodyText, messageSid);
        return { status: 200, body: { status: 'received' } };
    }
    async processMessage(from, content, messageSid) {
        try {
            await this.router.handleFromWebSocket(from, content, `sms:${messageSid}`);
        }
        catch (error) {
            console.error('Failed to process SMS:', error);
        }
    }
    async sendMessage(to, content) {
        const url = `https://api.twilio.com/2010-04-01/Accounts/${this.accountSid}/Messages.json`;
        const auth = Buffer.from(`${this.accountSid}:${this.authToken}`).toString('base64');
        await fetch(url, {
            method: 'POST',
            headers: {
                'Authorization': `Basic ${auth}`,
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: new URLSearchParams({
                To: to,
                From: this.phoneNumber,
                Body: content,
            }),
        });
    }
    isActive() {
        return this.isRunning;
    }
}
//# sourceMappingURL=sms.js.map