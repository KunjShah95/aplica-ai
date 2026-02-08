export type NodePlatform = 'ios' | 'android' | 'macos' | 'windows' | 'linux';
export interface NodeInfo {
    id: string;
    name: string;
    platform: NodePlatform;
    version: string;
    capabilities: NodeCapability[];
    status: NodeStatus;
    lastSeen: Date;
    pairedAt?: Date;
    metadata: NodeMetadata;
}
export type NodeStatus = 'online' | 'offline' | 'busy' | 'error' | 'pairing';
export type NodeCapability = 'camera' | 'microphone' | 'speaker' | 'screen' | 'location' | 'notifications' | 'sms' | 'contacts' | 'calendar' | 'filesystem' | 'clipboard' | 'biometrics' | 'vibration' | 'battery' | 'network' | 'bluetooth';
export interface NodeMetadata {
    model?: string;
    manufacturer?: string;
    osName?: string;
    deviceName?: string;
    udid?: string;
    ipAddress?: string;
    port?: number;
}
export interface NodeAction {
    id: string;
    nodeId: string;
    type: NodeActionType;
    parameters: Record<string, unknown>;
    status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
    result?: unknown;
    error?: string;
    createdAt: Date;
    startedAt?: Date;
    completedAt?: Date;
    timeout?: number;
}
export type NodeActionType = 'camera.capture' | 'camera.record' | 'microphone.record' | 'speaker.play' | 'screen.capture' | 'screen.stream' | 'location.get' | 'location.track' | 'notification.send' | 'notification.list' | 'sms.send' | 'sms.list' | 'contacts.list' | 'contacts.get' | 'calendar.list' | 'calendar.get' | 'clipboard.get' | 'clipboard.set' | 'battery.get' | 'network.get' | 'vibrate';
export interface NodeConnection {
    id: string;
    nodeId: string;
    type: 'websocket' | 'http' | 'ssh';
    url: string;
    connectedAt: Date;
    lastActivity: Date;
    status: 'connected' | 'disconnected' | 'error';
}
export declare class NodeManager {
    private nodes;
    private actions;
    private connections;
    private listeners;
    private actionHandlers;
    constructor();
    private registerDefaultHandlers;
    registerNode(node: Omit<NodeInfo, 'id' | 'status' | 'lastSeen'>): NodeInfo;
    unregisterNode(nodeId: string): boolean;
    getNode(nodeId: string): NodeInfo | undefined;
    getAllNodes(): NodeInfo[];
    getOnlineNodes(): NodeInfo[];
    getNodesByPlatform(platform: NodePlatform): NodeInfo[];
    getNodesByCapability(capability: NodeCapability): NodeInfo[];
    updateNodeStatus(nodeId: string, status: NodeStatus): boolean;
    executeAction(nodeId: string, type: NodeActionType, parameters?: Record<string, unknown>, timeout?: number): Promise<NodeAction>;
    private executeRemoteAction;
    cancelAction(actionId: string): boolean;
    getAction(actionId: string): NodeAction | undefined;
    getNodeActions(nodeId: string): NodeAction[];
    registerActionHandler(type: NodeActionType, handler: (action: NodeAction) => Promise<unknown>): void;
    pairNode(platform: NodePlatform, name: string, udid: string, ipAddress: string, port?: number): NodeInfo;
    private getDefaultCapabilities;
    private getCapabilityForAction;
    on(listener: (event: NodeEvent) => void): () => void;
    private emit;
    getStats(): {
        total: number;
        online: number;
        offline: number;
        busy: number;
        byPlatform: Record<NodePlatform, number>;
        pendingActions: number;
        runningActions: number;
    };
}
export type NodeEvent = {
    type: 'node_online';
    node: NodeInfo;
} | {
    type: 'node_offline';
    nodeId: string;
} | {
    type: 'node_status_changed';
    nodeId: string;
    oldStatus: NodeStatus;
    newStatus: NodeStatus;
} | {
    type: 'action_created';
    action: NodeAction;
} | {
    type: 'action_completed';
    action: NodeAction;
} | {
    type: 'action_failed';
    action: NodeAction;
} | {
    type: 'action_cancelled';
    action: NodeAction;
};
export declare const nodeManager: NodeManager;
export declare const nodeTools: {
    node_list(): Promise<NodeInfo[]>;
    node_status(nodeId: string): Promise<NodeInfo | null>;
    node_actions(nodeId: string): Promise<NodeAction[]>;
    node_cancel(actionId: string): Promise<boolean>;
};
//# sourceMappingURL=node-manager.d.ts.map