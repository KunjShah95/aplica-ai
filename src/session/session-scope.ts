import { randomUUID } from 'crypto';
import { db } from '../db/index.js';

export type Platform =
  | 'telegram'
  | 'discord'
  | 'whatsapp'
  | 'websocket'
  | 'cli'
  | 'signal'
  | 'googlechat'
  | 'msteams'
  | 'matrix'
  | 'slack'
  | 'webchat';

export interface PeerScope {
  platform: Platform;
  peerId: string;
  channelId?: string;
}

export interface SessionScope {
  userId: string;
  peer: PeerScope;
  sessionId: string;
  createdAt: Date;
  lastActivityAt: Date;
}

export interface IdentityLink {
  id: string;
  primaryUserId: string;
  linkedUserId: string;
  platform: Platform;
  platformUserId: string;
  linkedAt: Date;
  verified: boolean;
}

export interface CreateSessionOptions {
  userId?: string;
  platform: Platform;
  peerId: string;
  channelId?: string;
  identityToken?: string;
}

export interface SessionResolutionOptions {
  createIfNotExists?: boolean;
  linkIdentity?: boolean;
  platform: Platform;
  peerId: string;
  channelId?: string;
  identityToken?: string;
}

export class SessionScopeManager {
  private sessions: Map<string, SessionScope> = new Map();
  private peerToSession: Map<string, string> = new Map();
  private identityLinks: Map<string, IdentityLink[]> = new Map();

  private getPeerKey(platform: Platform, peerId: string, channelId?: string): string {
    return `${platform}:${peerId}${channelId ? `:${channelId}` : ''}`;
  }

  async resolveSession(options: SessionResolutionOptions): Promise<SessionScope | undefined> {
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

  async createSession(options: CreateSessionOptions): Promise<SessionScope | undefined> {
    const sessionId = randomUUID();
    let userId = options.userId || 'anonymous';

    if (options.identityToken) {
      const linkedUser = await this.resolveIdentity(
        options.platform,
        options.peerId,
        options.identityToken
      );
      if (linkedUser) {
        userId = linkedUser;
      }
    }

    const session: SessionScope = {
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
    } catch (error) {
      console.error('Failed to persist session:', error);
    }

    return session;
  }

  getSession(sessionId: string): SessionScope | undefined {
    return this.sessions.get(sessionId);
  }

  getSessionByPeer(
    platform: Platform,
    peerId: string,
    channelId?: string
  ): SessionScope | undefined {
    const peerKey = this.getPeerKey(platform, peerId, channelId);
    const sessionId = this.peerToSession.get(peerKey);
    return sessionId ? this.sessions.get(sessionId) : undefined;
  }

  updateActivity(sessionId: string): void {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.lastActivityAt = new Date();
    }
  }

  async linkIdentity(
    userId: string,
    options: { platform: Platform; platformUserId: string; identityToken: string }
  ): Promise<void> {
    const link: IdentityLink = {
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

  private async resolveIdentity(
    platform: Platform,
    peerId: string,
    _token: string
  ): Promise<string | null> {
    const key = `${platform}:${peerId}`;
    const links = this.identityLinks.get(key);

    if (links && links.length > 0) {
      return links[0].primaryUserId;
    }

    return null;
  }

  async getUserSessions(userId: string): Promise<SessionScope[]> {
    return Array.from(this.sessions.values()).filter((s) => s.userId === userId);
  }

  async getSessionsByPlatform(platform: Platform): Promise<SessionScope[]> {
    return Array.from(this.sessions.values()).filter((s) => s.peer.platform === platform);
  }

  async endSession(sessionId: string): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (session) {
      const peerKey = this.getPeerKey(
        session.peer.platform,
        session.peer.peerId,
        session.peer.channelId
      );
      this.peerToSession.delete(peerKey);
      this.sessions.delete(sessionId);

      await db.session.delete({ where: { id: sessionId } }).catch(() => {});
    }
  }

  async endAllUserSessions(userId: string): Promise<number> {
    const userSessions = await this.getUserSessions(userId);

    for (const session of userSessions) {
      await this.endSession(session.sessionId);
    }

    return userSessions.length;
  }

  getStats(): {
    totalSessions: number;
    byPlatform: Record<string, number>;
    oldestSession: Date | null;
  } {
    const byPlatform: Record<string, number> = {};
    let oldestSession: Date | null = null;

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
  constructor(private sessionManager: SessionScopeManager) {}

  async buildContext(sessionId: string): Promise<ConversationContext> {
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

export interface ConversationContext {
  session: SessionScope;
  linkedSessions: SessionScope[];
  scope: {
    userId: string;
    platform: Platform;
    peerId: string;
    channelId?: string;
    sessionId: string;
  };
}

export const conversationContextBuilder = new ConversationContextBuilder(sessionScopeManager);
