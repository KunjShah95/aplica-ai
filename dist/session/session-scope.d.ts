export type Platform = 'telegram' | 'discord' | 'whatsapp' | 'websocket' | 'cli' | 'signal' | 'googlechat' | 'msteams' | 'matrix' | 'slack' | 'webchat';
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
export declare class SessionScopeManager {
    private sessions;
    private peerToSession;
    private identityLinks;
    private getPeerKey;
    resolveSession(options: SessionResolutionOptions): Promise<SessionScope | undefined>;
    createSession(options: CreateSessionOptions): Promise<SessionScope | undefined>;
    getSession(sessionId: string): SessionScope | undefined;
    getSessionByPeer(platform: Platform, peerId: string, channelId?: string): SessionScope | undefined;
    updateActivity(sessionId: string): void;
    linkIdentity(userId: string, options: {
        platform: Platform;
        platformUserId: string;
        identityToken: string;
    }): Promise<void>;
    private resolveIdentity;
    getUserSessions(userId: string): Promise<SessionScope[]>;
    getSessionsByPlatform(platform: Platform): Promise<SessionScope[]>;
    endSession(sessionId: string): Promise<void>;
    endAllUserSessions(userId: string): Promise<number>;
    getStats(): {
        totalSessions: number;
        byPlatform: Record<string, number>;
        oldestSession: Date | null;
    };
}
export declare const sessionScopeManager: SessionScopeManager;
export declare class ConversationContextBuilder {
    private sessionManager;
    constructor(sessionManager: SessionScopeManager);
    buildContext(sessionId: string): Promise<ConversationContext>;
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
export declare const conversationContextBuilder: ConversationContextBuilder;
//# sourceMappingURL=session-scope.d.ts.map