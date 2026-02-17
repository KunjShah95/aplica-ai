import { randomUUID } from 'crypto';
import { EventEmitter } from 'events';
import * as http from 'http';
export class ClusterManager extends EventEmitter {
    config;
    nodes = new Map();
    httpServer = null;
    gossipSocket = null;
    isRunning = false;
    messageHandlers = new Map();
    constructor(config) {
        super();
        this.config = {
            nodeId: config.nodeId || randomUUID(),
            host: config.host || 'localhost',
            port: config.port || 3000,
            seeds: config.seeds || [],
            gossipPort: config.gossipPort || 30001,
            healthCheckInterval: config.healthCheckInterval || 5000,
        };
    }
    async start() {
        if (this.isRunning)
            return;
        console.log(`Starting cluster node: ${this.config.nodeId}`);
        await this.startHttpServer();
        await this.startGossip();
        await this.joinSeeds();
        this.startHealthChecks();
        this.isRunning = true;
        console.log(`Cluster node ${this.config.nodeId} is online`);
        this.emit('started');
    }
    async stop() {
        if (!this.isRunning)
            return;
        console.log(`Stopping cluster node: ${this.config.nodeId}`);
        await this.leaveCluster();
        if (this.httpServer) {
            await new Promise((resolve) => this.httpServer?.close(() => resolve()));
            this.httpServer = null;
        }
        this.isRunning = false;
        console.log(`Cluster node ${this.config.nodeId} is offline`);
        this.emit('stopped');
    }
    async startHttpServer() {
        this.httpServer = http.createServer(async (req, res) => {
            if (req.url === '/cluster/health') {
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({
                    nodeId: this.config.nodeId,
                    status: 'healthy',
                    nodes: this.getNodes().length,
                }));
            }
            else if (req.url === '/cluster/state') {
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify(this.getClusterState()));
            }
            else if (req.url?.startsWith('/cluster/forward')) {
                await this.handleForwardRequest(req, res);
            }
            else {
                res.writeHead(404);
                res.end();
            }
        });
        await new Promise((resolve) => {
            this.httpServer?.listen(this.config.port, resolve);
        });
    }
    async handleForwardRequest(req, res) {
        let body = '';
        req.on('data', (chunk) => (body += chunk));
        req.on('end', async () => {
            try {
                const data = JSON.parse(body);
                const result = await this.routeRequest(data);
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify(result));
            }
            catch (error) {
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: error.message }));
            }
        });
    }
    async startGossip() {
        console.log(`Gossip protocol initialized on port ${this.config.gossipPort}`);
    }
    async joinSeeds() {
        for (const seed of this.config.seeds) {
            try {
                await this.connectToNode(seed);
            }
            catch (error) {
                console.warn(`Failed to connect to seed ${seed}:`, error);
            }
        }
    }
    async connectToNode(address) {
        const [host, port] = address.split(':');
        const node = {
            id: randomUUID(),
            host,
            port: parseInt(port),
            status: 'joining',
            role: 'replica',
            load: 0,
            memory: 0,
            lastSeen: new Date(),
            capabilities: [],
        };
        this.nodes.set(node.id, node);
        console.log(`Connecting to cluster node: ${address}`);
    }
    startHealthChecks() {
        setInterval(async () => {
            for (const [id, node] of this.nodes) {
                try {
                    const controller = new AbortController();
                    const timeoutId = setTimeout(() => controller.abort(), 5000);
                    const response = await fetch(`http://${node.host}:${node.port}/cluster/health`, {
                        method: 'GET',
                        signal: controller.signal,
                    });
                    clearTimeout(timeoutId);
                    if (response.ok) {
                        node.lastSeen = new Date();
                        node.status = 'online';
                    }
                    else {
                        node.status = 'offline';
                    }
                }
                catch {
                    node.status = 'offline';
                }
            }
            this.emit('healthCheck', this.getClusterState());
        }, this.config.healthCheckInterval);
    }
    async broadcast(type, payload) {
        const message = {
            id: randomUUID(),
            type: 'broadcast',
            from: this.config.nodeId,
            payload: { type, data: payload },
            timestamp: new Date(),
        };
        const onlineNodes = Array.from(this.nodes.values()).filter((n) => n.status === 'online');
        await Promise.all(onlineNodes.map((node) => this.sendToNode(node.id, message)));
    }
    async sendToNode(nodeId, message) {
        const node = this.nodes.get(nodeId);
        if (!node || node.status !== 'online') {
            throw new Error(`Node ${nodeId} is not available`);
        }
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 10000);
            const response = await fetch(`http://${node.host}:${node.port}/cluster/forward`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(message),
                signal: controller.signal,
            });
            clearTimeout(timeoutId);
            if (!response.ok) {
                throw new Error(`Failed to send to node: ${response.statusText}`);
            }
        }
        catch (error) {
            console.error(`Error sending to node ${nodeId}:`, error);
            throw error;
        }
    }
    async routeRequest(data) {
        const handler = this.messageHandlers.get(data.type);
        if (!handler) {
            throw new Error(`No handler for message type: ${data.type}`);
        }
        return handler(data);
    }
    registerHandler(type, handler) {
        this.messageHandlers.set(type, handler);
    }
    async leaveCluster() {
        const message = {
            id: randomUUID(),
            type: 'gossip',
            from: this.config.nodeId,
            payload: { action: 'leave' },
            timestamp: new Date(),
        };
        const onlineNodes = Array.from(this.nodes.values()).filter((n) => n.status === 'online');
        await Promise.allSettled(onlineNodes.map((node) => this.sendToNode(node.id, message)));
        this.nodes.clear();
    }
    getNodes() {
        return Array.from(this.nodes.values());
    }
    getNode(nodeId) {
        return this.nodes.get(nodeId);
    }
    getPrimaryNode() {
        return Array.from(this.nodes.values()).find((n) => n.role === 'primary' && n.status === 'online');
    }
    getClusterState() {
        const nodes = this.getNodes();
        return {
            nodeId: this.config.nodeId,
            status: this.isRunning ? 'online' : 'offline',
            nodes,
            totalNodes: nodes.length,
            onlineNodes: nodes.filter((n) => n.status === 'online').length,
        };
    }
    isLeader() {
        const primaries = Array.from(this.nodes.values()).filter((n) => n.role === 'primary' && n.status === 'online');
        return primaries.length === 0 || primaries[0].id === this.config.nodeId;
    }
    getLoad() {
        return process.memoryUsage().heapUsed / process.memoryUsage().heapTotal;
    }
}
export class DistributedLock {
    cluster;
    locks = new Map();
    constructor(cluster) {
        this.cluster = cluster;
    }
    async acquire(resource, owner, ttlMs = 30000) {
        const existing = this.locks.get(resource);
        if (existing && existing.expires > new Date()) {
            if (existing.owner === owner) {
                existing.expires = new Date(Date.now() + ttlMs);
                return true;
            }
            return false;
        }
        this.locks.set(resource, { owner, expires: new Date(Date.now() + ttlMs) });
        await this.cluster.broadcast('lock:acquired', { resource, owner });
        return true;
    }
    async release(resource, owner) {
        const existing = this.locks.get(resource);
        if (!existing || existing.owner !== owner) {
            return false;
        }
        this.locks.delete(resource);
        await this.cluster.broadcast('lock:released', { resource, owner });
        return true;
    }
    isLocked(resource) {
        const existing = this.locks.get(resource);
        return !!(existing && existing.expires > new Date());
    }
}
export const clusterManager = new ClusterManager({});
//# sourceMappingURL=index.js.map