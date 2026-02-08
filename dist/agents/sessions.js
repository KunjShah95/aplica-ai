import { randomUUID } from 'crypto';
export class SessionManager {
    sessions = new Map();
    messageQueue = new Map();
    history = new Map();
    pendingReplies = new Map();
    constructor() {
        this.createDefaultSessions();
    }
    createDefaultSessions() {
        const defaultSessions = [
            {
                id: 'main',
                name: 'Main Agent',
                type: 'coordinator',
                status: 'active',
                metadata: {
                    description: 'Primary coordinating agent',
                    capabilities: ['reasoning', 'planning', 'communication'],
                    tools: ['shell', 'filesystem', 'browser'],
                },
            },
            {
                id: 'researcher',
                name: 'Research Agent',
                type: 'researcher',
                status: 'idle',
                metadata: {
                    description: 'Specialized in research and information gathering',
                    capabilities: ['web_search', 'document_analysis', 'fact_checking'],
                    tools: ['browser', 'filesystem'],
                },
            },
            {
                id: 'executor',
                name: 'Executor Agent',
                type: 'executor',
                status: 'idle',
                metadata: {
                    description: 'Handles execution and implementation tasks',
                    capabilities: ['code_execution', 'file_operations', 'system_commands'],
                    tools: ['shell', 'filesystem', 'sandbox'],
                },
            },
        ];
        for (const session of defaultSessions) {
            this.createSession(session.id, session.name, session.type, session.metadata);
        }
    }
    createSession(id, name, type, metadata) {
        const session = {
            id,
            name,
            type,
            status: 'active',
            createdAt: new Date(),
            lastActivity: new Date(),
            metadata,
        };
        this.sessions.set(id, session);
        this.messageQueue.set(id, []);
        this.history.set(id, []);
        console.log(`Agent session created: ${name} (${id})`);
        return session;
    }
    getSession(sessionId) {
        return this.sessions.get(sessionId);
    }
    getAllSessions() {
        return Array.from(this.sessions.values());
    }
    getActiveSessions() {
        return Array.from(this.sessions.values()).filter((s) => s.status === 'active' || s.status === 'idle');
    }
    updateSessionStatus(sessionId, status) {
        const session = this.sessions.get(sessionId);
        if (!session)
            return false;
        session.status = status;
        session.lastActivity = new Date();
        this.sessions.set(sessionId, session);
        console.log(`Session ${sessionId} status updated: ${status}`);
        return true;
    }
    terminateSession(sessionId) {
        const session = this.sessions.get(sessionId);
        if (!session)
            return false;
        session.status = 'terminated';
        session.lastActivity = new Date();
        this.sessions.set(sessionId, session);
        const queue = this.messageQueue.get(sessionId);
        if (queue) {
            this.messageQueue.delete(sessionId);
        }
        console.log(`Session ${sessionId} terminated`);
        return true;
    }
    async sendMessage(fromSession, toSession, content, options) {
        const from = this.sessions.get(fromSession);
        const to = this.sessions.get(toSession);
        if (!from || !to) {
            throw new Error('Invalid session IDs');
        }
        const message = {
            id: randomUUID(),
            fromSession,
            toSession,
            content,
            timestamp: new Date(),
            replyTo: options?.replyTo,
            priority: options?.priority || 'normal',
            metadata: options?.metadata,
        };
        from.lastActivity = new Date();
        this.sessions.set(fromSession, from);
        const queue = this.messageQueue.get(toSession) || [];
        queue.push(message);
        if (options?.replyTo) {
            return new Promise((resolve, reject) => {
                const timeout = setTimeout(() => {
                    this.pendingReplies.delete(message.id);
                    reject(new Error('Reply timeout'));
                }, 30000);
                this.pendingReplies.set(message.id, { resolve, reject, timeout });
            });
        }
        return message.id;
    }
    receiveMessage(sessionId) {
        const queue = this.messageQueue.get(sessionId);
        if (!queue || queue.length === 0)
            return null;
        const message = queue.shift();
        const session = this.sessions.get(sessionId);
        if (session) {
            session.lastActivity = new Date();
            this.sessions.set(sessionId, session);
        }
        return message;
    }
    receiveAllMessages(sessionId) {
        const queue = this.messageQueue.get(sessionId) || [];
        this.messageQueue.set(sessionId, []);
        return queue;
    }
    async replyTo(originalMessageId, content) {
        const pending = this.pendingReplies.get(originalMessageId);
        if (!pending) {
            throw new Error('No pending reply for this message');
        }
        clearTimeout(pending.timeout);
        pending.resolve(content);
        this.pendingReplies.delete(originalMessageId);
    }
    addToHistory(sessionId, role, content, metadata) {
        const history = this.history.get(sessionId) || [];
        history.push({
            id: randomUUID(),
            sessionId,
            role,
            content,
            timestamp: new Date(),
            metadata,
        });
        const session = this.sessions.get(sessionId);
        if (session) {
            session.lastActivity = new Date();
            this.sessions.set(sessionId, session);
        }
        this.history.set(sessionId, history);
    }
    getHistory(sessionId, limit) {
        const history = this.history.get(sessionId) || [];
        if (limit) {
            return history.slice(-limit);
        }
        return history;
    }
    clearHistory(sessionId) {
        this.history.set(sessionId, []);
    }
    async broadcastMessage(fromSession, content, exclude) {
        const results = [];
        for (const [sessionId, session] of this.sessions.entries()) {
            if (sessionId === fromSession)
                continue;
            if (exclude?.includes(sessionId))
                continue;
            if (session.status === 'terminated')
                continue;
            try {
                const messageId = await this.sendMessage(fromSession, sessionId, content);
                if (messageId) {
                    results.push(messageId);
                }
            }
            catch (error) {
                console.error(`Failed to broadcast to ${sessionId}:`, error);
            }
        }
        return results;
    }
    getStats() {
        const stats = {
            total: this.sessions.size,
            active: 0,
            idle: 0,
            busy: 0,
            terminated: 0,
            pendingMessages: 0,
        };
        for (const session of this.sessions.values()) {
            switch (session.status) {
                case 'active':
                    stats.active++;
                    break;
                case 'idle':
                    stats.idle++;
                    break;
                case 'busy':
                    stats.busy++;
                    break;
                case 'terminated':
                    stats.terminated++;
                    break;
            }
        }
        for (const queue of this.messageQueue.values()) {
            stats.pendingMessages += queue.length;
        }
        return stats;
    }
    pruneInactive(maxAge = 3600000) {
        const cutoff = new Date(Date.now() - maxAge);
        let removed = 0;
        for (const [sessionId, session] of this.sessions.entries()) {
            if (session.status === 'terminated' && session.lastActivity < cutoff) {
                this.sessions.delete(sessionId);
                this.messageQueue.delete(sessionId);
                this.history.delete(sessionId);
                removed++;
            }
        }
        return removed;
    }
}
export const sessionManager = new SessionManager();
export const sessionTools = {
    async sessions_list() {
        return sessionManager.getActiveSessions();
    },
    async sessions_history(sessionId, limit) {
        return sessionManager.getHistory(sessionId, limit);
    },
    async sessions_send(fromSession, toSession, content, options) {
        return sessionManager.sendMessage(fromSession, toSession, content, options);
    },
    async sessions_spawn(parentSessionId, childId, childName, childType, capabilities, tools) {
        const parent = sessionManager.getSession(parentSessionId);
        if (!parent)
            return null;
        return sessionManager.createSession(childId, childName, childType, {
            description: `Spawned from ${parent.name}`,
            capabilities,
            tools,
            context: { parentSession: parentSessionId },
        });
    },
};
//# sourceMappingURL=sessions.js.map