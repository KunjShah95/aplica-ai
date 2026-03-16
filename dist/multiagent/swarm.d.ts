import { EventEmitter } from 'events';
import { AgentConfig, AgentMessage, AgentTask, SwarmConfig, AgentStats } from './types.js';
/**
 * Enhanced Swarm implementation for multi-agent coordination
 */
export declare class EnhancedSwarm extends EventEmitter {
    private agents;
    private tasks;
    private messageQueue;
    private coordinatorId;
    private config;
    private stats;
    constructor(config?: Partial<SwarmConfig>);
    setConfig(config: Partial<SwarmConfig>): void;
    registerAgent(config: AgentConfig): void;
    unregisterAgent(agentId: string): boolean;
    private assignNewCoordinator;
    submitTask(task: Omit<AgentTask, 'id' | 'status' | 'createdAt' | 'updatedAt'>): Promise<AgentTask>;
    private dispatchTask;
    private dispatchSequential;
    private dispatchParallel;
    private dispatchHierarchical;
    private getEligibleAgents;
    private assignTask;
    completeTask(taskId: string, result: unknown): Promise<void>;
    failTask(taskId: string, error: string): Promise<void>;
    private checkDependencies;
    private sendMessage;
    broadcast(type: AgentMessage['type'], payload: unknown, exclude?: string[]): Promise<void>;
    private getAgentTaskCount;
    getAgent(agentId: string): AgentConfig | undefined;
    getAllAgents(): AgentConfig[];
    getTask(taskId: string): AgentTask | undefined;
    getAllTasks(): AgentTask[];
    getPendingTasks(): AgentTask[];
    getStats(): AgentStats;
    createTaskWorkflow(name: string, steps: Array<{
        type: string;
        dependsOn?: string[];
        payload: Record<string, unknown>;
    }>): Promise<string[]>;
    clear(): void;
}
/**
 * Enhanced Swarm Orchestrator for managing multiple swarms
 */
export declare class EnhancedSwarmOrchestrator {
    private swarms;
    private defaultSwarm;
    constructor();
    createSwarm(name: string, config?: Partial<SwarmConfig>): EnhancedSwarm;
    getSwarm(name?: string): EnhancedSwarm;
    deleteSwarm(name: string): boolean;
    getAllSwarms(): string[];
    executeMultiSwarmTask(task: Omit<AgentTask, 'id' | 'status' | 'createdAt' | 'updatedAt'>, swarmNames?: string[]): Promise<Map<string, AgentTask>>;
    getGlobalStats(): Record<string, AgentStats>;
}
export declare const enhancedSwarm: EnhancedSwarm;
export declare const enhancedSwarmOrchestrator: EnhancedSwarmOrchestrator;
//# sourceMappingURL=swarm.d.ts.map