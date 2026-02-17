import { randomUUID } from 'crypto';
import { EventEmitter } from 'events';
import * as https from 'https';
import * as http from 'http';
export class FederationService extends EventEmitter {
    config;
    peers = new Map();
    messageQueue = [];
    isRunning = false;
    syncInterval = null;
    constructor(config) {
        super();
        this.config = {
            peerId: config.peerId || randomUUID(),
            peerName: config.peerName || 'Alpicia',
            url: config.url || 'http://localhost:3000',
            privateKey: config.privateKey || '',
            publicKey: config.publicKey || '',
            peers: config.peers || [],
            autoDiscover: config.autoDiscover ?? true,
            syncInterval: config.syncInterval || 60000,
        };
    }
    async start() {
        if (this.isRunning)
            return;
        console.log(`Starting Federation peer: ${this.config.peerName} (${this.config.peerId})`);
        await this.connectToPeers(this.config.peers);
        if (this.config.autoDiscover) {
            this.startPeerDiscovery();
        }
        this.startPeriodicSync();
        this.isRunning = true;
        console.log(`Federation peer ${this.config.peerName} is online`);
        this.emit('started');
    }
    async stop() {
        if (!this.isRunning)
            return;
        console.log(`Stopping Federation peer: ${this.config.peerName}`);
        if (this.syncInterval) {
            clearInterval(this.syncInterval);
            this.syncInterval = null;
        }
        for (const peer of this.peers.values()) {
            await this.disconnectFromPeer(peer.id);
        }
        this.isRunning = false;
        console.log(`Federation peer ${this.config.peerName} is offline`);
        this.emit('stopped');
    }
    async connectToPeers(peerUrls) {
        for (const url of peerUrls) {
            try {
                await this.connectToPeer(url);
            }
            catch (error) {
                console.warn(`Failed to connect to peer ${url}:`, error);
            }
        }
    }
    async connectToPeer(peerUrl) {
        const peer = {
            id: randomUUID(),
            name: 'Unknown',
            url: peerUrl,
            publicKey: '',
            status: 'connecting',
            lastSync: new Date(),
            capabilities: [],
        };
        try {
            const response = await this.makeRequest(peerUrl, '/federation/handshake', {
                peerId: this.config.peerId,
                peerName: this.config.peerName,
                url: this.config.url,
                publicKey: this.config.publicKey,
                capabilities: ['chat', 'memory', 'workflow', 'agent'],
            });
            peer.id = response.peerId;
            peer.name = response.peerName;
            peer.publicKey = response.publicKey;
            peer.capabilities = response.capabilities;
            peer.status = 'connected';
            peer.lastSync = new Date();
            this.peers.set(peer.id, peer);
            console.log(`Connected to federation peer: ${peer.name}`);
            this.emit('peer:connected', peer);
            return peer;
        }
        catch (error) {
            peer.status = 'disconnected';
            throw error;
        }
    }
    async disconnectFromPeer(peerId) {
        const peer = this.peers.get(peerId);
        if (!peer)
            return;
        peer.status = 'disconnected';
        this.peers.delete(peerId);
        console.log(`Disconnected from federation peer: ${peer.name}`);
        this.emit('peer:disconnected', peer);
    }
    startPeerDiscovery() {
        console.log('Starting peer discovery...');
    }
    startPeriodicSync() {
        this.syncInterval = setInterval(async () => {
            await this.syncWithPeers();
        }, this.config.syncInterval);
    }
    async syncWithPeers() {
        for (const peer of this.peers.values()) {
            if (peer.status !== 'connected')
                continue;
            try {
                await this.makeRequest(peer.url, '/federation/sync', {
                    lastSync: peer.lastSync,
                    capabilities: this.getCapabilities(),
                });
                peer.lastSync = new Date();
            }
            catch (error) {
                console.warn(`Sync failed with peer ${peer.name}:`, error);
                peer.status = 'disconnected';
            }
        }
    }
    async sendMessage(type, payload, targetPeerId) {
        const message = {
            id: randomUUID(),
            type,
            from: this.config.peerId,
            to: targetPeerId,
            payload,
            timestamp: new Date(),
        };
        if (targetPeerId) {
            await this.sendToPeer(targetPeerId, message);
        }
        else {
            await this.broadcast(message);
        }
    }
    async sendToPeer(peerId, message) {
        const peer = this.peers.get(peerId);
        if (!peer || peer.status !== 'connected') {
            this.messageQueue.push(message);
            throw new Error(`Peer ${peerId} is not connected`);
        }
        try {
            await this.makeRequest(peer.url, '/federation/message', message);
        }
        catch (error) {
            console.error(`Failed to send message to peer ${peerId}:`, error);
            throw error;
        }
    }
    async broadcast(message) {
        const promises = Array.from(this.peers.values())
            .filter((p) => p.status === 'connected')
            .map((peer) => this.sendToPeer(peer.id, message).catch((err) => {
            console.warn(`Broadcast failed to ${peer.name}:`, err);
        }));
        await Promise.allSettled(promises);
    }
    async makeRequest(baseUrl, path, data) {
        return new Promise((resolve, reject) => {
            const url = new URL(path, baseUrl);
            const isHttps = url.protocol === 'https:';
            const lib = isHttps ? https : http;
            const options = {
                hostname: url.hostname,
                port: url.port || (isHttps ? 443 : 80),
                path: url.pathname,
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Peer-ID': this.config.peerId,
                },
            };
            const req = lib.request(options, (res) => {
                let body = '';
                res.on('data', (chunk) => (body += chunk));
                res.on('end', () => {
                    if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
                        try {
                            resolve(JSON.parse(body));
                        }
                        catch {
                            resolve(body);
                        }
                    }
                    else {
                        reject(new Error(`Request failed: ${res.statusCode} ${body}`));
                    }
                });
            });
            req.on('error', reject);
            req.write(JSON.stringify(data));
            req.end();
        });
    }
    getPeers() {
        return Array.from(this.peers.values());
    }
    getPeer(peerId) {
        return this.peers.get(peerId);
    }
    getConnectedPeers() {
        return Array.from(this.peers.values()).filter((p) => p.status === 'connected');
    }
    getCapabilities() {
        return ['chat', 'memory', 'workflow', 'agent', 'voice', 'rag'];
    }
    getIsRunning() {
        return this.isRunning;
    }
    getStatus() {
        return {
            running: this.isRunning,
            peerId: this.config.peerId,
            peerName: this.config.peerName,
            peers: this.peers.size,
            connected: this.getConnectedPeers().length,
            queued: this.messageQueue.length,
        };
    }
    async shareMemory(memoryId, targetPeerId) {
        await this.sendMessage('memory', { action: 'share', memoryId }, targetPeerId);
    }
    async delegateTask(task, targetPeerId) {
        await this.sendMessage('agent', { action: 'delegate', task }, targetPeerId);
    }
    async syncWorkflow(workflowId, targetPeerId) {
        await this.sendMessage('workflow', { action: 'sync', workflowId }, targetPeerId);
    }
}
export class FederatedMemory {
    federation;
    constructor(federation) {
        this.federation = federation;
    }
    async searchAcrossPeers(query) {
        const results = [];
        const connectedPeers = this.federation.getConnectedPeers();
        for (const peer of connectedPeers) {
            try {
                const peerResults = await this.federation['makeRequest'](peer.url, '/federation/search', {
                    query,
                });
                results.push(...peerResults);
            }
            catch (error) {
                console.warn(`Search failed on peer ${peer.name}:`, error);
            }
        }
        return results.sort((a, b) => b.score - a.score);
    }
}
export const federationService = new FederationService({});
//# sourceMappingURL=index.js.map