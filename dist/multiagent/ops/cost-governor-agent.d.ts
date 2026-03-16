import { Agent } from '../../core/agent.js';
import { AgentOptions } from '../../core/agent.js';
import { CostTracking } from '../types.js';
/**
 * Cost Governor Agent - Budget management and model selection
 */
export declare class CostGovernorAgent extends Agent {
    private budgets;
    private costs;
    private currentSpending;
    private modelCosts;
    private budgetExceeded;
    constructor(options: AgentOptions);
    /**
     * Set budget for a user or deployment
     */
    setBudget(id: string, budget: Budget): void;
    /**
     * Track token usage and cost
     */
    trackUsage(tokensUsed: number, model: string, userId?: string, agentId?: string): CostTracking;
    /**
     * Calculate cost for token usage
     */
    private calculateCost;
    /**
     * Record cost for a user/deployment
     */
    private recordCost;
    /**
     * Check if budget is exceeded
     */
    private checkBudget;
    /**
     * Check if model should be downgraded due to budget
     */
    shouldDowngrade(model: string, userId?: string): boolean;
    /**
     * Get suggested model based on budget and task
     */
    suggestModel(taskComplexity: 'simple' | 'medium' | 'complex', userId?: string): 'haiku' | 'sonnet' | 'opus';
    /**
     * Get cost history for a user/deployment
     */
    getCostHistory(id: string, limit?: number): CostTracking[];
    /**
     * Get current spending
     */
    getCurrentSpending(id: string): number;
    /**
     * Get budget status
     */
    getBudgetStatus(id: string): {
        current: number;
        max: number;
        remaining: number;
        percentage: number;
        exceeded: boolean;
    };
    /**
     * Reset spending for a user/deployment
     */
    resetSpending(id: string): void;
    /**
     * Get global cost summary
     */
    getGlobalSummary(): {
        totalCost: number;
        byModel: Record<string, number>;
        byUser: Record<string, number>;
        agents: Record<string, number>;
    };
}
export interface Budget {
    max: number;
    period?: 'daily' | 'weekly' | 'monthly';
    alertThreshold?: number;
}
/**
 * Factory function to create a cost governor agent
 */
export declare function createCostGovernorAgent(options: AgentOptions): CostGovernorAgent;
//# sourceMappingURL=cost-governor-agent.d.ts.map