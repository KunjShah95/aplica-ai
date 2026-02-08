import { randomUUID } from 'crypto';
import { spawn, ChildProcess } from 'child_process';

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

export type NodeCapability =
  | 'camera'
  | 'microphone'
  | 'speaker'
  | 'screen'
  | 'location'
  | 'notifications'
  | 'sms'
  | 'contacts'
  | 'calendar'
  | 'filesystem'
  | 'clipboard'
  | 'biometrics'
  | 'vibration'
  | 'battery'
  | 'network'
  | 'bluetooth';

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

export type NodeActionType =
  | 'camera.capture'
  | 'camera.record'
  | 'microphone.record'
  | 'speaker.play'
  | 'screen.capture'
  | 'screen.stream'
  | 'location.get'
  | 'location.track'
  | 'notification.send'
  | 'notification.list'
  | 'sms.send'
  | 'sms.list'
  | 'contacts.list'
  | 'contacts.get'
  | 'calendar.list'
  | 'calendar.get'
  | 'clipboard.get'
  | 'clipboard.set'
  | 'battery.get'
  | 'network.get'
  | 'vibrate';

export interface NodeConnection {
  id: string;
  nodeId: string;
  type: 'websocket' | 'http' | 'ssh';
  url: string;
  connectedAt: Date;
  lastActivity: Date;
  status: 'connected' | 'disconnected' | 'error';
}

export class NodeManager {
  private nodes: Map<string, NodeInfo> = new Map();
  private actions: Map<string, NodeAction> = new Map();
  private connections: Map<string, NodeConnection> = new Map();
  private listeners: Set<(event: NodeEvent) => void> = new Set();
  private actionHandlers: Map<NodeActionType, (action: NodeAction) => Promise<unknown>> = new Map();

  constructor() {
    this.registerDefaultHandlers();
  }

  private registerDefaultHandlers(): void {
    this.actionHandlers.set('location.get', async (action) => ({ latitude: 0, longitude: 0 }));
    this.actionHandlers.set('battery.get', async (action) => ({ level: 100, charging: true }));
    this.actionHandlers.set('screen.capture', async (action) => ({ data: 'base64_encoded_image' }));
  }

  registerNode(node: Omit<NodeInfo, 'id' | 'status' | 'lastSeen'>): NodeInfo {
    const nodeInfo: NodeInfo = {
      ...node,
      id: randomUUID(),
      status: 'online',
      lastSeen: new Date(),
    };

    this.nodes.set(nodeInfo.id, nodeInfo);
    this.emit({ type: 'node_online', node: nodeInfo });

    console.log(`Node registered: ${nodeInfo.name} (${nodeInfo.platform})`);
    return nodeInfo;
  }

  unregisterNode(nodeId: string): boolean {
    const node = this.nodes.get(nodeId);
    if (!node) return false;

    node.status = 'offline';
    this.nodes.delete(nodeId);

    for (const [connId, conn] of this.connections.entries()) {
      if (conn.nodeId === nodeId) {
        this.connections.delete(connId);
      }
    }

    this.emit({ type: 'node_offline', nodeId });
    console.log(`Node unregistered: ${node.name}`);
    return true;
  }

  getNode(nodeId: string): NodeInfo | undefined {
    return this.nodes.get(nodeId);
  }

  getAllNodes(): NodeInfo[] {
    return Array.from(this.nodes.values());
  }

  getOnlineNodes(): NodeInfo[] {
    return Array.from(this.nodes.values()).filter((n) => n.status === 'online');
  }

  getNodesByPlatform(platform: NodePlatform): NodeInfo[] {
    return Array.from(this.nodes.values()).filter((n) => n.platform === platform);
  }

  getNodesByCapability(capability: NodeCapability): NodeInfo[] {
    return Array.from(this.nodes.values()).filter((n) => n.capabilities.includes(capability));
  }

  updateNodeStatus(nodeId: string, status: NodeStatus): boolean {
    const node = this.nodes.get(nodeId);
    if (!node) return false;

    const oldStatus = node.status;
    node.status = status;
    node.lastSeen = new Date();
    this.nodes.set(nodeId, node);

    if (oldStatus !== status) {
      if (status === 'online') {
        this.emit({ type: 'node_online', node });
      } else if (status === 'offline') {
        this.emit({ type: 'node_offline', nodeId });
      } else {
        this.emit({ type: 'node_status_changed', nodeId, oldStatus, newStatus: status });
      }
    }

    return true;
  }

  async executeAction(
    nodeId: string,
    type: NodeActionType,
    parameters: Record<string, unknown> = {},
    timeout?: number
  ): Promise<NodeAction> {
    const node = this.nodes.get(nodeId);
    if (!node) {
      throw new Error(`Node ${nodeId} not found`);
    }

    if (!node.capabilities.includes(this.getCapabilityForAction(type))) {
      throw new Error(`Node ${node.name} does not support action ${type}`);
    }

    const action: NodeAction = {
      id: randomUUID(),
      nodeId,
      type,
      parameters,
      status: 'pending',
      createdAt: new Date(),
      timeout,
    };

    this.actions.set(action.id, action);

    this.updateNodeStatus(nodeId, 'busy');
    this.emit({ type: 'action_created', action });

    try {
      action.status = 'running';
      action.startedAt = new Date();
      this.actions.set(action.id, action);

      const handler = this.actionHandlers.get(type);
      if (handler) {
        action.result = await handler(action);
      } else {
        action.result = await this.executeRemoteAction(nodeId, type, parameters);
      }

      action.status = 'completed';
      action.completedAt = new Date();
      this.actions.set(action.id, action);

      this.updateNodeStatus(nodeId, 'online');
      this.emit({ type: 'action_completed', action });
    } catch (error) {
      action.status = 'failed';
      action.error = error instanceof Error ? error.message : String(error);
      action.completedAt = new Date();
      this.actions.set(action.id, action);

      this.updateNodeStatus(nodeId, 'online');
      this.emit({ type: 'action_failed', action });
    }

    return action;
  }

  private async executeRemoteAction(
    nodeId: string,
    type: NodeActionType,
    parameters: Record<string, unknown>
  ): Promise<unknown> {
    const node = this.nodes.get(nodeId);
    if (!node) throw new Error('Node not found');

    console.log(`Executing remote action ${type} on node ${node.name}`);
    return { success: true, action: type, parameters };
  }

  cancelAction(actionId: string): boolean {
    const action = this.actions.get(actionId);
    if (!action || action.status !== 'running') return false;

    action.status = 'cancelled';
    action.completedAt = new Date();
    this.actions.set(actionId, action);

    this.updateNodeStatus(action.nodeId, 'online');
    this.emit({ type: 'action_cancelled', action });

    return true;
  }

  getAction(actionId: string): NodeAction | undefined {
    return this.actions.get(actionId);
  }

  getNodeActions(nodeId: string): NodeAction[] {
    return Array.from(this.actions.values()).filter((a) => a.nodeId === nodeId);
  }

  registerActionHandler(
    type: NodeActionType,
    handler: (action: NodeAction) => Promise<unknown>
  ): void {
    this.actionHandlers.set(type, handler);
  }

  pairNode(
    platform: NodePlatform,
    name: string,
    udid: string,
    ipAddress: string,
    port: number = 8080
  ): NodeInfo {
    const node = this.registerNode({
      name,
      platform,
      version: '1.0.0',
      capabilities: this.getDefaultCapabilities(platform),
      pairedAt: new Date(),
      metadata: {
        udid,
        ipAddress,
        port,
      },
    });

    console.log(`Node paired: ${name} at ${ipAddress}:${port}`);
    return node;
  }

  private getDefaultCapabilities(platform: NodePlatform): NodeCapability[] {
    const common: NodeCapability[] = [
      'camera',
      'microphone',
      'speaker',
      'location',
      'notifications',
      'clipboard',
      'battery',
      'network',
    ];

    const platformSpecific: Record<NodePlatform, NodeCapability[]> = {
      ios: ['screen', 'vibration', 'biometrics', 'contacts', 'calendar'],
      android: ['screen', 'vibration', 'biometrics', 'contacts', 'calendar', 'sms', 'filesystem'],
      macos: ['screen', 'vibration', 'filesystem'],
      windows: ['screen', 'vibration', 'filesystem'],
      linux: ['screen', 'filesystem'],
    };

    return [...common, ...platformSpecific[platform]];
  }

  private getCapabilityForAction(actionType: NodeActionType): NodeCapability {
    const mapping: Record<NodeActionType, NodeCapability> = {
      'camera.capture': 'camera',
      'camera.record': 'camera',
      'microphone.record': 'microphone',
      'speaker.play': 'speaker',
      'screen.capture': 'screen',
      'screen.stream': 'screen',
      'location.get': 'location',
      'location.track': 'location',
      'notification.send': 'notifications',
      'notification.list': 'notifications',
      'sms.send': 'sms',
      'sms.list': 'sms',
      'contacts.list': 'contacts',
      'contacts.get': 'contacts',
      'calendar.list': 'calendar',
      'calendar.get': 'calendar',
      'clipboard.get': 'clipboard',
      'clipboard.set': 'clipboard',
      'battery.get': 'battery',
      'network.get': 'network',
      'vibrate': 'vibration',
    };

    return mapping[actionType];
  }

  on(listener: (event: NodeEvent) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private emit(event: NodeEvent): void {
    for (const listener of this.listeners) {
      listener(event);
    }
  }

  getStats(): {
    total: number;
    online: number;
    offline: number;
    busy: number;
    byPlatform: Record<NodePlatform, number>;
    pendingActions: number;
    runningActions: number;
  } {
    const stats = {
      total: this.nodes.size,
      online: 0,
      offline: 0,
      busy: 0,
      byPlatform: {} as Record<NodePlatform, number>,
      pendingActions: 0,
      runningActions: 0,
    };

    for (const node of this.nodes.values()) {
      switch (node.status) {
        case 'online':
          stats.online++;
          break;
        case 'offline':
          stats.offline++;
          break;
        case 'busy':
          stats.busy++;
          break;
      }
      stats.byPlatform[node.platform] = (stats.byPlatform[node.platform] || 0) + 1;
    }

    for (const action of this.actions.values()) {
      if (action.status === 'pending') stats.pendingActions++;
      if (action.status === 'running') stats.runningActions++;
    }

    return stats;
  }
}

export type NodeEvent =
  | { type: 'node_online'; node: NodeInfo }
  | { type: 'node_offline'; nodeId: string }
  | { type: 'node_status_changed'; nodeId: string; oldStatus: NodeStatus; newStatus: NodeStatus }
  | { type: 'action_created'; action: NodeAction }
  | { type: 'action_completed'; action: NodeAction }
  | { type: 'action_failed'; action: NodeAction }
  | { type: 'action_cancelled'; action: NodeAction };

export const nodeManager = new NodeManager();

export const nodeTools = {
  async node_list(): Promise<NodeInfo[]> {
    return nodeManager.getOnlineNodes();
  },

  async node_status(nodeId: string): Promise<NodeInfo | null> {
    return nodeManager.getNode(nodeId) || null;
  },

  async node_actions(nodeId: string): Promise<NodeAction[]> {
    return nodeManager.getNodeActions(nodeId);
  },

  async node_cancel(actionId: string): Promise<boolean> {
    return nodeManager.cancelAction(actionId);
  },
};
