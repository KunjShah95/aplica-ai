import { EventEmitter } from 'events';
export interface ClusterNode {
    id: string;
    host: string;
    port: number;
    status: 'online' | 'offline' | 'joining' | 'leaving';
    role: 'primary' | 'replica';
    load: number;
    memory: number;
    lastSeen: Date;
    capabilities: string[];
}
export interface ClusterConfig {
    nodeId: string;
    host: string;
    port: number;
    seeds: string[];
    gossipPort: number;
    healthCheckInterval: number;
}
export interface Message {
    id: string;
    type: 'gossip' | 'request' | 'response' | 'broadcast' | 'sync';
    from: string;
    to?: string;
    payload: unknown;
    timestamp: Date;
}
export declare class ClusterManager extends EventEmitter {
    private config;
    private nodes;
    private httpServer;
    private gossipSocket;
    private isRunning;
    private messageHandlers;
    constructor(config: Partial<ClusterConfig>);
    start(): Promise<void>;
    stop(): Promise<void>;
    private startHttpServer;
    private handleForwardRequest;
    private startGossip;
    private joinSeeds;
    private connectToNode;
    private startHealthChecks;
    broadcast(type: string, payload: unknown): Promise<void>;
    sendToNode(nodeId: string, message: Message): Promise<void>;
    routeRequest(data: {
        type: string;
        payload: unknown;
    }): Promise<unknown>;
    registerHandler(type: string, handler: (msg: Message) => Promise<void>): void;
    private leaveCluster;
    getNodes(): ClusterNode[];
    getNode(nodeId: string): ClusterNode | undefined;
    getPrimaryNode(): ClusterNode | undefined;
    getClusterState(): {
        nodeId: string;
        status: string;
        nodes: ClusterNode[];
        totalNodes: number;
        onlineNodes: number;
    };
    isLeader(): boolean;
    getLoad(): number;
}
export declare class DistributedLock {
    private cluster;
    private locks;
    constructor(cluster: ClusterManager);
    acquire(resource: string, owner: string, ttlMs?: number): Promise<boolean>;
    release(resource: string, owner: string): Promise<boolean>;
    isLocked(resource: string): boolean;
}
export declare const clusterManager: ClusterManager;
//# sourceMappingURL=index.d.ts.map