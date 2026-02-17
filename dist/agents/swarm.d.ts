import { EventEmitter } from 'events';
export interface AgentConfig {
    id: string;
    name: string;
    role: 'coordinator' | 'researcher' | 'executor' | 'analyst' | 'creative';
    capabilities: string[];
    maxTasks?: number;
    priority?: number;
    model?: string;
    systemPrompt?: string;
}
export interface Task {
    id: string;
    type: string;
    payload: Record<string, unknown>;
    assignedTo?: string;
    status: 'pending' | 'assigned' | 'processing' | 'completed' | 'failed';
    priority: number;
    dependencies?: string[];
    result?: unknown;
    error?: string;
    createdAt: Date;
    updatedAt: Date;
}
export interface AgentMessage {
    id: string;
    from: string;
    to: string;
    type: 'task' | 'result' | 'query' | 'response' | 'status';
    payload: unknown;
    timestamp: Date;
}
export interface SwarmStats {
    totalAgents: number;
    activeTasks: number;
    completedTasks: number;
    failedTasks: number;
    avgResponseTime: number;
}
export interface SwarmConfig {
    name: string;
    workflow: 'sequential' | 'parallel' | 'hierarchical';
    maxConcurrency?: number;
    maxRetries?: number;
}
export declare class AgentSwarm extends EventEmitter {
    private agents;
    private tasks;
    private messageQueue;
    private coordinator;
    private config;
    private stats;
    constructor(config?: Partial<SwarmConfig>);
    setConfig(config: Partial<SwarmConfig>): void;
    registerAgent(config: AgentConfig): void;
    unregisterAgent(agentId: string): boolean;
    private assignNewCoordinator;
    submitTask(task: Omit<Task, 'id' | 'status' | 'createdAt' | 'updatedAt'>): Promise<Task>;
    private dispatchTaskSequential;
    private dispatchTaskParallel;
    private dispatchTaskHierarchical;
    private getEligibleAgents;
    private assignTaskToAgent;
    completeTask(taskId: string, result: unknown): Promise<void>;
    failTask(taskId: string, error: string): Promise<void>;
    private checkDependencies;
    private sendMessage;
    broadcast(type: AgentMessage['type'], payload: unknown, exclude?: string[]): Promise<void>;
    private getAgentTaskCount;
    getAgent(agentId: string): AgentConfig | undefined;
    getAllAgents(): AgentConfig[];
    getTask(taskId: string): Task | undefined;
    getAllTasks(): Task[];
    getPendingTasks(): Task[];
    getStats(): SwarmStats;
    createTaskWorkflow(name: string, steps: Array<{
        type: string;
        dependsOn?: string[];
        payload: Record<string, unknown>;
    }>): Promise<string[]>;
    clear(): void;
}
export declare class SwarmOrchestrator {
    private swarms;
    private defaultSwarm;
    constructor();
    createSwarm(name: string, config?: Partial<SwarmConfig>): AgentSwarm;
    getSwarm(name?: string): AgentSwarm;
    deleteSwarm(name: string): boolean;
    getAllSwarms(): string[];
    executeMultiSwarmTask(task: Omit<Task, 'id' | 'status' | 'createdAt' | 'updatedAt'>, swarmNames?: string[]): Promise<Map<string, Task>>;
    getGlobalStats(): Record<string, SwarmStats>;
}
export declare const agentSwarm: AgentSwarm;
export declare const swarmOrchestrator: SwarmOrchestrator;
//# sourceMappingURL=swarm.d.ts.map