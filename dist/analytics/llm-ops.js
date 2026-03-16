class LlmOpsTelemetry {
    routingSimple = 0;
    routingMedium = 0;
    routingComplex = 0;
    budgetAllow = 0;
    budgetDowngrade = 0;
    budgetUserLimit = 0;
    budgetGlobalLimit = 0;
    spendTotalUsd = 0;
    routingByModel = new Map();
    spendByModel = new Map();
    updatedAt = new Date();
    trackRoutingDecision(tier, model) {
        if (tier === 'simple')
            this.routingSimple++;
        if (tier === 'medium')
            this.routingMedium++;
        if (tier === 'complex')
            this.routingComplex++;
        this.routingByModel.set(model, (this.routingByModel.get(model) || 0) + 1);
        this.updatedAt = new Date();
    }
    trackBudgetEvent(event) {
        if (event === 'allow')
            this.budgetAllow++;
        if (event === 'downgrade')
            this.budgetDowngrade++;
        if (event === 'user_limit')
            this.budgetUserLimit++;
        if (event === 'global_limit')
            this.budgetGlobalLimit++;
        this.updatedAt = new Date();
    }
    trackSpend(model, usd) {
        if (usd <= 0)
            return;
        this.spendTotalUsd += usd;
        this.spendByModel.set(model, (this.spendByModel.get(model) || 0) + usd);
        this.updatedAt = new Date();
    }
    getSnapshot() {
        return {
            routing: {
                simple: this.routingSimple,
                medium: this.routingMedium,
                complex: this.routingComplex,
                total: this.routingSimple + this.routingMedium + this.routingComplex,
                byModel: Object.fromEntries(this.routingByModel),
            },
            budget: {
                allow: this.budgetAllow,
                downgrade: this.budgetDowngrade,
                userLimit: this.budgetUserLimit,
                globalLimit: this.budgetGlobalLimit,
            },
            spend: {
                totalUsd: this.spendTotalUsd,
                byModel: Object.fromEntries(this.spendByModel),
            },
            updatedAt: this.updatedAt.toISOString(),
        };
    }
}
export const llmOpsTelemetry = new LlmOpsTelemetry();
//# sourceMappingURL=llm-ops.js.map