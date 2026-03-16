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

class LlmOpsTelemetry {
  private routingSimple = 0;
  private routingMedium = 0;
  private routingComplex = 0;

  private budgetAllow = 0;
  private budgetDowngrade = 0;
  private budgetUserLimit = 0;
  private budgetGlobalLimit = 0;

  private spendTotalUsd = 0;
  private routingByModel = new Map<string, number>();
  private spendByModel = new Map<string, number>();
  private updatedAt = new Date();

  trackRoutingDecision(tier: 'simple' | 'medium' | 'complex', model: string): void {
    if (tier === 'simple') this.routingSimple++;
    if (tier === 'medium') this.routingMedium++;
    if (tier === 'complex') this.routingComplex++;
    this.routingByModel.set(model, (this.routingByModel.get(model) || 0) + 1);
    this.updatedAt = new Date();
  }

  trackBudgetEvent(event: BudgetEventType): void {
    if (event === 'allow') this.budgetAllow++;
    if (event === 'downgrade') this.budgetDowngrade++;
    if (event === 'user_limit') this.budgetUserLimit++;
    if (event === 'global_limit') this.budgetGlobalLimit++;
    this.updatedAt = new Date();
  }

  trackSpend(model: string, usd: number): void {
    if (usd <= 0) return;
    this.spendTotalUsd += usd;
    this.spendByModel.set(model, (this.spendByModel.get(model) || 0) + usd);
    this.updatedAt = new Date();
  }

  getSnapshot(): LlmOpsSnapshot {
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
