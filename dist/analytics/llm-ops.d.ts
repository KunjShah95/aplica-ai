export type BudgetEventType = 'allow' | 'downgrade' | 'user_limit' | 'global_limit';
export interface LlmOpsSnapshot {
    routing: {
        simple: number;
        medium: number;
        complex: number;
        total: number;
        byModel: Record<string, number>;
    };
    budget: {
        allow: number;
        downgrade: number;
        userLimit: number;
        globalLimit: number;
    };
    spend: {
        totalUsd: number;
        byModel: Record<string, number>;
    };
    updatedAt: string;
}
declare class LlmOpsTelemetry {
    private routingSimple;
    private routingMedium;
    private routingComplex;
    private budgetAllow;
    private budgetDowngrade;
    private budgetUserLimit;
    private budgetGlobalLimit;
    private spendTotalUsd;
    private routingByModel;
    private spendByModel;
    private updatedAt;
    trackRoutingDecision(tier: 'simple' | 'medium' | 'complex', model: string): void;
    trackBudgetEvent(event: BudgetEventType): void;
    trackSpend(model: string, usd: number): void;
    getSnapshot(): LlmOpsSnapshot;
}
export declare const llmOpsTelemetry: LlmOpsTelemetry;
export {};
//# sourceMappingURL=llm-ops.d.ts.map