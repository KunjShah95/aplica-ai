import { EventEmitter } from 'events';
export type PresenceStatus = 'online' | 'away' | 'busy' | 'dnd' | 'offline' | 'invisible';
export interface UserPresence {
    userId: string;
    status: PresenceStatus;
    statusMessage?: string;
    lastSeen: Date;
    platform?: string;
    device?: string;
}
export interface TypingIndicator {
    conversationId: string;
    userId: string;
    isTyping: boolean;
    startedAt?: Date;
}
export declare class PresenceManager extends EventEmitter {
    private presence;
    private typing;
    private activityTimeout;
    private cleanupInterval?;
    constructor(activityTimeout?: number);
    private startCleanup;
    setPresence(userId: string, status: PresenceStatus, options?: {
        statusMessage?: string;
        platform?: string;
        device?: string;
    }): Promise<UserPresence>;
    getPresence(userId: string): UserPresence | undefined;
    updateActivity(userId: string): Promise<void>;
    startTyping(conversationId: string, userId: string): Promise<void>;
    stopTyping(conversationId: string, userId: string): Promise<void>;
    stopAllTyping(conversationId: string): Promise<void>;
    isTyping(conversationId: string, userId: string): boolean;
    getTypingUsers(conversationId: string): string[];
    getConversationPresence(conversationId: string): Promise<Map<string, PresenceStatus>>;
    private pruneInactive;
    getAllPresence(): UserPresence[];
    getOnlineUsers(): UserPresence[];
    getStats(): {
        total: number;
        online: number;
        away: number;
        busy: number;
        offline: number;
        conversationsWithTyping: number;
    };
    cleanup(): Promise<void>;
}
export declare const presenceManager: PresenceManager;
export declare class TypingIndicatorHandler {
    private presenceManager;
    private typingTimeout;
    constructor(presenceManager?: PresenceManager, typingTimeout?: number);
    handleTypingStart(conversationId: string, userId: string): Promise<void>;
    handleTypingStop(conversationId: string, userId: string): Promise<void>;
}
export declare const typingHandler: TypingIndicatorHandler;
//# sourceMappingURL=presence.d.ts.map