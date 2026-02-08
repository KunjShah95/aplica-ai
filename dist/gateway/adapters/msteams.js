export class MSTeamsAdapter {
    tenantId;
    clientId;
    clientSecret;
    botId;
    router;
    isRunning = false;
    accessToken;
    tokenExpiry;
    constructor(options) {
        this.tenantId = options.tenantId;
        this.clientId = options.clientId;
        this.clientSecret = options.clientSecret;
        this.botId = options.botId;
        this.router = options.router;
    }
    async getAccessToken() {
        if (this.accessToken && this.tokenExpiry && Date.now() < this.tokenExpiry) {
            return this.accessToken;
        }
        try {
            const response = await fetch(`https://login.microsoftonline.com/${this.tenantId}/oauth2/v2.0/token`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
                body: new URLSearchParams({
                    client_id: this.clientId,
                    client_secret: this.clientSecret,
                    scope: 'https://api.botframework.com/.default',
                    grant_type: 'client_credentials',
                }),
            });
            if (!response.ok) {
                throw new Error(`Token request failed: ${response.statusText}`);
            }
            const data = (await response.json());
            this.accessToken = data.access_token || '';
            this.tokenExpiry = Date.now() + ((data.expires_in || 3600) - 60) * 1000;
            return this.accessToken;
        }
        catch (error) {
            console.error('Failed to get MS Teams access token:', error);
            throw error;
        }
    }
    async start() {
        if (this.isRunning) {
            console.log('Microsoft Teams adapter is already running');
            return;
        }
        this.isRunning = true;
        console.log('Microsoft Teams adapter started');
    }
    async stop() {
        if (!this.isRunning)
            return;
        this.isRunning = false;
        console.log('Microsoft Teams adapter stopped');
    }
    isActive() {
        return this.isRunning;
    }
    async handleActivity(activity) {
        try {
            const message = activity;
            if (message.text) {
                const response = await this.router.handleFromMSTeams(message.from.id, message.text);
                await this.sendMessage(message.conversation.id, response.content);
            }
        }
        catch (error) {
            console.error('Error handling MS Teams activity:', error);
        }
    }
    async sendMessage(conversationId, content) {
        try {
            const token = await this.getAccessToken();
            const response = await fetch(`https://smba.trafficmanager.net/apis/v3/conversations/${conversationId}/activities`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    type: 'message',
                    text: content,
                }),
            });
            if (!response.ok) {
                throw new Error(`MS Teams send failed: ${response.statusText}`);
            }
            const result = (await response.json());
            return result.id || null;
        }
        catch (error) {
            console.error('Failed to send MS Teams message:', error);
            return null;
        }
    }
    async createConversation(userId) {
        try {
            const token = await this.getAccessToken();
            const response = await fetch('https://smba.trafficmanager.net/apis/v3/conversations', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    bot: {
                        id: this.botId,
                    },
                    members: [
                        {
                            id: userId,
                        },
                    ],
                }),
            });
            if (!response.ok) {
                throw new Error(`MS Teams conversation creation failed: ${response.statusText}`);
            }
            const result = (await response.json());
            return result.id || null;
        }
        catch (error) {
            console.error('Failed to create MS Teams conversation:', error);
            return null;
        }
    }
}
//# sourceMappingURL=msteams.js.map