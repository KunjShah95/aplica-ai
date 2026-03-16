import { Agent } from '../../core/agent.js';
import { AgentOptions } from '../../core/agent.js';
/**
 * Delegate Agent - Task routing and skill matching
 */
export declare class DelegateAgent extends Agent {
    private delegationHistory;
    private agentRegistry;
    constructor(options: AgentOptions);
    /**
     * Register an agent in the registry
     */
    registerAgent(agentId: string, agent: any): void;
    /**
     * Unregister an agent
     */
    unregisterAgent(agentId: string): boolean;
    /**
     * Get an agent from the registry
     */
    getAgent(agentId: string): any;
    /**
     * Get all available agents
     */
    getAllAgents(): string[];
    /**
     * Delegate a task to the best available agent
     */
    delegateTask(task: string, options?: {
        requiredSkills?: string[];
        preferredAgent?: string;
        forceMatch?: boolean;
    }): Promise<DelegationResult>;
    /**
     * Analyze a task
     */
    private analyzeTask;
    /**
     * Classify task type
     */
    private classifyTaskType;
    /**
     * Identify required skills
     */
    private identifyRequiredSkills;
    /**
     * Estimate task complexity
     */
    private estimateComplexity;
    /**
     * Find best matching agent
     */
    private findBestAgent;
    /**
     * Get skills for an agent
     */
    private getAgentSkills;
    /**
     * Check if skills match
     */
    private skillsMatch;
    /**
     * Get delegation history
     */
    getHistory(): DelegationRecord[];
    /**
     * Get statistics
     */
    getStats(): {
        totalDelegations: number;
        successRate: number;
        avgConfidence: number;
        assignmentByAgent: Record<string, number>;
    };
}
export interface TaskAnalysis {
    taskType: string;
    secondaryTypes: string[];
    complexity: 'simple' | 'medium' | 'complex';
    requiredSkills: string[];
    keywords: string[];
}
export interface DelegationResult {
    id: string;
    taskId: string;
    task: string;
    analysis: TaskAnalysis;
    assignedAgent: string;
    confidence: number;
    assignedAt: Date;
    duration: number;
}
export interface DelegationRecord {
    delegation: DelegationResult;
}
/**
 * Factory function to create a delegate agent
 */
export declare function createDelegateAgent(options: AgentOptions): DelegateAgent;
//# sourceMappingURL=delegate-agent.d.ts.map