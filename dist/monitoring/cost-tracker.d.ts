export interface TokenPricing {
    provider: string;
    model: string;
    inputCostPer1kTokens: number;
    outputCostPer1kTokens: number;
}
export interface TokenUsage {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
}
export interface CostEntry {
    id: string;
    sessionId: string;
    userId: string;
    provider: string;
    model: string;
    usage: TokenUsage;
    costUsd: number;
    timestamp: Date;
    operation?: string;
}
export interface SessionCost {
    sessionId: string;
    userId: string;
    totalTokens: number;
    totalCostUsd: number;
    entries: CostEntry[];
    startedAt: Date;
    lastActivityAt: Date;
}
export interface UserCostSummary {
    userId: string;
    totalCostUsd: number;
    totalTokens: number;
    sessionCount: number;
    dailyBreakdown: {
        date: string;
        costUsd: number;
        tokens: number;
    }[];
    modelBreakdown: {
        model: string;
        costUsd: number;
        tokens: number;
    }[];
}
export declare class CostTracker {
    private entries;
    private customPricing;
    addCustomPricing(pricing: TokenPricing): void;
    getPricing(provider: string, model: string): TokenPricing | undefined;
    calculateCost(provider: string, model: string, usage: TokenUsage): number;
    track(sessionId: string, userId: string, provider: string, model: string, usage: TokenUsage, operation?: string): CostEntry;
    getSessionCost(sessionId: string): SessionCost | null;
    getUserCostSummary(userId: string, sinceDays?: number): UserCostSummary;
    getGlobalStats(): {
        totalEntries: number;
        totalCostUsd: number;
        totalTokens: number;
        byProvider: {
            provider: string;
            costUsd: number;
            tokens: number;
        }[];
    };
    clearEntries(olderThanDays?: number): number;
    getSupportedModels(): {
        provider: string;
        model: string;
    }[];
}
export declare const costTracker: CostTracker;
//# sourceMappingURL=cost-tracker.d.ts.map