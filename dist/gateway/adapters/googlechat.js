export class GoogleChatAdapter {
    projectId;
    location;
    subscriptionId;
    router;
    isRunning = false;
    messageCallback;
    constructor(options) {
        this.projectId = options.projectId;
        this.location = options.location;
        this.subscriptionId = options.subscriptionId;
        this.router = options.router;
    }
    setupPubSub() {
        const { PubSub } = require('@google-cloud/pubsub');
        const pubSubClient = new PubSub({ projectId: this.projectId });
        const subscriptionName = `projects/${this.projectId}/locations/${this.location}/subscriptions/${this.subscriptionId}`;
        const subscription = pubSubClient.subscription(subscriptionName);
        const messageHandler = (message) => {
            try {
                const data = JSON.parse(message.data.toString('base64'));
                const googleChatMessage = data;
                if (googleChatMessage.message?.text) {
                    this.handleMessage(googleChatMessage);
                }
                message.ack();
            }
            catch (error) {
                console.error('Error processing Google Chat message:', error);
                message.nack();
            }
        };
        subscription.on('message', messageHandler);
        subscription.on('error', (error) => {
            console.error('Google Chat PubSub error:', error);
        });
    }
    async handleMessage(chatMessage) {
        const userId = chatMessage.sender.name;
        const content = chatMessage.message.text;
        const spaceId = chatMessage.space.name;
        const threadId = chatMessage.thread?.name;
        if (!content)
            return;
        try {
            const response = await this.router.handleFromGoogleChat(userId, content);
            await this.sendMessage(spaceId, response.content, threadId);
        }
        catch (error) {
            console.error('Error handling Google Chat message:', error);
        }
    }
    async start() {
        if (this.isRunning) {
            console.log('Google Chat adapter is already running');
            return;
        }
        this.setupPubSub();
        this.isRunning = true;
        console.log('Google Chat adapter started');
    }
    async stop() {
        if (!this.isRunning)
            return;
        this.isRunning = false;
        console.log('Google Chat adapter stopped');
    }
    isActive() {
        return this.isRunning;
    }
    async sendMessage(spaceId, content, threadId) {
        try {
            const spaceName = spaceId.replace('spaces/', '');
            const response = await fetch(`https://chat.googleapis.com/v1/spaces/${spaceName}/messages`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    text: content,
                    thread: threadId ? { name: threadId } : undefined,
                }),
            });
            if (!response.ok) {
                throw new Error(`Google Chat send failed: ${response.statusText}`);
            }
            const result = (await response.json());
            return result.name || null;
        }
        catch (error) {
            console.error('Failed to send Google Chat message:', error);
            return null;
        }
    }
    async createSpace(name) {
        try {
            const response = await fetch('https://chat.googleapis.com/v1/spaces', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    displayName: name,
                }),
            });
            if (!response.ok) {
                throw new Error(`Google Chat space creation failed: ${response.statusText}`);
            }
            const result = (await response.json());
            return result.name || null;
        }
        catch (error) {
            console.error('Failed to create Google Chat space:', error);
            return null;
        }
    }
}
//# sourceMappingURL=googlechat.js.map