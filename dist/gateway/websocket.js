import { WebSocketServer, WebSocket } from 'ws';
import { randomUUID } from 'crypto';
export class WebSocketGateway {
    server = null;
    agent;
    router;
    clients = new Map();
    userSessions = new Map();
    port;
    pingInterval = null;
    constructor(agent, router, options = {}) {
        this.agent = agent;
        this.router = router;
        this.port = options.port || 3001;
    }
    async start() {
        this.server = new WebSocketServer({ port: this.port });
        this.server.on('connection', (ws) => {
            this.handleConnection(ws);
        });
        this.startPingInterval();
        console.log(`🔌 WebSocket Gateway listening on port ${this.port}`);
    }
    handleConnection(ws) {
        const clientId = randomUUID();
        const client = {
            id: clientId,
            ws,
            userId: 'anonymous',
            connectedAt: new Date(),
            lastActivity: new Date(),
        };
        this.clients.set(clientId, client);
        console.log(`🔌 Client connected: ${clientId}`);
        this.send(clientId, {
            type: 'connected',
            payload: { clientId, serverTime: new Date().toISOString() },
            timestamp: new Date(),
        });
        ws.on('message', (data) => {
            this.handleMessage(clientId, data.toString());
        });
        ws.on('close', () => {
            this.handleDisconnect(clientId);
        });
        ws.on('error', (error) => {
            console.error(`WebSocket error for ${clientId}:`, error);
            this.handleDisconnect(clientId);
        });
    }
    async handleMessage(clientId, data) {
        const client = this.clients.get(clientId);
        if (!client)
            return;
        client.lastActivity = new Date();
        try {
            const message = JSON.parse(data);
            switch (message.type) {
                case 'auth':
                    await this.handleAuth(clientId, message.payload);
                    break;
                case 'message':
                    await this.handleChatMessage(clientId, message.payload);
                    break;
                case 'history':
                    await this.handleHistoryRequest(clientId, message.payload);
                    break;
                case 'status':
                    await this.handleStatusRequest(clientId);
                    break;
                case 'ping':
                    this.send(clientId, {
                        type: 'pong',
                        payload: { timestamp: Date.now() },
                        timestamp: new Date(),
                    });
                    break;
                default:
                    this.sendError(clientId, `Unknown message type: ${message.type}`);
            }
        }
        catch (error) {
            console.error(`Error handling message from ${clientId}:`, error);
            this.sendError(clientId, 'Invalid message format');
        }
    }
    async handleAuth(clientId, payload) {
        const client = this.clients.get(clientId);
        if (!client)
            return;
        const data = payload;
        if (data?.userId) {
            client.userId = data.userId;
            this.userSessions.set(data.userId, clientId);
            this.send(clientId, {
                type: 'auth',
                payload: { success: true, userId: data.userId },
                timestamp: new Date(),
            });
            console.log(`🔐 Client ${clientId} authenticated as ${data.userId}`);
        }
    }
    async handleChatMessage(clientId, payload) {
        const client = this.clients.get(clientId);
        if (!client)
            return;
        const data = payload;
        if (!data?.content) {
            this.sendError(clientId, 'Message content is required');
            return;
        }
        try {
            const response = await this.router.handleFromWebSocket(client.userId, data.content, data.conversationId);
            this.send(clientId, {
                type: 'message',
                payload: {
                    id: response.id,
                    content: response.content,
                    conversationId: response.conversationId,
                    tokensUsed: response.tokensUsed,
                },
                id: response.id,
                timestamp: response.timestamp,
            });
        }
        catch (error) {
            this.sendError(clientId, 'Failed to process message');
        }
    }
    async handleHistoryRequest(clientId, payload) {
        const data = payload;
        if (!data?.conversationId) {
            this.sendError(clientId, 'Conversation ID is required');
            return;
        }
        const history = await this.agent.getConversationHistory(data.conversationId);
        this.send(clientId, {
            type: 'history',
            payload: { conversationId: data.conversationId, messages: history },
            timestamp: new Date(),
        });
    }
    async handleStatusRequest(clientId) {
        const routerStats = this.router.getStats();
        this.send(clientId, {
            type: 'status',
            payload: {
                clients: this.clients.size,
                router: routerStats,
                uptime: process.uptime(),
                memory: process.memoryUsage(),
            },
            timestamp: new Date(),
        });
    }
    handleDisconnect(clientId) {
        const client = this.clients.get(clientId);
        if (client) {
            this.userSessions.delete(client.userId);
            this.clients.delete(clientId);
            console.log(`🔌 Client disconnected: ${clientId}`);
        }
    }
    send(clientId, response) {
        const client = this.clients.get(clientId);
        if (client && client.ws.readyState === WebSocket.OPEN) {
            client.ws.send(JSON.stringify(response));
        }
    }
    sendError(clientId, message) {
        this.send(clientId, {
            type: 'error',
            payload: { message },
            timestamp: new Date(),
        });
    }
    startPingInterval() {
        this.pingInterval = setInterval(() => {
            this.pingClients();
        }, 30000);
    }
    pingClients() {
        const now = new Date();
        for (const [clientId, client] of this.clients) {
            const inactiveTime = now.getTime() - client.lastActivity.getTime();
            if (inactiveTime > 60000) {
                this.handleDisconnect(clientId);
            }
            else {
                this.send(clientId, {
                    type: 'ping',
                    payload: { timestamp: now.toISOString() },
                    timestamp: now,
                });
            }
        }
    }
    broadcast(event, data) {
        const message = JSON.stringify({
            type: 'broadcast',
            event,
            payload: data,
            timestamp: new Date(),
        });
        for (const client of this.clients.values()) {
            if (client.ws.readyState === WebSocket.OPEN) {
                client.ws.send(message);
            }
        }
    }
    getStats() {
        return {
            clients: this.clients.size,
            uptime: process.uptime(),
        };
    }
    async stop() {
        if (this.pingInterval) {
            clearInterval(this.pingInterval);
        }
        for (const client of this.clients.values()) {
            client.ws.close();
        }
        this.clients.clear();
        this.userSessions.clear();
        if (this.server) {
            this.server.close();
        }
        console.log('🔌 WebSocket Gateway stopped');
    }
}
//# sourceMappingURL=websocket.js.map