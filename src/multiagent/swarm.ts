import { randomUUID } from 'crypto';
import { EventEmitter } from 'events';
import {
  AgentConfig,
  AgentMessage,
  AgentTask,
  SwarmConfig,
  AgentStats,
} from './types.js';

/**
 * Enhanced Swarm implementation for multi-agent coordination
 */
export class EnhancedSwarm extends EventEmitter {
  private agents: Map<string, AgentConfig> = new Map();
  private tasks: Map<string, AgentTask> = new Map();
  private messageQueue: AgentMessage[] = [];
  private coordinatorId: string | null = null;
  private config: SwarmConfig;
  private stats: {
    totalTasks: number;
    completedTasks: number;
    failedTasks: number;
    responseTimes: number[];
  };

  constructor(config?: Partial<SwarmConfig>) {
    super();
    this.config = {
      name: config?.name || 'default',
      workflow: config?.workflow || 'sequential',
      maxConcurrency: config?.maxConcurrency || 5,
      maxRetries: config?.maxRetries || 3,
    };
    this.stats = {
      totalTasks: 0,
      completedTasks: 0,
      failedTasks: 0,
      responseTimes: [],
    };
  }

  setConfig(config: Partial<SwarmConfig>): void {
    this.config = { ...this.config, ...config };
  }

  registerAgent(config: AgentConfig): void {
    this.agents.set(config.id, config);
    if (config.role === 'router') {
      this.coordinatorId = config.id;
    }
    console.log(`[Swarm] Agent registered: ${config.name} (${config.role})`);
    this.emit('agent:registered', config);
  }

  unregisterAgent(agentId: string): boolean {
    const agent = this.agents.get(agentId);
    if (!agent) return false;
    this.agents.delete(agentId);
    if (this.coordinatorId === agentId) {
      this.coordinatorId = null;
      this.assignNewCoordinator();
    }
    console.log(`[Swarm] Agent unregistered: ${agent.name}`);
    this.emit('agent:unregistered', agent);
    return true;
  }

  private assignNewCoordinator(): void {
    for (const [id, agent] of this.agents) {
      if (agent.role === 'router') {
        this.coordinatorId = id;
        return;
      }
    }
  }

  async submitTask(task: Omit<AgentTask, 'id' | 'status' | 'createdAt' | 'updatedAt'>): Promise<AgentTask> {
    const newTask: AgentTask = {
      ...task,
      id: randomUUID(),
      status: 'pending',
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.tasks.set(newTask.id, newTask);
    this.stats.totalTasks++;
    console.log(`[Swarm] Task submitted: ${newTask.type} (priority: ${newTask.priority})`);
    this.emit('task:submitted', newTask);
    await this.dispatchTask(newTask.id);
    return newTask;
  }

  private async dispatchTask(taskId: string): Promise<void> {
    const task = this.tasks.get(taskId);
    if (!task || task.status !== 'pending') return;

    const eligibleAgents = this.getEligibleAgents(task.type);
    if (eligibleAgents.length === 0) {
      console.warn(`[Swarm] No eligible agents for task: ${task.type}`);
      return;
    }

    if (this.config.workflow === 'parallel') {
      await this.dispatchParallel(taskId);
    } else if (this.config.workflow === 'hierarchical') {
      await this.dispatchHierarchical(taskId);
    } else {
      await this.dispatchSequential(taskId);
    }
  }

  private async dispatchSequential(taskId: string): Promise<void> {
    const task = this.tasks.get(taskId);
    if (!task) return;
    const agent = this.getEligibleAgents(task.type)[0];
    await this.assignTask(task, agent);
  }

  private async dispatchParallel(taskId: string): Promise<void> {
    const task = this.tasks.get(taskId);
    if (!task) return;
    const agents = this.getEligibleAgents(task.type).slice(0, this.config.maxConcurrency || 5);
    await Promise.all(agents.map((agent) => this.assignTask({ ...task, id: randomUUID() }, agent)));
  }

  private async dispatchHierarchical(taskId: string): Promise<void> {
    const task = this.tasks.get(taskId);
    if (!task) return;
    if (this.coordinatorId) {
      const agent = this.agents.get(this.coordinatorId);
      if (agent) {
        await this.assignTask(task, agent);
        return;
      }
    }
    await this.dispatchSequential(taskId);
  }

  private getEligibleAgents(taskType: string): AgentConfig[] {
    return Array.from(this.agents.values())
      .filter((agent) => {
        if (!agent.capabilities.includes(taskType) && !agent.capabilities.includes('*')) return false;
        if (agent.maxTasks && this.getAgentTaskCount(agent.id) >= agent.maxTasks) return false;
        return true;
      })
      .sort((a, b) => (b.priority || 0) - (a.priority || 0));
  }

  private async assignTask(task: AgentTask, agent: AgentConfig): Promise<void> {
    task.assignedTo = agent.id;
    task.status = 'assigned';
    task.updatedAt = new Date();
    console.log(`[Swarm] Task ${task.id} assigned to ${agent.name}`);
    this.emit('task:assigned', { task, agent });
    await this.sendMessage({
      id: randomUUID(),
      from: 'system',
      to: agent.id,
      type: 'task',
      payload: task,
      timestamp: new Date(),
    });
  }

  async completeTask(taskId: string, result: unknown): Promise<void> {
    const task = this.tasks.get(taskId);
    if (!task) return;
    task.status = 'completed';
    task.result = result;
    task.updatedAt = new Date();
    this.stats.completedTasks++;
    console.log(`[Swarm] Task completed: ${taskId}`);
    this.emit('task:completed', task);
    await this.checkDependencies(taskId);
  }

  async failTask(taskId: string, error: string): Promise<void> {
    const task = this.tasks.get(taskId);
    if (!task) return;
    task.status = 'failed';
    task.error = error;
    task.updatedAt = new Date();
    this.stats.failedTasks++;
    console.error(`[Swarm] Task failed: ${taskId} - ${error}`);
    this.emit('task:failed', task);
  }

  private async checkDependencies(completedTaskId: string): Promise<void> {
    for (const [taskId, task] of this.tasks) {
      if (task.status === 'pending' && task.dependencies?.includes(completedTaskId)) {
        const allMet = task.dependencies.every((depId) => {
          const dep = this.tasks.get(depId);
          return dep?.status === 'completed';
        });
        if (allMet) await this.dispatchTask(taskId);
      }
    }
  }

  private async sendMessage(message: AgentMessage): Promise<void> {
    message.id = randomUUID();
    this.messageQueue.push(message);
    const recipient = this.agents.get(message.to);
    if (recipient) {
      this.emit('message:send', message);
      console.log(`[Swarm] Message: ${message.from} -> ${message.to}`);
    }
  }

  async broadcast(type: AgentMessage['type'], payload: unknown, exclude?: string[]): Promise<void> {
    for (const agent of this.agents.values()) {
      if (!exclude?.includes(agent.id)) {
        await this.sendMessage({
          id: randomUUID(),
          from: 'system',
          to: agent.id,
          type,
          payload,
          timestamp: new Date(),
        });
      }
    }
  }

  private getAgentTaskCount(agentId: string): number {
    return Array.from(this.tasks.values()).filter(
      (t) => t.assignedTo === agentId && (t.status === 'assigned' || t.status === 'processing')
    ).length;
  }

  getAgent(agentId: string): AgentConfig | undefined {
    return this.agents.get(agentId);
  }

  getAllAgents(): AgentConfig[] {
    return Array.from(this.agents.values());
  }

  getTask(taskId: string): AgentTask | undefined {
    return this.tasks.get(taskId);
  }

  getAllTasks(): AgentTask[] {
    return Array.from(this.tasks.values());
  }

  getPendingTasks(): AgentTask[] {
    return Array.from(this.tasks.values()).filter((t) => t.status === 'pending');
  }

  getStats(): AgentStats {
    const modelUsage: Record<string, number> = {};
    for (const task of this.tasks.values()) {
      const model = task.metadata?.modelUsed || 'unknown';
      modelUsage[model] = (modelUsage[model] || 0) + 1;
    }

    return {
      totalTasks: this.stats.totalTasks,
      completedTasks: this.stats.completedTasks,
      failedTasks: this.stats.failedTasks,
      avgResponseTime: this.stats.responseTimes.length
        ? this.stats.responseTimes.reduce((a, b) => a + b, 0) / this.stats.responseTimes.length
        : 0,
      modelUsage,
    };
  }

  async createTaskWorkflow(
    name: string,
    steps: Array<{ type: string; dependsOn?: string[]; payload: Record<string, unknown> }>
  ): Promise<string[]> {
    const taskIds: string[] = [];
    if (this.config.workflow === 'parallel') {
      const parallel = steps.filter((s) => !s.dependsOn || s.dependsOn.length === 0);
      const results = await Promise.all(
        parallel.map((step) => this.submitTask({ type: step.type, payload: step.payload, dependencies: step.dependsOn, priority: 1 }))
      );
      taskIds.push(...results.map((r) => r.id));
    } else {
      for (const step of steps) {
        const task = await this.submitTask({ type: step.type, payload: step.payload, dependencies: step.dependsOn, priority: 1 });
        taskIds.push(task.id);
      }
    }
    console.log(`[Swarm] Workflow "${name}" created with ${taskIds.length} tasks`);
    this.emit('workflow:created', { name, taskIds });
    return taskIds;
  }

  clear(): void {
    this.tasks.clear();
    this.messageQueue = [];
    this.stats = { totalTasks: 0, completedTasks: 0, failedTasks: 0, responseTimes: [] };
    console.log('[Swarm] Cleared');
  }
}

/**
 * Enhanced Swarm Orchestrator for managing multiple swarms
 */
export class EnhancedSwarmOrchestrator {
  private swarms: Map<string, EnhancedSwarm> = new Map();
  private defaultSwarm: EnhancedSwarm;

  constructor() {
    this.defaultSwarm = new EnhancedSwarm();
    this.swarms.set('default', this.defaultSwarm);
  }

  createSwarm(name: string, config?: Partial<SwarmConfig>): EnhancedSwarm {
    const swarm = new EnhancedSwarm(config);
    swarm.setConfig({ name });
    this.swarms.set(name, swarm);
    console.log(`[SwarmOrchestrator] Created swarm: ${name}`);
    return swarm;
  }

  getSwarm(name: string = 'default'): EnhancedSwarm {
    return this.swarms.get(name) || this.defaultSwarm;
  }

  deleteSwarm(name: string): boolean {
    if (name === 'default') return false;
    return this.swarms.delete(name);
  }

  getAllSwarms(): string[] {
    return Array.from(this.swarms.keys());
  }

  async executeMultiSwarmTask(task: Omit<AgentTask, 'id' | 'status' | 'createdAt' | 'updatedAt'>, swarmNames?: string[]): Promise<Map<string, AgentTask>> {
    const results = new Map<string, AgentTask>();
    const swarms = swarmNames
      ? swarmNames.map((n) => this.swarms.get(n)).filter(Boolean) as EnhancedSwarm[]
      : Array.from(this.swarms.values());
    await Promise.all(
      swarms.map(async (swarm) => {
        const result = await swarm.submitTask(task);
        results.set((swarm as any).config?.name || 'default', result);
      })
    );
    return results;
  }

  getGlobalStats(): Record<string, AgentStats> {
    const stats: Record<string, AgentStats> = {};
    for (const [name, swarm] of this.swarms) {
      stats[name] = swarm.getStats();
    }
    return stats;
  }
}

export const enhancedSwarm = new EnhancedSwarm();
export const enhancedSwarmOrchestrator = new EnhancedSwarmOrchestrator();
