export interface AgentSession {
    id: string;
    name: string;
    type: 'coordinator' | 'researcher' | 'executor' | 'analyst' | 'creative' | 'custom';
    status: 'active' | 'idle' | 'busy' | 'terminated';
    createdAt: Date;
    lastActivity: Date;
    metadata: AgentSessionMetadata;
}
export interface AgentSessionMetadata {
    description?: string;
    capabilities: string[];
    tools: string[];
    model?: string;
    context?: Record<string, unknown>;
}
export interface SessionMessage {
    id: string;
    fromSession: string;
    toSession: string;
    content: string;
    timestamp: Date;
    replyTo?: string;
    priority?: 'low' | 'normal' | 'high' | 'urgent';
    metadata?: Record<string, unknown>;
}
export interface SessionHistoryEntry {
    id: string;
    sessionId: string;
    role: 'user' | 'assistant' | 'system';
    content: string;
    timestamp: Date;
    metadata?: Record<string, unknown>;
}
export declare class SessionManager {
    private sessions;
    private messageQueue;
    private history;
    private pendingReplies;
    constructor();
    private createDefaultSessions;
    createSession(id: string, name: string, type: 'coordinator' | 'researcher' | 'executor' | 'analyst' | 'creative' | 'custom', metadata: AgentSessionMetadata): AgentSession;
    getSession(sessionId: string): AgentSession | undefined;
    getAllSessions(): AgentSession[];
    getActiveSessions(): AgentSession[];
    updateSessionStatus(sessionId: string, status: 'active' | 'idle' | 'busy' | 'terminated'): boolean;
    terminateSession(sessionId: string): boolean;
    sendMessage(fromSession: string, toSession: string, content: string, options?: {
        replyTo?: string;
        priority?: 'low' | 'normal' | 'high' | 'urgent';
        metadata?: Record<string, unknown>;
    }): Promise<string | null>;
    receiveMessage(sessionId: string): SessionMessage | null;
    receiveAllMessages(sessionId: string): SessionMessage[];
    replyTo(originalMessageId: string, content: string): Promise<void>;
    addToHistory(sessionId: string, role: 'user' | 'assistant' | 'system', content: string, metadata?: Record<string, unknown>): void;
    getHistory(sessionId: string, limit?: number): SessionHistoryEntry[];
    clearHistory(sessionId: string): void;
    broadcastMessage(fromSession: string, content: string, exclude?: string[]): Promise<string[]>;
    getStats(): {
        total: number;
        active: number;
        idle: number;
        busy: number;
        terminated: number;
        pendingMessages: number;
    };
    pruneInactive(maxAge?: number): number;
}
export declare const sessionManager: SessionManager;
export declare const sessionTools: {
    sessions_list(): Promise<AgentSession[]>;
    sessions_history(sessionId: string, limit?: number): Promise<SessionHistoryEntry[]>;
    sessions_send(fromSession: string, toSession: string, content: string, options?: {
        replyTo?: string;
        priority?: "low" | "normal" | "high" | "urgent";
    }): Promise<string | null>;
    sessions_spawn(parentSessionId: string, childId: string, childName: string, childType: "coordinator" | "researcher" | "executor" | "analyst" | "creative" | "custom", capabilities: string[], tools: string[]): Promise<AgentSession | null>;
};
//# sourceMappingURL=sessions.d.ts.map