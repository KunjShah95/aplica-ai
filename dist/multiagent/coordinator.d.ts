import { EventEmitter } from 'events';
import { Agent } from '../core/agent.js';
import { AppConfig } from '../config/types.js';
import { LLMProvider } from '../core/llm/index.js';
import { AgentConfig, AgentRole, AgentTask, SwarmConfig, AgentStats, CostTracking } from './types.js';
/**
 * Multi-Agent Coordinator - Orchestrates all sub-agents and manages coordination
 */
export declare class MultiAgentCoordinator extends EventEmitter {
    private agents;
    private agentConfigs;
    private tasks;
    private agentFactory;
    private taskRouter;
    private messageBus;
    private stats;
    private costTracking;
    private config;
    constructor(config?: Partial<SwarmConfig>);
    /**
     * Setup message bus handlers
     */
    private setupMessageHandlers;
    /**
     * Register an agent instance
     */
    registerAgent(agent: Agent, config: AgentConfig): void;
    /**
     * Unregister an agent
     */
    unregisterAgent(agentId: string): boolean;
    /**
     * Create and register a specialized agent
     */
    createAgent(config: AppConfig, llm: LLMProvider, role: AgentRole, customId?: string): Agent;
    /**
     * Submit a task to the coordinator
     */
    submitTask(task: Omit<AgentTask, 'id' | 'status' | 'createdAt' | 'updatedAt'>): Promise<AgentTask>;
    /**
     * Dispatch task sequentially
     */
    private dispatchTaskSequential;
    /**
     * Dispatch task in parallel to multiple agents
     */
    private dispatchTaskParallel;
    /**
     * Dispatch task hierarchically (through router)
     */
    private dispatchTaskHierarchical;
    /**
     * Dispatch task through peer review (drafter + critic)
     */
    private dispatchTaskPeerReview;
    /**
     * Dispatch task through debate mode
     */
    private dispatchTaskDebate;
    /**
     * Get eligible agents for a task type
     */
    private getEligibleAgents;
    /**
     * Get task count for an agent
     */
    private getAgentTaskCount;
    /**
     * Handle task messages from message bus
     */
    private handleTaskMessage;
    /**
     * Handle result messages from message bus
     */
    private handleResultMessage;
    /**
     * Handle status messages from message bus
     */
    private handleStatusMessage;
    /**
     * Get agent by role
     */
    getAgentByRole(role: AgentRole): Agent | undefined;
    /**
     * Get all agents
     */
    getAllAgents(): Agent[];
    /**
     * Get all agent configs
     */
    getAllAgentConfigs(): AgentConfig[];
    /**
     * Get agent stats
     */
    getAgentStats(): AgentStats;
    /**
     * Get model usage statistics
     */
    private getModelUsage;
    /**
     * Get cost tracking data
     */
    getCostTracking(): CostTracking[];
    /**
     * Get task by ID
     */
    getTask(taskId: string): AgentTask | undefined;
    /**
     * Get all tasks
     */
    getAllTasks(): AgentTask[];
    /**
     * Get pending tasks
     */
    getPendingTasks(): AgentTask[];
    /**
     * Get active tasks
     */
    getActiveTasks(): AgentTask[];
    /**
     * Clear all tasks
     */
    clearTasks(): void;
    /**
     * Update workflow configuration
     */
    setWorkflowConfig(config: Partial<SwarmConfig>): void;
    /**
     * Get coordinator status
     */
    getStatus(): {
        name: string;
        workflow: string;
        totalAgents: number;
        totalTasks: number;
        activeTasks: number;
        completedTasks: number;
        failedTasks: number;
        agents: {
            id: string;
            role: string;
            name: string;
        }[];
    };
    private toRoutingInput;
}
/**
 * Global coordinator instance
 */
export declare const multiAgentCoordinator: MultiAgentCoordinator;
//# sourceMappingURL=coordinator.d.ts.map