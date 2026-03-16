import { Agent } from '../../core/agent.js';
/**
 * Cost Governor Agent - Budget management and model selection
 */
export class CostGovernorAgent extends Agent {
    budgets = new Map();
    costs = new Map();
    currentSpending = new Map();
    modelCosts = {
        haiku: { input: 0.00000025, output: 0.000001 },
        sonnet: { input: 0.0000015, output: 0.0000075 },
        opus: { input: 0.000015, output: 0.000075 },
    };
    budgetExceeded = new Set();
    constructor(options) {
        super(options);
    }
    /**
     * Set budget for a user or deployment
     */
    setBudget(id, budget) {
        this.budgets.set(id, budget);
        this.currentSpending.set(id, 0);
        this.budgetExceeded.delete(id);
        console.log(`[CostGovernorAgent] Budget set: ${id} = $${budget.max.toLocaleString()}`);
    }
    /**
     * Track token usage and cost
     */
    trackUsage(tokensUsed, model, userId, agentId) {
        const cost = this.calculateCost(tokensUsed, model);
        const record = {
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
    calculateCost(tokensUsed, model) {
        const costs = this.modelCosts[model] || { input: 0, output: 0 };
        // Assume 50% input, 50% output for simplicity
        return tokensUsed * 0.5 * costs.input + tokensUsed * 0.5 * costs.output;
    }
    /**
     * Record cost for a user/deployment
     */
    recordCost(id, cost, record) {
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
    checkBudget(id) {
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
    shouldDowngrade(model, userId) {
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
    suggestModel(taskComplexity, userId) {
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
    getCostHistory(id, limit = 100) {
        return (this.costs.get(id) || []).slice(-limit);
    }
    /**
     * Get current spending
     */
    getCurrentSpending(id) {
        return this.currentSpending.get(id) || 0;
    }
    /**
     * Get budget status
     */
    getBudgetStatus(id) {
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
    resetSpending(id) {
        this.currentSpending.delete(id);
        this.budgetExceeded.delete(id);
        console.log(`[CostGovernorAgent] Spending reset for ${id}`);
    }
    /**
     * Get global cost summary
     */
    getGlobalSummary() {
        let totalCost = 0;
        const byModel = {};
        const byUser = {};
        const agents = {};
        for (const costs of this.costs.values()) {
            for (const cost of costs) {
                totalCost += cost.cost;
                byModel[cost.model] = (byModel[cost.model] || 0) + cost.cost;
                if (cost.userId)
                    byUser[cost.userId] = (byUser[cost.userId] || 0) + cost.cost;
                if (cost.agentId)
                    agents[cost.agentId] = (agents[cost.agentId] || 0) + cost.cost;
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
/**
 * Factory function to create a cost governor agent
 */
export function createCostGovernorAgent(options) {
    return new CostGovernorAgent(options);
}
//# sourceMappingURL=cost-governor-agent.js.map