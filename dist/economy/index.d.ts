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
export declare class AgentEconomy {
    private balances;
    private transactions;
    private config;
    constructor(config?: Partial<EconomicConfig>);
    initializeAgent(agentId: string, initialBalance?: number): Promise<AgentBalance>;
    recordCost(agentId: string, cost: TokenCost): Promise<boolean>;
    recordIncome(agentId: string, income: Omit<TaskIncome, 'completedAt'>): Promise<AgentBalance>;
    private getTaskMultiplier;
    private calculateSurvivalScore;
    private recordTransaction;
    getBalance(agentId: string): AgentBalance | undefined;
    getTransactions(agentId: string, limit?: number): Transaction[];
    getLeaderboard(limit?: number): Promise<AgentBalance[]>;
    checkSurvival(agentId: string): Promise<{
        alive: boolean;
        reason?: string;
    }>;
    applyPenalty(agentId: string, reason: string): Promise<void>;
    applyBonus(agentId: string, reason: string): Promise<void>;
    private persistBalance;
    getStats(): {
        totalAgents: number;
        averageBalance: number;
        totalVolume: number;
        survivalRate: number;
    };
}
export interface Transaction {
    id: string;
    type: 'cost' | 'income' | 'penalty' | 'bonus';
    amount: number;
    description: string;
    timestamp: Date;
}
export declare const agentEconomy: AgentEconomy;
export declare class TaskPaymentService {
    private economy;
    constructor(economy: AgentEconomy);
    completeTask(agentId: string, taskType: string, taskId: string, userId: string): Promise<{
        success: boolean;
        amount: number;
    }>;
    chargeForRequest(agentId: string, tokens: {
        input: number;
        output: number;
    }, model: string): Promise<boolean>;
}
export declare const taskPaymentService: TaskPaymentService;
//# sourceMappingURL=index.d.ts.map