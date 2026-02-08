import { randomUUID } from 'crypto';
import { WebSocketServer, WebSocket } from 'ws';
import { createServer } from 'https';
import { readFileSync } from 'fs';
export class ControlUIServer {
    config;
    server;
    wss;
    connections = new Map();
    dashboards = new Map();
    eventHistory = [];
    maxHistory;
    listeners = new Set();
    constructor(config, maxHistory = 1000) {
        this.config = {
            port: config?.port ?? 18790,
            https: config?.https ?? false,
            certificate: config?.certificate,
            key: config?.key,
            password: config?.password,
            authEnabled: config?.authEnabled ?? true,
        };
        this.maxHistory = maxHistory;
        this.createDefaultDashboard();
    }
    createDefaultDashboard() {
        const dashboard = {
            id: 'default',
            name: 'Main Dashboard',
            theme: 'dark',
            refreshInterval: 5000,
            widgets: [
                {
                    id: 'stats-1',
                    type: 'stats',
                    title: 'System Stats',
                    position: { x: 0, y: 0 },
                    size: { width: 4, height: 2 },
                    config: {},
                },
                {
                    id: 'channels-1',
                    type: 'channels',
                    title: 'Channels',
                    position: { x: 4, y: 0 },
                    size: { width: 4, height: 2 },
                    config: {},
                },
                {
                    id: 'health-1',
                    type: 'health',
                    title: 'Health',
                    position: { x: 8, y: 0 },
                    size: { width: 4, height: 2 },
                    config: {},
                },
                {
                    id: 'activity-1',
                    type: 'activity',
                    title: 'Recent Activity',
                    position: { x: 0, y: 2 },
                    size: { width: 6, height: 3 },
                    config: {},
                },
                {
                    id: 'usage-1',
                    type: 'usage',
                    title: 'Usage',
                    position: { x: 6, y: 2 },
                    size: { width: 6, height: 3 },
                    config: {},
                },
            ],
        };
        this.dashboards.set(dashboard.id, dashboard);
    }
    async start() {
        return new Promise((resolve, reject) => {
            if (this.config.https && this.config.certificate && this.config.key) {
                const https = createServer({
                    cert: readFileSync(this.config.certificate),
                    key: readFileSync(this.config.key),
                    requestCert: false,
                }, (req, res) => {
                    this.handleRequest(req, res);
                });
                this.server = https;
            }
            else {
                this.server = createServer((req, res) => {
                    this.handleRequest(req, res);
                });
            }
            this.wss = new WebSocketServer({ server: this.server });
            this.wss.on('connection', (ws, req) => {
                this.handleConnection(ws, req);
            });
            this.server.on('error', reject);
            this.server.listen(this.config.port, () => {
                console.log(`Control UI started on port ${this.config.port}`);
                resolve();
            });
        });
    }
    handleRequest(req, res) {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
            status: 'ok',
            version: '1.0.0',
            endpoints: [
                'GET /api/status',
                'GET /api/channels',
                'GET /api/stats',
                'GET /api/events',
                'POST /api/gateway/restart',
                'WS /ws',
            ],
        }));
    }
    handleConnection(ws, req) {
        const connectionId = randomUUID();
        this.connections.set(connectionId, ws);
        ws.on('message', (data) => {
            try {
                const message = JSON.parse(data.toString());
                this.handleMessage(connectionId, ws, message);
            }
            catch (error) {
                console.error('Invalid message received:', error);
            }
        });
        ws.on('close', () => {
            this.connections.delete(connectionId);
        });
        ws.on('error', (error) => {
            console.error('WebSocket error:', error);
            this.connections.delete(connectionId);
        });
        ws.send(JSON.stringify({
            type: 'connected',
            connectionId,
            timestamp: new Date(),
        }));
    }
    handleMessage(connectionId, ws, message) {
        switch (message.type) {
            case 'auth':
                this.handleAuth(connectionId, ws, message);
                break;
            case 'subscribe':
                this.handleSubscribe(connectionId, message);
                break;
            case 'unsubscribe':
                this.handleUnsubscribe(connectionId, message);
                break;
            case 'action':
                this.handleAction(connectionId, message);
                break;
            case 'ping':
                ws.send(JSON.stringify({ type: 'pong', timestamp: new Date() }));
                break;
        }
    }
    handleAuth(connectionId, ws, message) {
        if (!this.config.authEnabled) {
            ws.send(JSON.stringify({ type: 'auth_success', connectionId }));
            return;
        }
        if (message.password === this.config.password) {
            ws.send(JSON.stringify({ type: 'auth_success', connectionId }));
        }
        else {
            ws.send(JSON.stringify({ type: 'auth_error', error: 'Invalid password' }));
            ws.close();
        }
    }
    subscriptions = new Map();
    handleSubscribe(connectionId, message) {
        const topics = message.topics;
        if (!topics)
            return;
        if (!this.subscriptions.has(connectionId)) {
            this.subscriptions.set(connectionId, new Set());
        }
        for (const topic of topics) {
            this.subscriptions.get(connectionId).add(topic);
        }
    }
    handleUnsubscribe(connectionId, message) {
        const topics = message.topics;
        if (!topics)
            return;
        const subs = this.subscriptions.get(connectionId);
        if (subs) {
            for (const topic of topics) {
                subs.delete(topic);
            }
        }
    }
    handleAction(connectionId, message) {
        const action = message.action;
        const payload = message.payload;
        this.recordEvent('user_action', { action, payload, connectionId });
        switch (action) {
            case 'gateway_restart':
                this.emit({ type: 'gateway_restart', timestamp: new Date(), data: { connectionId } });
                break;
            case 'channel_enable':
                this.emit({ type: 'channel_enable', timestamp: new Date(), data: payload });
                break;
            case 'channel_disable':
                this.emit({ type: 'channel_disable', timestamp: new Date(), data: payload });
                break;
            case 'skill_install':
                this.emit({ type: 'skill_install', timestamp: new Date(), data: payload });
                break;
            case 'skill_uninstall':
                this.emit({ type: 'skill_uninstall', timestamp: new Date(), data: payload });
                break;
            case 'config_update':
                this.emit({ type: 'config_update', timestamp: new Date(), data: payload });
                break;
        }
        this.broadcast({
            type: 'action_result',
            action,
            success: true,
            timestamp: new Date(),
        }, connectionId);
    }
    recordEvent(type, data) {
        const event = {
            type,
            timestamp: new Date(),
            data,
        };
        this.eventHistory.push(event);
        if (this.eventHistory.length > this.maxHistory) {
            this.eventHistory = this.eventHistory.slice(-this.maxHistory);
        }
    }
    broadcast(message, excludeConnectionId) {
        const data = JSON.stringify(message);
        for (const [connectionId, ws] of this.connections.entries()) {
            if (connectionId === excludeConnectionId)
                continue;
            if (ws.readyState === WebSocket.OPEN) {
                ws.send(data);
            }
        }
    }
    broadcastEvent(event) {
        this.broadcast({
            type: 'event',
            eventType: event.type,
            timestamp: event.timestamp,
            data: event.data,
        });
    }
    emit(event) {
        this.recordEvent(event.type, event.data);
        this.broadcastEvent(event);
        for (const listener of this.listeners) {
            listener(event);
        }
    }
    on(listener) {
        this.listeners.add(listener);
        return () => this.listeners.delete(listener);
    }
    getDashboards() {
        return Array.from(this.dashboards.values());
    }
    getDashboard(id) {
        return this.dashboards.get(id);
    }
    updateDashboard(id, updates) {
        const dashboard = this.dashboards.get(id);
        if (!dashboard)
            return null;
        const updated = { ...dashboard, ...updates };
        this.dashboards.set(id, updated);
        return updated;
    }
    getEvents(limit) {
        if (limit) {
            return this.eventHistory.slice(-limit);
        }
        return [...this.eventHistory];
    }
    getStats() {
        return {
            connections: this.connections.size,
            events: this.eventHistory.length,
            dashboards: this.dashboards.size,
            uptime: process.uptime(),
        };
    }
    async stop() {
        for (const ws of this.connections.values()) {
            ws.close();
        }
        this.connections.clear();
        if (this.wss) {
            this.wss.close();
        }
        if (this.server) {
            await new Promise((resolve) => {
                this.server.close(() => resolve());
            });
        }
        console.log('Control UI stopped');
    }
}
export const controlUI = new ControlUIServer();
//# sourceMappingURL=control-ui.js.map