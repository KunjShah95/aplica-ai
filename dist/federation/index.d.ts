import { EventEmitter } from 'events';
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
export declare class FederationService extends EventEmitter {
    private config;
    private peers;
    private messageQueue;
    private isRunning;
    private syncInterval;
    constructor(config: Partial<FederationConfig>);
    start(): Promise<void>;
    stop(): Promise<void>;
    private connectToPeers;
    connectToPeer(peerUrl: string): Promise<FederationPeer>;
    disconnectFromPeer(peerId: string): Promise<void>;
    private startPeerDiscovery;
    private startPeriodicSync;
    private syncWithPeers;
    sendMessage(type: FederationMessage['type'], payload: unknown, targetPeerId?: string): Promise<void>;
    private sendToPeer;
    private broadcast;
    private makeRequest;
    getPeers(): FederationPeer[];
    getPeer(peerId: string): FederationPeer | undefined;
    getConnectedPeers(): FederationPeer[];
    getCapabilities(): string[];
    getIsRunning(): boolean;
    getStatus(): {
        running: boolean;
        peerId: string;
        peerName: string;
        peers: number;
        connected: number;
        queued: number;
    };
    shareMemory(memoryId: string, targetPeerId?: string): Promise<void>;
    delegateTask(task: unknown, targetPeerId?: string): Promise<void>;
    syncWorkflow(workflowId: string, targetPeerId?: string): Promise<void>;
}
export declare class FederatedMemory {
    private federation;
    constructor(federation: FederationService);
    searchAcrossPeers(query: string): Promise<any[]>;
}
export declare const federationService: FederationService;
//# sourceMappingURL=index.d.ts.map