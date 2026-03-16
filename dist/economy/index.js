import { db } from '../db/index.js';
import { randomUUID } from 'crypto';
export class AgentEconomy {
    balances = new Map();
    transactions = new Map();
    config;
    constructor(config) {
        this.config = {
            baseRate: 0.001,
            survivalThreshold: 0,
            taskRates: {
                message: 0.01,
                task_completion: 0.05,
                research: 0.1,
                code_review: 0.05,
                analysis: 0.08,
                summarization: 0.03,
                data_processing: 0.06,
                default: 0.02,
            },
            penaltyMultiplier: 1.0,
            bonusMultiplier: 1.5,
            ...config,
        };
    }
    async initializeAgent(agentId, initialBalance = 10) {
        const balance = {
            agentId,
            balance: initialBalance,
            totalEarned: 0,
            totalSpent: 0,
            survivalScore: 100,
            streak: 0,
            lastActivityAt: new Date(),
        };
        this.balances.set(agentId, balance);
        await this.persistBalance(balance);
        return balance;
    }
    async recordCost(agentId, cost) {
        const balance = this.balances.get(agentId);
        if (!balance) {
            console.error(`Agent ${agentId} not found`);
            return false;
        }
        const inputCost = (cost.inputTokens / 1000000) * cost.pricePerMillion.input;
        const outputCost = (cost.outputTokens / 1000000) * cost.pricePerMillion.output;
        const totalCost = inputCost + outputCost;
        balance.balance -= totalCost;
        balance.totalSpent += totalCost;
        balance.survivalScore = this.calculateSurvivalScore(balance);
        this.recordTransaction(agentId, {
            id: randomUUID(),
            type: 'cost',
            amount: -totalCost,
            description: `LLM: ${cost.model} (${cost.inputTokens} in / ${cost.outputTokens} out)`,
            timestamp: new Date(),
        });
        await this.persistBalance(balance);
        return balance.balance > this.config.survivalThreshold;
    }
    async recordIncome(agentId, income) {
        let balance = this.balances.get(agentId);
        if (!balance) {
            balance = await this.initializeAgent(agentId);
        }
        const amount = income.amount * (income.taskType ? this.getTaskMultiplier(income.taskType) : 1);
        balance.balance += amount;
        balance.totalEarned += amount;
        balance.streak += 1;
        balance.survivalScore = this.calculateSurvivalScore(balance);
        balance.lastActivityAt = new Date();
        this.recordTransaction(agentId, {
            id: randomUUID(),
            type: 'income',
            amount,
            description: `Task: ${income.taskType} - ${income.taskId}`,
            timestamp: new Date(),
        });
        await this.persistBalance(balance);
        return balance;
    }
    getTaskMultiplier(taskType) {
        if (taskType in this.config.taskRates) {
            return this.config.taskRates[taskType] / this.config.baseRate;
        }
        return this.config.taskRates['default'] / this.config.baseRate;
    }
    calculateSurvivalScore(balance) {
        const netRate = balance.totalEarned > 0
            ? (balance.totalEarned - balance.totalSpent) / balance.totalEarned
            : -1;
        const score = Math.max(0, Math.min(100, (netRate + 1) * 50));
        if (balance.balance < this.config.survivalThreshold) {
            return Math.max(0, score - 20);
        }
        return score;
    }
    recordTransaction(agentId, transaction) {
        const agentTransactions = this.transactions.get(agentId) || [];
        agentTransactions.push(transaction);
        if (agentTransactions.length > 1000) {
            agentTransactions.shift();
        }
        this.transactions.set(agentId, agentTransactions);
    }
    getBalance(agentId) {
        return this.balances.get(agentId);
    }
    getTransactions(agentId, limit = 50) {
        const transactions = this.transactions.get(agentId) || [];
        return transactions.slice(-limit).reverse();
    }
    async getLeaderboard(limit = 10) {
        return Array.from(this.balances.values())
            .sort((a, b) => b.balance - a.balance)
            .slice(0, limit);
    }
    async checkSurvival(agentId) {
        const balance = this.balances.get(agentId);
        if (!balance) {
            return { alive: false, reason: 'Agent not found' };
        }
        if (balance.balance < this.config.survivalThreshold) {
            return { alive: false, reason: 'Balance below survival threshold' };
        }
        const inactiveTime = Date.now() - balance.lastActivityAt.getTime();
        if (inactiveTime > 24 * 60 * 60 * 1000) {
            return { alive: false, reason: 'No activity for 24 hours' };
        }
        if (balance.survivalScore < 20) {
            return { alive: false, reason: 'Survival score critically low' };
        }
        return { alive: true };
    }
    async applyPenalty(agentId, reason) {
        const balance = this.balances.get(agentId);
        if (!balance)
            return;
        const penalty = balance.balance * this.config.penaltyMultiplier * 0.1;
        balance.balance -= penalty;
        balance.streak = 0;
        this.recordTransaction(agentId, {
            id: randomUUID(),
            type: 'penalty',
            amount: -penalty,
            description: reason,
            timestamp: new Date(),
        });
        await this.persistBalance(balance);
    }
    async applyBonus(agentId, reason) {
        const balance = this.balances.get(agentId);
        if (!balance)
            return;
        const bonus = balance.balance * this.config.bonusMultiplier * 0.1;
        balance.balance += bonus;
        this.recordTransaction(agentId, {
            id: randomUUID(),
            type: 'bonus',
            amount: bonus,
            description: reason,
            timestamp: new Date(),
        });
        await this.persistBalance(balance);
    }
    async persistBalance(balance) {
        try {
            await db.$queryRaw `
        INSERT INTO agent_balances (id, agent_id, balance, total_earned, total_spent, survival_score, streak, last_activity_at)
        VALUES (${randomUUID()}, ${balance.agentId}, ${balance.balance}, ${balance.totalEarned}, ${balance.totalSpent}, ${balance.survivalScore}, ${balance.streak}, ${balance.lastActivityAt})
        ON CONFLICT (agent_id) DO UPDATE SET
          balance = EXCLUDED.balance,
          total_earned = EXCLUDED.total_earned,
          total_spent = EXCLUDED.total_spent,
          survival_score = EXCLUDED.survival_score,
          streak = EXCLUDED.streak,
          last_activity_at = EXCLUDED.last_activity_at
      `;
        }
        catch (error) {
            console.error('Failed to persist agent balance:', error);
        }
    }
    getStats() {
        const agents = Array.from(this.balances.values());
        if (agents.length === 0) {
            return { totalAgents: 0, averageBalance: 0, totalVolume: 0, survivalRate: 0 };
        }
        const totalBalance = agents.reduce((sum, a) => sum + a.balance, 0);
        const totalVolume = agents.reduce((sum, a) => sum + a.totalEarned + a.totalSpent, 0);
        const surviving = agents.filter((a) => a.survivalScore > 20).length;
        return {
            totalAgents: agents.length,
            averageBalance: totalBalance / agents.length,
            totalVolume,
            survivalRate: (surviving / agents.length) * 100,
        };
    }
}
export const agentEconomy = new AgentEconomy();
export class TaskPaymentService {
    economy;
    constructor(economy) {
        this.economy = economy;
    }
    async completeTask(agentId, taskType, taskId, userId) {
        const rates = {
            message: 0.01,
            task_completion: 0.05,
            research: 0.1,
            code_review: 0.05,
            analysis: 0.08,
            summarization: 0.03,
            data_processing: 0.06,
        };
        const baseRate = rates[taskType] || rates['task_completion'];
        const balance = await this.economy.recordIncome(agentId, {
            taskId,
            taskType,
            amount: baseRate,
            currency: 'USD',
            userId,
        });
        return { success: true, amount: baseRate };
    }
    async chargeForRequest(agentId, tokens, model) {
        const prices = {
            'gpt-4': { input: 30, output: 60 },
            'gpt-4-turbo': { input: 10, output: 30 },
            'gpt-3.5-turbo': { input: 0.5, output: 1.5 },
            'claude-3-opus': { input: 15, output: 75 },
            'claude-3-sonnet': { input: 3, output: 15 },
            'claude-3-haiku': { input: 0.25, output: 1.25 },
        };
        const price = prices[model] || { input: 10, output: 30 };
        return this.economy.recordCost(agentId, {
            inputTokens: tokens.input,
            outputTokens: tokens.output,
            model,
            pricePerMillion: price,
        });
    }
}
export const taskPaymentService = new TaskPaymentService(agentEconomy);
//# sourceMappingURL=index.js.map