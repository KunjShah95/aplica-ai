import { costTracker } from '../monitoring/cost-tracker.js';
export class BudgetGovernor {
    config;
    dayKey;
    userSpend = new Map();
    globalSpend = 0;
    constructor(config) {
        this.config = {
            enabled: process.env.BUDGET_GOVERNOR_ENABLED !== 'false',
            dailyUserUsd: Number(process.env.BUDGET_DAILY_USER_USD || 2),
            dailyGlobalUsd: Number(process.env.BUDGET_DAILY_GLOBAL_USD || 200),
            ...config,
        };
        this.dayKey = this.getCurrentDayKey();
    }
    estimateCost(provider, model, promptTokens, completionTokens) {
        return costTracker.calculateCost(provider, model, {
            promptTokens,
            completionTokens,
            totalTokens: promptTokens + completionTokens,
        });
    }
    check(userId, estimatedCostUsd) {
        this.rotateIfNeeded();
        if (!this.config.enabled) {
            return {
                allowed: true,
                userRemainingUsd: Number.POSITIVE_INFINITY,
                globalRemainingUsd: Number.POSITIVE_INFINITY,
            };
        }
        const currentUserSpend = this.userSpend.get(userId) || 0;
        const projectedUserSpend = currentUserSpend + estimatedCostUsd;
        const projectedGlobalSpend = this.globalSpend + estimatedCostUsd;
        const userRemainingUsd = this.config.dailyUserUsd - currentUserSpend;
        const globalRemainingUsd = this.config.dailyGlobalUsd - this.globalSpend;
        if (projectedUserSpend > this.config.dailyUserUsd) {
            return {
                allowed: false,
                reason: 'user_limit_exceeded',
                userRemainingUsd,
                globalRemainingUsd,
            };
        }
        if (projectedGlobalSpend > this.config.dailyGlobalUsd) {
            return {
                allowed: false,
                reason: 'global_limit_exceeded',
                userRemainingUsd,
                globalRemainingUsd,
            };
        }
        return {
            allowed: true,
            userRemainingUsd,
            globalRemainingUsd,
        };
    }
    record(userId, actualCostUsd) {
        this.rotateIfNeeded();
        if (!this.config.enabled)
            return;
        this.userSpend.set(userId, (this.userSpend.get(userId) || 0) + actualCostUsd);
        this.globalSpend += actualCostUsd;
    }
    getCurrentSpend(userId) {
        this.rotateIfNeeded();
        return {
            userUsd: this.userSpend.get(userId) || 0,
            globalUsd: this.globalSpend,
            dayKey: this.dayKey,
        };
    }
    rotateIfNeeded() {
        const currentDay = this.getCurrentDayKey();
        if (currentDay === this.dayKey) {
            return;
        }
        this.dayKey = currentDay;
        this.userSpend.clear();
        this.globalSpend = 0;
    }
    getCurrentDayKey() {
        return new Date().toISOString().slice(0, 10);
    }
}
export const budgetGovernor = new BudgetGovernor();
//# sourceMappingURL=budget-governor.js.map