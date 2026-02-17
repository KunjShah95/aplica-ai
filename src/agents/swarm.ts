import { randomUUID } from 'crypto';
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

export class AgentSwarm extends EventEmitter {
  private agents: Map<string, AgentConfig> = new Map();
  private tasks: Map<string, Task> = new Map();
  private messageQueue: AgentMessage[] = [];
  private coordinator: string | null = null;
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

    if (config.role === 'coordinator') {
      this.coordinator = config.id;
    }

    console.log(`Agent registered: ${config.name} (${config.role})`);
    this.emit('agent:registered', config);
  }

  unregisterAgent(agentId: string): boolean {
    const agent = this.agents.get(agentId);
    if (!agent) return false;

    this.agents.delete(agentId);

    if (this.coordinator === agentId) {
      this.coordinator = null;
      this.assignNewCoordinator();
    }

    console.log(`Agent unregistered: ${agent.name}`);
    this.emit('agent:unregistered', agent);
    return true;
  }

  private assignNewCoordinator(): void {
    for (const [id, agent] of this.agents) {
      if (agent.role === 'coordinator') {
        this.coordinator = id;
        return;
      }
    }
  }

  async submitTask(task: Omit<Task, 'id' | 'status' | 'createdAt' | 'updatedAt'>): Promise<Task> {
    const newTask: Task = {
      ...task,
      id: randomUUID(),
      status: 'pending',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.tasks.set(newTask.id, newTask);
    this.stats.totalTasks++;

    console.log(`Task submitted: ${newTask.type} (priority: ${newTask.priority})`);
    this.emit('task:submitted', newTask);

    if (this.config.workflow === 'parallel') {
      await this.dispatchTaskParallel(newTask.id);
    } else if (this.config.workflow === 'hierarchical') {
      await this.dispatchTaskHierarchical(newTask.id);
    } else {
      await this.dispatchTaskSequential(newTask.id);
    }

    return newTask;
  }

  private async dispatchTaskSequential(taskId: string): Promise<void> {
    const task = this.tasks.get(taskId);
    if (!task || task.status !== 'pending') return;

    const eligibleAgents = this.getEligibleAgents(task.type);
    if (eligibleAgents.length === 0) {
      console.warn(`No eligible agents for task: ${task.type}`);
      return;
    }

    const selectedAgent = eligibleAgents[0];
    await this.assignTaskToAgent(task, selectedAgent);
  }

  private async dispatchTaskParallel(taskId: string): Promise<void> {
    const task = this.tasks.get(taskId);
    if (!task || task.status !== 'pending') return;

    const eligibleAgents = this.getEligibleAgents(task.type);
    if (eligibleAgents.length === 0) {
      console.warn(`No eligible agents for task: ${task.type}`);
      return;
    }

    const availableSlots = this.config.maxConcurrency || 5;
    const agentsToAssign = eligibleAgents.slice(0, Math.min(availableSlots, eligibleAgents.length));

    await Promise.all(
      agentsToAssign.map((agent) => this.assignTaskToAgent({ ...task, id: randomUUID() }, agent))
    );
  }

  private async dispatchTaskHierarchical(taskId: string): Promise<void> {
    const task = this.tasks.get(taskId);
    if (!task || task.status !== 'pending') return;

    if (this.coordinator) {
      const coordinatorAgent = this.agents.get(this.coordinator);
      if (coordinatorAgent) {
        await this.assignTaskToAgent(task, coordinatorAgent);
        return;
      }
    }

    await this.dispatchTaskSequential(taskId);
  }

  private getEligibleAgents(taskType: string): AgentConfig[] {
    return Array.from(this.agents.values())
      .filter((agent) => {
        if (!agent.capabilities.includes(taskType) && !agent.capabilities.includes('*'))
          return false;
        if (agent.maxTasks && this.getAgentTaskCount(agent.id) >= agent.maxTasks) return false;
        return true;
      })
      .sort((a, b) => (b.priority || 0) - (a.priority || 0));
  }

  private async assignTaskToAgent(task: Task, agent: AgentConfig): Promise<void> {
    task.assignedTo = agent.id;
    task.status = 'assigned';
    task.updatedAt = new Date();

    console.log(`Task ${task.id} assigned to ${agent.name}`);
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

    console.log(`Task completed: ${taskId}`);
    this.emit('task:completed', task);

    if (task.assignedTo) {
      await this.sendMessage({
        id: randomUUID(),
        from: 'system',
        to: task.assignedTo,
        type: 'result',
        payload: { taskId, result },
        timestamp: new Date(),
      });
    }

    await this.checkDependencies(taskId);
  }

  async failTask(taskId: string, error: string): Promise<void> {
    const task = this.tasks.get(taskId);
    if (!task) return;

    task.status = 'failed';
    task.error = error;
    task.updatedAt = new Date();
    this.stats.failedTasks++;

    console.error(`Task failed: ${taskId} - ${error}`);
    this.emit('task:failed', task);

    if (task.assignedTo) {
      await this.sendMessage({
        id: randomUUID(),
        from: 'system',
        to: task.assignedTo,
        type: 'result',
        payload: { taskId, error },
        timestamp: new Date(),
      });
    }
  }

  private async checkDependencies(completedTaskId: string): Promise<void> {
    for (const [taskId, task] of this.tasks) {
      if (task.status === 'pending' && task.dependencies?.includes(completedTaskId)) {
        const allDepsMet = task.dependencies.every((depId) => {
          const depTask = this.tasks.get(depId);
          return depTask?.status === 'completed';
        });

        if (allDepsMet) {
          if (this.config.workflow === 'parallel') {
            await this.dispatchTaskParallel(taskId);
          } else if (this.config.workflow === 'hierarchical') {
            await this.dispatchTaskHierarchical(taskId);
          } else {
            await this.dispatchTaskSequential(taskId);
          }
        }
      }
    }
  }

  private async sendMessage(message: AgentMessage): Promise<void> {
    message.id = randomUUID();
    this.messageQueue.push(message);

    const recipient = this.agents.get(message.to);
    if (recipient) {
      this.emit('message:send', message);
      console.log(`Message from ${message.from} to ${message.to}: ${message.type}`);
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
    let count = 0;
    for (const task of this.tasks.values()) {
      if (
        task.assignedTo === agentId &&
        (task.status === 'assigned' || task.status === 'processing')
      ) {
        count++;
      }
    }
    return count;
  }

  getAgent(agentId: string): AgentConfig | undefined {
    return this.agents.get(agentId);
  }

  getAllAgents(): AgentConfig[] {
    return Array.from(this.agents.values());
  }

  getTask(taskId: string): Task | undefined {
    return this.tasks.get(taskId);
  }

  getAllTasks(): Task[] {
    return Array.from(this.tasks.values());
  }

  getPendingTasks(): Task[] {
    return Array.from(this.tasks.values()).filter((t) => t.status === 'pending');
  }

  getStats(): SwarmStats {
    const activeTasks = Array.from(this.tasks.values()).filter(
      (t) => t.status === 'assigned' || t.status === 'processing'
    ).length;

    const avgResponseTime =
      this.stats.responseTimes.length > 0
        ? this.stats.responseTimes.reduce((a, b) => a + b, 0) / this.stats.responseTimes.length
        : 0;

    return {
      totalAgents: this.agents.size,
      activeTasks,
      completedTasks: this.stats.completedTasks,
      failedTasks: this.stats.failedTasks,
      avgResponseTime,
    };
  }

  async createTaskWorkflow(
    name: string,
    steps: Array<{
      type: string;
      dependsOn?: string[];
      payload: Record<string, unknown>;
    }>
  ): Promise<string[]> {
    const taskIds: string[] = [];

    if (this.config.workflow === 'parallel') {
      const parallelSteps = steps.filter((s) => !s.dependsOn || s.dependsOn.length === 0);
      const results = await Promise.all(
        parallelSteps.map((step) =>
          this.submitTask({
            type: step.type,
            payload: step.payload,
            dependencies: step.dependsOn,
            priority: 1,
          })
        )
      );
      taskIds.push(...results.map((r) => r.id));
    } else {
      for (const step of steps) {
        const task = await this.submitTask({
          type: step.type,
          payload: step.payload,
          dependencies: step.dependsOn,
          priority: 1,
        });
        taskIds.push(task.id);
      }
    }

    console.log(`Workflow "${name}" created with ${taskIds.length} tasks`);
    this.emit('workflow:created', { name, taskIds });
    return taskIds;
  }

  clear(): void {
    this.tasks.clear();
    this.messageQueue = [];
    this.stats = {
      totalTasks: 0,
      completedTasks: 0,
      failedTasks: 0,
      responseTimes: [],
    };
    console.log('Swarm cleared');
  }
}

export class SwarmOrchestrator {
  private swarms: Map<string, AgentSwarm> = new Map();
  private defaultSwarm: AgentSwarm;

  constructor() {
    this.defaultSwarm = new AgentSwarm();
    this.swarms.set('default', this.defaultSwarm);
  }

  createSwarm(name: string, config?: Partial<SwarmConfig>): AgentSwarm {
    const swarm = new AgentSwarm(config);
    swarm.setConfig({ name });
    this.swarms.set(name, swarm);
    console.log(`Created swarm: ${name}`);
    return swarm;
  }

  getSwarm(name: string = 'default'): AgentSwarm {
    return this.swarms.get(name) || this.defaultSwarm;
  }

  deleteSwarm(name: string): boolean {
    if (name === 'default') return false;
    return this.swarms.delete(name);
  }

  getAllSwarms(): string[] {
    return Array.from(this.swarms.keys());
  }

  async executeMultiSwarmTask(
    task: Omit<Task, 'id' | 'status' | 'createdAt' | 'updatedAt'>,
    swarmNames?: string[]
  ): Promise<Map<string, Task>> {
    const results = new Map<string, Task>();
    const swarmsToUse = swarmNames
      ? (swarmNames.map((n) => this.swarms.get(n)).filter(Boolean) as AgentSwarm[])
      : Array.from(this.swarms.values());

    const taskPromises = swarmsToUse.map(async (swarm) => {
      const result = await swarm.submitTask(task);
      results.set((swarm as any).config?.name || 'default', result);
    });

    await Promise.all(taskPromises);
    return results;
  }

  getGlobalStats(): Record<string, SwarmStats> {
    const stats: Record<string, SwarmStats> = {};
    for (const [name, swarm] of this.swarms) {
      stats[name] = swarm.getStats();
    }
    return stats;
  }
}

export const agentSwarm = new AgentSwarm();
export const swarmOrchestrator = new SwarmOrchestrator();
