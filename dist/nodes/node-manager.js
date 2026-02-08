import { randomUUID } from 'crypto';
export class NodeManager {
    nodes = new Map();
    actions = new Map();
    connections = new Map();
    listeners = new Set();
    actionHandlers = new Map();
    constructor() {
        this.registerDefaultHandlers();
    }
    registerDefaultHandlers() {
        this.actionHandlers.set('location.get', async (action) => ({ latitude: 0, longitude: 0 }));
        this.actionHandlers.set('battery.get', async (action) => ({ level: 100, charging: true }));
        this.actionHandlers.set('screen.capture', async (action) => ({ data: 'base64_encoded_image' }));
    }
    registerNode(node) {
        const nodeInfo = {
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
    unregisterNode(nodeId) {
        const node = this.nodes.get(nodeId);
        if (!node)
            return false;
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
    getNode(nodeId) {
        return this.nodes.get(nodeId);
    }
    getAllNodes() {
        return Array.from(this.nodes.values());
    }
    getOnlineNodes() {
        return Array.from(this.nodes.values()).filter((n) => n.status === 'online');
    }
    getNodesByPlatform(platform) {
        return Array.from(this.nodes.values()).filter((n) => n.platform === platform);
    }
    getNodesByCapability(capability) {
        return Array.from(this.nodes.values()).filter((n) => n.capabilities.includes(capability));
    }
    updateNodeStatus(nodeId, status) {
        const node = this.nodes.get(nodeId);
        if (!node)
            return false;
        const oldStatus = node.status;
        node.status = status;
        node.lastSeen = new Date();
        this.nodes.set(nodeId, node);
        if (oldStatus !== status) {
            if (status === 'online') {
                this.emit({ type: 'node_online', node });
            }
            else if (status === 'offline') {
                this.emit({ type: 'node_offline', nodeId });
            }
            else {
                this.emit({ type: 'node_status_changed', nodeId, oldStatus, newStatus: status });
            }
        }
        return true;
    }
    async executeAction(nodeId, type, parameters = {}, timeout) {
        const node = this.nodes.get(nodeId);
        if (!node) {
            throw new Error(`Node ${nodeId} not found`);
        }
        if (!node.capabilities.includes(this.getCapabilityForAction(type))) {
            throw new Error(`Node ${node.name} does not support action ${type}`);
        }
        const action = {
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
            }
            else {
                action.result = await this.executeRemoteAction(nodeId, type, parameters);
            }
            action.status = 'completed';
            action.completedAt = new Date();
            this.actions.set(action.id, action);
            this.updateNodeStatus(nodeId, 'online');
            this.emit({ type: 'action_completed', action });
        }
        catch (error) {
            action.status = 'failed';
            action.error = error instanceof Error ? error.message : String(error);
            action.completedAt = new Date();
            this.actions.set(action.id, action);
            this.updateNodeStatus(nodeId, 'online');
            this.emit({ type: 'action_failed', action });
        }
        return action;
    }
    async executeRemoteAction(nodeId, type, parameters) {
        const node = this.nodes.get(nodeId);
        if (!node)
            throw new Error('Node not found');
        console.log(`Executing remote action ${type} on node ${node.name}`);
        return { success: true, action: type, parameters };
    }
    cancelAction(actionId) {
        const action = this.actions.get(actionId);
        if (!action || action.status !== 'running')
            return false;
        action.status = 'cancelled';
        action.completedAt = new Date();
        this.actions.set(actionId, action);
        this.updateNodeStatus(action.nodeId, 'online');
        this.emit({ type: 'action_cancelled', action });
        return true;
    }
    getAction(actionId) {
        return this.actions.get(actionId);
    }
    getNodeActions(nodeId) {
        return Array.from(this.actions.values()).filter((a) => a.nodeId === nodeId);
    }
    registerActionHandler(type, handler) {
        this.actionHandlers.set(type, handler);
    }
    pairNode(platform, name, udid, ipAddress, port = 8080) {
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
    getDefaultCapabilities(platform) {
        const common = [
            'camera',
            'microphone',
            'speaker',
            'location',
            'notifications',
            'clipboard',
            'battery',
            'network',
        ];
        const platformSpecific = {
            ios: ['screen', 'vibration', 'biometrics', 'contacts', 'calendar'],
            android: ['screen', 'vibration', 'biometrics', 'contacts', 'calendar', 'sms', 'filesystem'],
            macos: ['screen', 'vibration', 'filesystem'],
            windows: ['screen', 'vibration', 'filesystem'],
            linux: ['screen', 'filesystem'],
        };
        return [...common, ...platformSpecific[platform]];
    }
    getCapabilityForAction(actionType) {
        const mapping = {
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
    on(listener) {
        this.listeners.add(listener);
        return () => this.listeners.delete(listener);
    }
    emit(event) {
        for (const listener of this.listeners) {
            listener(event);
        }
    }
    getStats() {
        const stats = {
            total: this.nodes.size,
            online: 0,
            offline: 0,
            busy: 0,
            byPlatform: {},
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
            if (action.status === 'pending')
                stats.pendingActions++;
            if (action.status === 'running')
                stats.runningActions++;
        }
        return stats;
    }
}
export const nodeManager = new NodeManager();
export const nodeTools = {
    async node_list() {
        return nodeManager.getOnlineNodes();
    },
    async node_status(nodeId) {
        return nodeManager.getNode(nodeId) || null;
    },
    async node_actions(nodeId) {
        return nodeManager.getNodeActions(nodeId);
    },
    async node_cancel(actionId) {
        return nodeManager.cancelAction(actionId);
    },
};
//# sourceMappingURL=node-manager.js.map