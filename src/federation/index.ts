import { randomUUID } from 'crypto';
import { EventEmitter } from 'events';
import * as https from 'https';
import * as http from 'http';

export interface FederationPeer {
  id: string;
  name: string;
  url: string;
  publicKey: string;
  status: 'connected' | 'disconnected' | 'connecting';
  lastSync: Date;
  capabilities: string[];
  region?: string;
}

export interface FederationMessage {
  id: string;
  type: 'chat' | 'memory' | 'workflow' | 'agent' | 'sync' | 'discovery';
  from: string;
  to?: string;
  payload: unknown;
  timestamp: Date;
  signature?: string;
}

export interface FederationConfig {
  peerId: string;
  peerName: string;
  url: string;
  privateKey: string;
  publicKey: string;
  peers: string[];
  autoDiscover: boolean;
  syncInterval: number;
}

export class FederationService extends EventEmitter {
  private config: FederationConfig;
  private peers: Map<string, FederationPeer> = new Map();
  private messageQueue: FederationMessage[] = [];
  private isRunning: boolean = false;
  private syncInterval: NodeJS.Timeout | null = null;

  constructor(config: Partial<FederationConfig>) {
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

  async start(): Promise<void> {
    if (this.isRunning) return;

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

  async stop(): Promise<void> {
    if (!this.isRunning) return;

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

  private async connectToPeers(peerUrls: string[]): Promise<void> {
    for (const url of peerUrls) {
      try {
        await this.connectToPeer(url);
      } catch (error) {
        console.warn(`Failed to connect to peer ${url}:`, error);
      }
    }
  }

  async connectToPeer(peerUrl: string): Promise<FederationPeer> {
    const peer: FederationPeer = {
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
    } catch (error) {
      peer.status = 'disconnected';
      throw error;
    }
  }

  async disconnectFromPeer(peerId: string): Promise<void> {
    const peer = this.peers.get(peerId);
    if (!peer) return;

    peer.status = 'disconnected';
    this.peers.delete(peerId);

    console.log(`Disconnected from federation peer: ${peer.name}`);
    this.emit('peer:disconnected', peer);
  }

  private startPeerDiscovery(): void {
    console.log('Starting peer discovery...');
  }

  private startPeriodicSync(): void {
    this.syncInterval = setInterval(async () => {
      await this.syncWithPeers();
    }, this.config.syncInterval);
  }

  private async syncWithPeers(): Promise<void> {
    for (const peer of this.peers.values()) {
      if (peer.status !== 'connected') continue;

      try {
        await this.makeRequest(peer.url, '/federation/sync', {
          lastSync: peer.lastSync,
          capabilities: this.getCapabilities(),
        });

        peer.lastSync = new Date();
      } catch (error) {
        console.warn(`Sync failed with peer ${peer.name}:`, error);
        peer.status = 'disconnected';
      }
    }
  }

  async sendMessage(
    type: FederationMessage['type'],
    payload: unknown,
    targetPeerId?: string
  ): Promise<void> {
    const message: FederationMessage = {
      id: randomUUID(),
      type,
      from: this.config.peerId,
      to: targetPeerId,
      payload,
      timestamp: new Date(),
    };

    if (targetPeerId) {
      await this.sendToPeer(targetPeerId, message);
    } else {
      await this.broadcast(message);
    }
  }

  private async sendToPeer(peerId: string, message: FederationMessage): Promise<void> {
    const peer = this.peers.get(peerId);
    if (!peer || peer.status !== 'connected') {
      this.messageQueue.push(message);
      throw new Error(`Peer ${peerId} is not connected`);
    }

    try {
      await this.makeRequest(peer.url, '/federation/message', message);
    } catch (error) {
      console.error(`Failed to send message to peer ${peerId}:`, error);
      throw error;
    }
  }

  private async broadcast(message: FederationMessage): Promise<void> {
    const promises = Array.from(this.peers.values())
      .filter((p) => p.status === 'connected')
      .map((peer) =>
        this.sendToPeer(peer.id, message).catch((err) => {
          console.warn(`Broadcast failed to ${peer.name}:`, err);
        })
      );

    await Promise.allSettled(promises);
  }

  private async makeRequest(baseUrl: string, path: string, data: unknown): Promise<any> {
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
            } catch {
              resolve(body);
            }
          } else {
            reject(new Error(`Request failed: ${res.statusCode} ${body}`));
          }
        });
      });

      req.on('error', reject);
      req.write(JSON.stringify(data));
      req.end();
    });
  }

  getPeers(): FederationPeer[] {
    return Array.from(this.peers.values());
  }

  getPeer(peerId: string): FederationPeer | undefined {
    return this.peers.get(peerId);
  }

  getConnectedPeers(): FederationPeer[] {
    return Array.from(this.peers.values()).filter((p) => p.status === 'connected');
  }

  getCapabilities(): string[] {
    return ['chat', 'memory', 'workflow', 'agent', 'voice', 'rag'];
  }

  getIsRunning(): boolean {
    return this.isRunning;
  }

  getStatus(): {
    running: boolean;
    peerId: string;
    peerName: string;
    peers: number;
    connected: number;
    queued: number;
  } {
    return {
      running: this.isRunning,
      peerId: this.config.peerId,
      peerName: this.config.peerName,
      peers: this.peers.size,
      connected: this.getConnectedPeers().length,
      queued: this.messageQueue.length,
    };
  }

  async shareMemory(memoryId: string, targetPeerId?: string): Promise<void> {
    await this.sendMessage('memory', { action: 'share', memoryId }, targetPeerId);
  }

  async delegateTask(task: unknown, targetPeerId?: string): Promise<void> {
    await this.sendMessage('agent', { action: 'delegate', task }, targetPeerId);
  }

  async syncWorkflow(workflowId: string, targetPeerId?: string): Promise<void> {
    await this.sendMessage('workflow', { action: 'sync', workflowId }, targetPeerId);
  }
}

export class FederatedMemory {
  private federation: FederationService;

  constructor(federation: FederationService) {
    this.federation = federation;
  }

  async searchAcrossPeers(query: string): Promise<any[]> {
    const results: any[] = [];
    const connectedPeers = this.federation.getConnectedPeers();

    for (const peer of connectedPeers) {
      try {
        const peerResults = await this.federation['makeRequest'](peer.url, '/federation/search', {
          query,
        });
        results.push(...peerResults);
      } catch (error) {
        console.warn(`Search failed on peer ${peer.name}:`, error);
      }
    }

    return results.sort((a, b) => b.score - a.score);
  }
}

export const federationService = new FederationService({});
