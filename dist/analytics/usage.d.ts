export interface UsageRecord {
    id: string;
    type: UsageType;
    userId?: string;
    conversationId?: string;
    model?: string;
    tokens: {
        prompt: number;
        completion: number;
        total: number;
    };
    cost: number;
    timestamp: Date;
    metadata?: Record<string, unknown>;
}
export type UsageType = 'llm_request' | 'api_call' | 'function_call' | 'storage' | 'bandwidth' | 'compute' | 'voice_synthesis' | 'voice_recognition' | 'image_generation';
export interface UsageSession {
    id: string;
    userId?: string;
    startTime: Date;
    endTime?: Date;
    records: UsageRecord[];
    totals: {
        tokens: number;
        cost: number;
        apiCalls: number;
    };
}
export interface UsageLimit {
    type: UsageType;
    maxTokens?: number;
    maxCost?: number;
    maxCalls?: number;
    period: 'minute' | 'hour' | 'day' | 'week' | 'month';
}
export interface UsageAlert {
    id: string;
    threshold: number;
    percentage: number;
    triggered: boolean;
    lastTriggered?: Date;
}
export declare class UsageTracker {
    private storagePath;
    private sessions;
    private currentSession?;
    private alerts;
    private limits;
    constructor(storagePath?: string);
    private ensureStorageExists;
    private loadSessions;
    private saveSessions;
    startSession(userId?: string): UsageSession;
    endSession(): UsageSession | undefined;
    record(type: UsageType, data: {
        tokens?: {
            prompt?: number;
            completion?: number;
            total?: number;
        };
        cost?: number;
        model?: string;
        userId?: string;
        conversationId?: string;
        metadata?: Record<string, unknown>;
    }): Promise<UsageRecord>;
    recordLLM(model: string, promptTokens: number, completionTokens: number, cost: number, options?: {
        userId?: string;
        conversationId?: string;
        metadata?: Record<string, unknown>;
    }): Promise<UsageRecord>;
    recordAPICall(apiName: string, cost?: number, options?: {
        userId?: string;
        metadata?: Record<string, unknown>;
    }): Promise<UsageRecord>;
    recordStorage(bytes: number, operation: 'read' | 'write' | 'delete', options?: {
        userId?: string;
    }): Promise<UsageRecord>;
    recordVoice(seconds: number, type: 'synthesis' | 'recognition', options?: {
        userId?: string;
    }): Promise<UsageRecord>;
    private checkLimits;
    private getWindowStart;
    private getUsageInWindow;
    setLimit(limit: UsageLimit): void;
    clearLimits(): void;
    createAlert(threshold: number, percentage: number): UsageAlert;
    private checkAlerts;
    getSession(sessionId?: string): UsageSession | undefined;
    getAllSessions(): UsageSession[];
    getSessionStats(sessionId?: string): {
        tokens: number;
        cost: number;
        apiCalls: number;
        duration: number;
        records: number;
    };
    getStats(period?: {
        start: Date;
        end: Date;
    }): {
        totalTokens: number;
        totalCost: number;
        totalApiCalls: number;
        byType: Record<UsageType, {
            tokens: number;
            cost: number;
            calls: number;
        }>;
    };
    exportCSV(period?: {
        start: Date;
        end: Date;
    }): string;
    prune(maxAge?: number): number;
}
export declare const usageTracker: UsageTracker;
export declare const usageTools: {
    usage_get_stats(): Promise<ReturnType<typeof usageTracker.getStats>>;
    usage_get_session_stats(): Promise<ReturnType<typeof usageTracker.getSessionStats>>;
    usage_record(data: {
        type: string;
        tokens?: number;
        cost?: number;
        model?: string;
    }): Promise<UsageRecord>;
    usage_export_csv(): Promise<string>;
};
//# sourceMappingURL=usage.d.ts.map