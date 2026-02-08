import { WebSocketServer, WebSocket } from 'ws';
import { randomUUID } from 'crypto';
export class WebChatAdapter {
    port;
    router;
    isRunning = false;
    wss;
    connections = new Map();
    userConversations = new Map();
    constructor(options) {
        this.port = options.port;
        this.router = options.router;
    }
    setupWebSocket() {
        this.wss = new WebSocketServer({ port: this.port });
        this.wss.on('connection', (ws) => {
            const connectionId = randomUUID();
            this.connections.set(connectionId, ws);
            ws.on('message', async (data) => {
                try {
                    const message = JSON.parse(data.toString());
                    await this.handleMessage(connectionId, ws, message);
                }
                catch (error) {
                    console.error('Error parsing WebChat message:', error);
                }
            });
            ws.on('close', () => {
                this.connections.delete(connectionId);
            });
            ws.on('error', (error) => {
                console.error('WebChat connection error:', error);
                this.connections.delete(connectionId);
            });
            ws.send(JSON.stringify({
                type: 'connected',
                connectionId,
                timestamp: new Date(),
            }));
        });
        this.wss.on('error', (error) => {
            console.error('WebSocket server error:', error);
        });
    }
    async handleMessage(connectionId, ws, message) {
        switch (message.type) {
            case 'message':
                await this.handleChatMessage(connectionId, ws, message);
                break;
            case 'typing':
                await this.handleTyping(connectionId, message);
                break;
            case 'presence':
                await this.handlePresence(connectionId, message);
                break;
        }
    }
    async handleChatMessage(connectionId, ws, message) {
        const userId = message.userId;
        const content = message.content || '';
        let conversationId = message.conversationId || this.userConversations.get(userId);
        if (!content)
            return;
        try {
            const response = await this.router.handleFromWebChat(userId, content, conversationId);
            if (!conversationId) {
                this.userConversations.set(userId, response.conversationId);
                conversationId = response.conversationId;
            }
            ws.send(JSON.stringify({
                type: 'message',
                userId: 'assistant',
                conversationId: response.conversationId,
                content: response.content,
                timestamp: response.timestamp,
            }));
        }
        catch (error) {
            console.error('Error handling WebChat message:', error);
            ws.send(JSON.stringify({
                type: 'error',
                message: 'Failed to process message',
                timestamp: new Date(),
            }));
        }
    }
    async handleTyping(connectionId, message) {
        const userId = message.userId;
        const conversationId = this.userConversations.get(userId);
        if (!conversationId)
            return;
        this.wsSendToUser(userId, JSON.stringify({
            type: 'typing',
            userId: message.userId,
            conversationId,
            timestamp: new Date(),
        }));
    }
    async handlePresence(connectionId, message) {
        this.wsSendToUser(message.userId, JSON.stringify({
            type: 'presence',
            userId: message.userId,
            status: 'online',
            timestamp: new Date(),
        }));
    }
    wsSendToUser(userId, data) {
        for (const [connectionId, ws] of this.connections.entries()) {
            if (ws.readyState === WebSocket.OPEN) {
                ws.send(data);
            }
        }
    }
    async start() {
        if (this.isRunning) {
            console.log('WebChat adapter is already running');
            return;
        }
        this.setupWebSocket();
        this.isRunning = true;
        console.log(`WebChat adapter started on port ${this.port}`);
    }
    async stop() {
        if (!this.isRunning)
            return;
        this.wss?.close();
        this.connections.clear();
        this.isRunning = false;
        console.log('WebChat adapter stopped');
    }
    isActive() {
        return this.isRunning;
    }
    async broadcastToAll(message) {
        const data = JSON.stringify(message);
        for (const ws of this.connections.values()) {
            if (ws.readyState === WebSocket.OPEN) {
                ws.send(data);
            }
        }
    }
    async sendToUser(userId, message) {
        const data = JSON.stringify(message);
        for (const [connectionId, ws] of this.connections.entries()) {
            if (ws.readyState === WebSocket.OPEN) {
                ws.send(data);
            }
        }
    }
    getConnectionCount() {
        return this.connections.size;
    }
}
//# sourceMappingURL=webchat.js.map