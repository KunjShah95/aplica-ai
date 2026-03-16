import { randomUUID } from 'crypto';
import { db } from '../db/index.js';
export class SessionScopeManager {
    sessions = new Map();
    peerToSession = new Map();
    identityLinks = new Map();
    getPeerKey(platform, peerId, channelId) {
        return `${platform}:${peerId}${channelId ? `:${channelId}` : ''}`;
    }
    async resolveSession(options) {
        const peerKey = this.getPeerKey(options.platform, options.peerId, options.channelId);
        const existingSessionId = this.peerToSession.get(peerKey);
        if (existingSessionId) {
            const existingSession = this.sessions.get(existingSessionId);
            if (existingSession) {
                return existingSession;
            }
        }
        if (options.createIfNotExists) {
            const session = await this.createSession({
                platform: options.platform,
                peerId: options.peerId,
                channelId: options.channelId,
                identityToken: options.identityToken,
            });
            if (session) {
                this.peerToSession.set(peerKey, session.sessionId);
            }
            return session;
        }
        return undefined;
    }
    async createSession(options) {
        const sessionId = randomUUID();
        let userId = options.userId || 'anonymous';
        if (options.identityToken) {
            const linkedUser = await this.resolveIdentity(options.platform, options.peerId, options.identityToken);
            if (linkedUser) {
                userId = linkedUser;
            }
        }
        const session = {
            userId,
            peer: {
                platform: options.platform,
                peerId: options.peerId,
                channelId: options.channelId,
            },
            sessionId,
            createdAt: new Date(),
            lastActivityAt: new Date(),
        };
        this.sessions.set(sessionId, session);
        const peerKey = this.getPeerKey(options.platform, options.peerId, options.channelId);
        this.peerToSession.set(peerKey, sessionId);
        try {
            await db.session.upsert({
                where: { id: sessionId },
                create: {
                    id: sessionId,
                    userId: session.userId,
                    token: randomUUID(),
                    deviceInfo: JSON.stringify(session.peer),
                    expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
                },
                update: {
                    userId: session.userId,
                    deviceInfo: JSON.stringify(session.peer),
                },
            });
        }
        catch (error) {
            console.error('Failed to persist session:', error);
        }
        return session;
    }
    getSession(sessionId) {
        return this.sessions.get(sessionId);
    }
    getSessionByPeer(platform, peerId, channelId) {
        const peerKey = this.getPeerKey(platform, peerId, channelId);
        const sessionId = this.peerToSession.get(peerKey);
        return sessionId ? this.sessions.get(sessionId) : undefined;
    }
    updateActivity(sessionId) {
        const session = this.sessions.get(sessionId);
        if (session) {
            session.lastActivityAt = new Date();
        }
    }
    async linkIdentity(userId, options) {
        const link = {
            id: randomUUID(),
            primaryUserId: userId,
            linkedUserId: userId,
            platform: options.platform,
            platformUserId: options.platformUserId,
            linkedAt: new Date(),
            verified: true,
        };
        const key = `${options.platform}:${options.platformUserId}`;
        const existing = this.identityLinks.get(key) || [];
        existing.push(link);
        this.identityLinks.set(key, existing);
    }
    async resolveIdentity(platform, peerId, _token) {
        const key = `${platform}:${peerId}`;
        const links = this.identityLinks.get(key);
        if (links && links.length > 0) {
            return links[0].primaryUserId;
        }
        return null;
    }
    async getUserSessions(userId) {
        return Array.from(this.sessions.values()).filter((s) => s.userId === userId);
    }
    async getSessionsByPlatform(platform) {
        return Array.from(this.sessions.values()).filter((s) => s.peer.platform === platform);
    }
    async endSession(sessionId) {
        const session = this.sessions.get(sessionId);
        if (session) {
            const peerKey = this.getPeerKey(session.peer.platform, session.peer.peerId, session.peer.channelId);
            this.peerToSession.delete(peerKey);
            this.sessions.delete(sessionId);
            await db.session.delete({ where: { id: sessionId } }).catch(() => { });
        }
    }
    async endAllUserSessions(userId) {
        const userSessions = await this.getUserSessions(userId);
        for (const session of userSessions) {
            await this.endSession(session.sessionId);
        }
        return userSessions.length;
    }
    getStats() {
        const byPlatform = {};
        let oldestSession = null;
        for (const session of this.sessions.values()) {
            byPlatform[session.peer.platform] = (byPlatform[session.peer.platform] || 0) + 1;
            if (!oldestSession || session.createdAt < oldestSession) {
                oldestSession = session.createdAt;
            }
        }
        return {
            totalSessions: this.sessions.size,
            byPlatform,
            oldestSession,
        };
    }
}
export const sessionScopeManager = new SessionScopeManager();
export class ConversationContextBuilder {
    sessionManager;
    constructor(sessionManager) {
        this.sessionManager = sessionManager;
    }
    async buildContext(sessionId) {
        const session = this.sessionManager.getSession(sessionId);
        if (!session) {
            throw new Error(`Session not found: ${sessionId}`);
        }
        const userSessions = await this.sessionManager.getUserSessions(session.userId);
        const platformSessions = userSessions.filter((s) => s.peer.platform !== session.peer.platform);
        return {
            session,
            linkedSessions: platformSessions,
            scope: {
                userId: session.userId,
                platform: session.peer.platform,
                peerId: session.peer.peerId,
                channelId: session.peer.channelId,
                sessionId: session.sessionId,
            },
        };
    }
}
export const conversationContextBuilder = new ConversationContextBuilder(sessionScopeManager);
//# sourceMappingURL=session-scope.js.map