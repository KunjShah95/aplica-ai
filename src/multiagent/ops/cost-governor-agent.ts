import { randomUUID } from 'crypto';
import { Agent } from '../../core/agent.js';
import { AgentOptions } from '../../core/agent.js';
import { CostTracking } from '../types.js';

/**
 * Cost Governor Agent - Budget management and model selection
 */
export class CostGovernorAgent extends Agent {
  private budgets: Map<string, Budget> = new Map();
  private costs: Map<string, CostTracking[]> = new Map();
  private currentSpending: Map<string, number> = new Map();
  private modelCosts: Record<string, { input: number; output: number }> = {
    haiku: { input: 0.00000025, output: 0.000001 },
    sonnet: { input: 0.0000015, output: 0.0000075 },
    opus: { input: 0.000015, output: 0.000075 },
  };
  private budgetExceeded: Set<string> = new Set();

  constructor(options: AgentOptions) {
    super(options);
  }

  /**
   * Set budget for a user or deployment
   */
  setBudget(id: string, budget: Budget): void {
    this.budgets.set(id, budget);
    this.currentSpending.set(id, 0);
    this.budgetExceeded.delete(id);
    console.log(`[CostGovernorAgent] Budget set: ${id} = $${budget.max.toLocaleString()}`);
  }

  /**
   * Track token usage and cost
   */
  trackUsage(
    tokensUsed: number,
    model: string,
    userId?: string,
    agentId?: string
  ): CostTracking {
    const cost = this.calculateCost(tokensUsed, model);
    const record: CostTracking = {
      tokensUsed,
      cost,
      model,
      timestamp: new Date(),
      userId,
      agentId,
    };

    this.recordCost(userId || 'global', cost, record);
    return record;
  }

  /**
   * Calculate cost for token usage
   */
  private calculateCost(tokensUsed: number, model: string): number {
    const costs = this.modelCosts[model] || { input: 0, output: 0 };
    // Assume 50% input, 50% output for simplicity
    return tokensUsed * 0.5 * costs.input + tokensUsed * 0.5 * costs.output;
  }

  /**
   * Record cost for a user/deployment
   */
  private recordCost(id: string, cost: number, record: CostTracking): void {
    const costs = this.costs.get(id) || [];
    costs.push(record);
    this.costs.set(id, costs);

    const current = this.currentSpending.get(id) || 0;
    this.currentSpending.set(id, current + cost);

    // Check budget
    this.checkBudget(id);
  }

  /**
   * Check if budget is exceeded
   */
  private checkBudget(id: string): void {
    const budget = this.budgets.get(id);
    const current = this.currentSpending.get(id) || 0;

    if (budget && current > budget.max) {
      this.budgetExceeded.add(id);
      console.warn(`[CostGovernorAgent] Budget exceeded for ${id}: $${current.toLocaleString()} > $${budget.max.toLocaleString()}`);
    }
  }

  /**
   * Check if model should be downgraded due to budget
   */
  shouldDowngrade(model: string, userId?: string): boolean {
    const budgetId = userId || 'global';
    const current = this.currentSpending.get(budgetId) || 0;
    const budget = this.budgets.get(budgetId);

    if (budget && current >= budget.max) {
      return true;
    }

    return false;
  }

  /**
   * Get suggested model based on budget and task
   */
  suggestModel(
    taskComplexity: 'simple' | 'medium' | 'complex',
    userId?: string
  ): 'haiku' | 'sonnet' | 'opus' {
    const budgetId = userId || 'global';
    const current = this.currentSpending.get(budgetId) || 0;
    const budget = this.budgets.get(budgetId);

    // Check budget status
    if (budget && current >= budget.max) {
      return 'haiku';
    }

    if (budget && current >= budget.max * 0.9) {
      return 'sonnet';
    }

    // Use task complexity to determine model
    switch (taskComplexity) {
      case 'simple':
        return 'haiku';
      case 'medium':
        return 'sonnet';
      case 'complex':
        return 'opus';
    }
  }

  /**
   * Get cost history for a user/deployment
   */
  getCostHistory(id: string, limit: number = 100): CostTracking[] {
    return (this.costs.get(id) || []).slice(-limit);
  }

  /**
   * Get current spending
   */
  getCurrentSpending(id: string): number {
    return this.currentSpending.get(id) || 0;
  }

  /**
   * Get budget status
   */
  getBudgetStatus(id: string): {
    current: number;
    max: number;
    remaining: number;
    percentage: number;
    exceeded: boolean;
  } {
    const budget = this.budgets.get(id);
    const current = this.currentSpending.get(id) || 0;

    if (!budget) {
      return {
        current,
        max: 0,
        remaining: 0,
        percentage: 0,
        exceeded: false,
      };
    }

    return {
      current,
      max: budget.max,
      remaining: budget.max - current,
      percentage: (current / budget.max) * 100,
      exceeded: this.budgetExceeded.has(id),
    };
  }

  /**
   * Reset spending for a user/deployment
   */
  resetSpending(id: string): void {
    this.currentSpending.delete(id);
    this.budgetExceeded.delete(id);
    console.log(`[CostGovernorAgent] Spending reset for ${id}`);
  }

  /**
   * Get global cost summary
   */
  getGlobalSummary(): {
    totalCost: number;
    byModel: Record<string, number>;
    byUser: Record<string, number>;
    agents: Record<string, number>;
  } {
    let totalCost = 0;
    const byModel: Record<string, number> = {};
    const byUser: Record<string, number> = {};
    const agents: Record<string, number> = {};

    for (const costs of this.costs.values()) {
      for (const cost of costs) {
        totalCost += cost.cost;
        byModel[cost.model] = (byModel[cost.model] || 0) + cost.cost;
        if (cost.userId) byUser[cost.userId] = (byUser[cost.userId] || 0) + cost.cost;
        if (cost.agentId) agents[cost.agentId] = (agents[cost.agentId] || 0) + cost.cost;
      }
    }

    return {
      totalCost,
      byModel,
      byUser,
      agents,
    };
  }
}

export interface Budget {
  max: number;
  period?: 'daily' | 'weekly' | 'monthly';
  alertThreshold?: number;
}

/**
 * Factory function to create a cost governor agent
 */
export function createCostGovernorAgent(options: AgentOptions): CostGovernorAgent {
  return new CostGovernorAgent(options);
}
