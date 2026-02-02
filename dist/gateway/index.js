import { WebSocketServer, WebSocket } from 'ws';
export class GatewayServer {
    config;
    wss = null;
    connections = new Map();
    constructor(config) {
        this.config = config;
    }
    async start() {
        if (this.config.messaging.websocket?.enabled) {
            await this.startWebSocket();
        }
        console.log('📡 Gateway server started');
        console.log(`   WebSocket: ${this.config.messaging.websocket?.enabled ? `ws://localhost:${this.config.messaging.websocket.port}` : 'disabled'}`);
    }
    async startWebSocket() {
        const port = this.config.messaging.websocket?.port || 3001;
        this.wss = new WebSocketServer({ port });
        this.wss.on('connection', (ws) => {
            const id = crypto.randomUUID();
            this.connections.set(id, ws);
            console.log(`🔌 WebSocket client connected: ${id}`);
            ws.on('message', (data) => {
                this.handleMessage(id, data.toString());
            });
            ws.on('close', () => {
                console.log(`🔌 WebSocket client disconnected: ${id}`);
                this.connections.delete(id);
            });
            ws.on('error', (error) => {
                console.error(`WebSocket error for ${id}:`, error);
                this.connections.delete(id);
            });
            this.send(id, { type: 'connected', id });
        });
        console.log(`   WebSocket server listening on port ${port}`);
    }
    async handleMessage(_clientId, data) {
        try {
            const message = JSON.parse(data);
            switch (message.type) {
                case 'ping':
                    this.send(_clientId, { type: 'pong' });
                    break;
                case 'status':
                    this.send(_clientId, {
                        type: 'status',
                        connections: this.connections.size,
                        uptime: process.uptime()
                    });
                    break;
                default:
                    console.log(`Received from ${_clientId}:`, message);
            }
        }
        catch (error) {
            console.error('Error handling WebSocket message:', error);
        }
    }
    send(clientId, data) {
        const ws = this.connections.get(clientId);
        if (ws && ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify(data));
        }
    }
    broadcast(data) {
        const message = JSON.stringify(data);
        for (const ws of this.connections.values()) {
            if (ws.readyState === WebSocket.OPEN) {
                ws.send(message);
            }
        }
    }
    async stop() {
        for (const ws of this.connections.values()) {
            ws.close();
        }
        this.connections.clear();
        if (this.wss) {
            this.wss.close();
        }
    }
}
//# sourceMappingURL=index.js.map