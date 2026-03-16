export interface BudgetCheckResult {
    allowed: boolean;
    reason?: 'user_limit_exceeded' | 'global_limit_exceeded';
    userRemainingUsd: number;
    globalRemainingUsd: number;
}
interface BudgetGovernorConfig {
    enabled: boolean;
    dailyUserUsd: number;
    dailyGlobalUsd: number;
}
export declare class BudgetGovernor {
    private readonly config;
    private dayKey;
    private userSpend;
    private globalSpend;
    constructor(config?: Partial<BudgetGovernorConfig>);
    estimateCost(provider: string, model: string, promptTokens: number, completionTokens: number): number;
    check(userId: string, estimatedCostUsd: number): BudgetCheckResult;
    record(userId: string, actualCostUsd: number): void;
    getCurrentSpend(userId: string): {
        userUsd: number;
        globalUsd: number;
        dayKey: string;
    };
    private rotateIfNeeded;
    private getCurrentDayKey;
}
export declare const budgetGovernor: BudgetGovernor;
export {};
//# sourceMappingURL=budget-governor.d.ts.map