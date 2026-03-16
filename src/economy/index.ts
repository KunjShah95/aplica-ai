import { db } from '../db/index.js';
import { randomUUID } from 'crypto';

export interface TokenCost {
  inputTokens: number;
  outputTokens: number;
  model: string;
  pricePerMillion: {
    input: number;
    output: number;
  };
}

export interface TaskIncome {
  taskId: string;
  taskType: string;
  amount: number;
  currency: string;
  userId: string;
  completedAt: Date;
}

export interface AgentBalance {
  agentId: string;
  balance: number;
  totalEarned: number;
  totalSpent: number;
  survivalScore: number;
  streak: number;
  lastActivityAt: Date;
}

export interface EconomicConfig {
  baseRate: number;
  survivalThreshold: number;
  taskRates: Record<string, number>;
  penaltyMultiplier: number;
  bonusMultiplier: number;
}

export class AgentEconomy {
  private balances: Map<string, AgentBalance> = new Map();
  private transactions: Map<string, Transaction[]> = new Map();
  private config: EconomicConfig;

  constructor(config?: Partial<EconomicConfig>) {
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

  async initializeAgent(agentId: string, initialBalance: number = 10): Promise<AgentBalance> {
    const balance: AgentBalance = {
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

  async recordCost(agentId: string, cost: TokenCost): Promise<boolean> {
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

  async recordIncome(
    agentId: string,
    income: Omit<TaskIncome, 'completedAt'>
  ): Promise<AgentBalance> {
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

  private getTaskMultiplier(taskType: string): number {
    if (taskType in this.config.taskRates) {
      return this.config.taskRates[taskType] / this.config.baseRate;
    }
    return this.config.taskRates['default'] / this.config.baseRate;
  }

  private calculateSurvivalScore(balance: AgentBalance): number {
    const netRate =
      balance.totalEarned > 0
        ? (balance.totalEarned - balance.totalSpent) / balance.totalEarned
        : -1;

    const score = Math.max(0, Math.min(100, (netRate + 1) * 50));

    if (balance.balance < this.config.survivalThreshold) {
      return Math.max(0, score - 20);
    }

    return score;
  }

  private recordTransaction(agentId: string, transaction: Transaction): void {
    const agentTransactions = this.transactions.get(agentId) || [];
    agentTransactions.push(transaction);

    if (agentTransactions.length > 1000) {
      agentTransactions.shift();
    }

    this.transactions.set(agentId, agentTransactions);
  }

  getBalance(agentId: string): AgentBalance | undefined {
    return this.balances.get(agentId);
  }

  getTransactions(agentId: string, limit: number = 50): Transaction[] {
    const transactions = this.transactions.get(agentId) || [];
    return transactions.slice(-limit).reverse();
  }

  async getLeaderboard(limit: number = 10): Promise<AgentBalance[]> {
    return Array.from(this.balances.values())
      .sort((a, b) => b.balance - a.balance)
      .slice(0, limit);
  }

  async checkSurvival(agentId: string): Promise<{ alive: boolean; reason?: string }> {
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

  async applyPenalty(agentId: string, reason: string): Promise<void> {
    const balance = this.balances.get(agentId);
    if (!balance) return;

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

  async applyBonus(agentId: string, reason: string): Promise<void> {
    const balance = this.balances.get(agentId);
    if (!balance) return;

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

  private async persistBalance(balance: AgentBalance): Promise<void> {
    try {
      await db.$queryRaw`
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
    } catch (error) {
      console.error('Failed to persist agent balance:', error);
    }
  }

  getStats(): {
    totalAgents: number;
    averageBalance: number;
    totalVolume: number;
    survivalRate: number;
  } {
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

export interface Transaction {
  id: string;
  type: 'cost' | 'income' | 'penalty' | 'bonus';
  amount: number;
  description: string;
  timestamp: Date;
}

export const agentEconomy = new AgentEconomy();

export class TaskPaymentService {
  private economy: AgentEconomy;

  constructor(economy: AgentEconomy) {
    this.economy = economy;
  }

  async completeTask(
    agentId: string,
    taskType: string,
    taskId: string,
    userId: string
  ): Promise<{ success: boolean; amount: number }> {
    const rates: Record<string, number> = {
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

  async chargeForRequest(
    agentId: string,
    tokens: { input: number; output: number },
    model: string
  ): Promise<boolean> {
    const prices: Record<string, { input: number; output: number }> = {
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
