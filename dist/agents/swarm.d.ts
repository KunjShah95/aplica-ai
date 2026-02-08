import { EventEmitter } from 'events';
export interface AgentConfig {
    id: string;
    name: string;
    role: 'coordinator' | 'researcher' | 'executor' | 'analyst' | 'creative';
    capabilities: string[];
    maxTasks?: number;
    priority?: number;
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
export declare class AgentSwarm extends EventEmitter {
    private agents;
    private tasks;
    private messageQueue;
    private coordinator;
    private stats;
    constructor();
    registerAgent(config: AgentConfig): void;
    unregisterAgent(agentId: string): boolean;
    private assignNewCoordinator;
    submitTask(task: Omit<Task, 'id' | 'status' | 'createdAt' | 'updatedAt'>): Promise<Task>;
    private dispatchTask;
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
}
export declare const agentSwarm: AgentSwarm;
//# sourceMappingURL=swarm.d.ts.map