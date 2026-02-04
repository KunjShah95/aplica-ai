import { EventEmitter } from 'events';
import { CognitiveAgent } from './agent.js';
import { TaskScheduler } from '../orchestration/scheduler.js';
import { ConsensusMechanism } from './consensus.js';
import { Tracer } from '../observability/tracing/tracer.js';

export interface SwarmConfig {
  name: string;
  agents: AgentConfig[];
  coordinator: 'hierarchical' | 'democratic' | 'specialized';
  consensusThreshold: number;
  maxParallelTasks: number;
  taskTimeout: number;
}

export interface SwarmTask {
  id: string;
  description: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  assignedAgent?: string;
  status: 'pending' | 'assigned' | 'in_progress' | 'completed' | 'failed';
  result?: any;
  dependencies: string[];
  createdAt: Date;
  completedAt?: Date;
  timeout?: NodeJS.Timeout;
}

export interface SwarmResult {
  success: boolean;
  taskId: string;
  agentId: string;
  output: any;
  confidence: number;
  duration: number;
  consensusScore?: number;
}

export interface AgentRegistration {
  agent: CognitiveAgent;
  capabilities: string[];
  currentLoad: number;
  maxLoad: number;
  status: 'available' | 'busy' | 'offline';
}

export interface CoordinationMessage {
  fromAgent: string;
  toAgent?: string;
  type: 'request' | 'response' | 'delegate' | 'result' | 'help';
  content: any;
  timestamp: Date;
}

export class SwarmOrchestrator extends EventEmitter {
  private config: SwarmConfig;
  private agents: Map<string, AgentRegistration>;
  private taskQueue: Map<string, SwarmTask>;
  private completedTasks: Map<string, SwarmTask>;
  private coordinatorAgent: CognitiveAgent | null;
  private consensus: ConsensusMechanism;
  private scheduler: TaskScheduler;
  private tracer: Tracer;
  private messageLog: CoordinationMessage[];

  constructor(config: Partial<SwarmConfig>) {
    super();
    this.config = {
      name: config.name || 'default-swarm',
      agents: config.agents || [],
      coordinator: config.coordinator || 'democratic',
      consensusThreshold: config.consensusThreshold || 0.7,
      maxParallelTasks: config.maxParallelTasks || 5,
      taskTimeout: config.taskTimeout || 300000,
    };

    this.agents = new Map();
    this.taskQueue = new Map();
    this.completedTasks = new Map();
    this.coordinatorAgent = null;
    this.consensus = new ConsensusMechanism(this.config.consensusThreshold);
    this.scheduler = new TaskScheduler();
    this.tracer = new Tracer('swarm-orchestrator');
    this.messageLog = [];
  }

  async initialize(): Promise<void> {
    for (const agentConfig of this.config.agents) {
      const agent = new CognitiveAgent(agentConfig);
      await this.registerAgent(agent, agentConfig.capabilities || []);
    }

    if (this.config.coordinator === 'hierarchical') {
      this.coordinatorAgent = new CognitiveAgent({
        name: 'Coordinator',
        role: 'coordinator',
        systemPrompt: 'You coordinate a swarm of specialized agents to complete complex tasks.',
        capabilities: ['coordination', 'task_assignment', 'consensus_building'],
        maxIterations: 20,
      });
    }

    this.startTaskProcessor();
    this.emit('initialized', { swarmName: this.config.name, agentCount: this.agents.size });
  }

  async registerAgent(agent: CognitiveAgent, capabilities: string[]): Promise<void> {
    this.agents.set(agent.getConfig().id, {
      agent,
      capabilities,
      currentLoad: 0,
      maxLoad: 3,
      status: 'available',
    });

    agent.on('executionCompleted', async (result: any) => {
      await this.handleTaskCompletion(result);
    });

    agent.on('executionFailed', async (result: any) => {
      await this.handleTaskFailure(result);
    });

    this.emit('agentRegistered', { agentId: agent.getConfig().id, capabilities });
  }

  async submitTask(task: Partial<SwarmTask>): Promise<SwarmTask> {
    const fullTask: SwarmTask = {
      id: task.id || `task_${Date.now()}`,
      description: task.description || '',
      priority: task.priority || 'medium',
      status: 'pending',
      dependencies: task.dependencies || [],
      createdAt: new Date(),
    };

    this.taskQueue.set(fullTask.id, fullTask);
    this.emit('taskSubmitted', fullTask);

    return fullTask;
  }

  async assignTask(taskId: string): Promise<boolean> {
    const task = this.taskQueue.get(taskId);
    if (!task || task.status !== 'pending') {
      return false;
    }

    const availableAgents = Array.from(this.agents.values()).filter(
      (a) => a.status === 'available' && a.currentLoad < a.maxLoad
    );

    if (availableAgents.length === 0) {
      return false;
    }

    const bestAgent = this.selectBestAgent(availableAgents, task);

    if (!bestAgent) {
      return false;
    }

    task.assignedAgent = bestAgent.agent.getConfig().id;
    task.status = 'assigned';
    bestAgent.status = 'busy';
    bestAgent.currentLoad++;

    bestAgent.agent.execute(task.description, { taskId: task.id });

    this.emit('taskAssigned', { taskId, agentId: bestAgent.agent.getConfig().id });
    return true;
  }

  private selectBestAgent(
    availableAgents: AgentRegistration[],
    task: SwarmTask
  ): AgentRegistration | null {
    const taskRequirements = this.analyzeTaskRequirements(task.description);

    return (
      availableAgents
        .map((agent) => ({
          agent,
          score: this.calculateAgentScore(agent, taskRequirements),
        }))
        .sort((a, b) => b.score - a.score)[0]?.agent || null
    );
  }

  private analyzeTaskRequirements(taskDescription: string): string[] {
    const keywords: string[] = [];

    const categories = {
      coding: ['code', 'debug', 'program', 'implement', 'refactor', 'test'],
      research: ['search', 'find', 'analyze', 'investigate', 'research', 'explore'],
      writing: ['write', 'draft', 'edit', 'compose', 'summarize', 'translate'],
      planning: ['plan', 'schedule', 'organize', 'coordinate', 'manage', 'prioritize'],
      creative: ['design', 'create', 'generate', 'imagine', 'brainstorm', 'innovate'],
      data: ['analyze', 'process', 'calculate', 'transform', 'visualize', 'statistics'],
    };

    for (const [category, words] of Object.entries(categories)) {
      if (words.some((w) => taskDescription.toLowerCase().includes(w))) {
        keywords.push(category);
      }
    }

    return keywords;
  }

  private calculateAgentScore(agent: AgentRegistration, requirements: string[]): number {
    const capabilityMatch = agent.capabilities.filter((c) =>
      requirements.some((r) => c.toLowerCase().includes(r))
    ).length;

    const loadFactor = 1 - agent.currentLoad / agent.maxLoad;

    return capabilityMatch * 0.6 + loadFactor * 0.4;
  }

  async delegateTask(fromAgentId: string, task: SwarmTask, targetAgentId: string): Promise<void> {
    const message: CoordinationMessage = {
      fromAgent: fromAgentId,
      toAgent: targetAgentId,
      type: 'delegate',
      content: {
        taskId: task.id,
        description: task.description,
        originalAgent: fromAgentId,
      },
      timestamp: new Date(),
    };

    this.messageLog.push(message);
    this.emit('delegation', message);

    const targetAgent = this.agents.get(targetAgentId);
    if (targetAgent) {
      task.assignedAgent = targetAgentId;
      targetAgent.agent.execute(task.description, {
        taskId: task.id,
        delegatedFrom: fromAgentId,
      });
    }
  }

  async requestHelp(agentId: string, taskId: string, helpType: string): Promise<void> {
    const message: CoordinationMessage = {
      fromAgent: agentId,
      type: 'help',
      content: {
        taskId,
        helpType,
        description: `Need help with ${helpType}`,
      },
      timestamp: new Date(),
    };

    this.messageLog.push(message);
    this.emit('helpRequest', message);

    const availableHelpers = Array.from(this.agents.values())
      .filter(
        (a) =>
          a.status === 'available' &&
          a.agent.getConfig().id !== agentId &&
          a.capabilities.includes(helpType)
      )
      .sort((a, b) => b.currentLoad - a.currentLoad);

    if (availableHelpers.length > 0) {
      const task = this.taskQueue.get(taskId);
      if (task) {
        await this.delegateTask(agentId, task, availableHelpers[0].agent.getConfig().id);
      }
    }
  }

  async buildConsensus(taskId: string, proposals: any[]): Promise<ConsensusResult> {
    const votingResult = await this.consensus.vote(proposals);

    const task = this.taskQueue.get(taskId);
    if (task) {
      task.result = votingResult.winner;
    }

    return votingResult;
  }

  private async handleTaskCompletion(result: any): Promise<void> {
    const task = this.taskQueue.get(result.taskId);
    if (!task) return;

    task.status = 'completed';
    task.completedAt = new Date();
    this.completedTasks.set(task.id, task);

    const agent = this.agents.get(task.assignedAgent!);
    if (agent) {
      agent.status = 'available';
      agent.currentLoad = Math.max(0, agent.currentLoad - 1);
    }

    this.emit('taskCompleted', { taskId: task.id, result });
    await this.processDependencies(task.id);
  }

  private async handleTaskFailure(result: any): Promise<void> {
    const task = this.taskQueue.get(result.taskId);
    if (!task) return;

    task.status = 'failed';
    this.completedTasks.set(task.id, task);

    const agent = this.agents.get(task.assignedAgent!);
    if (agent) {
      agent.status = 'available';
      agent.currentLoad = Math.max(0, agent.currentLoad - 1);
    }

    if (this.config.coordinator === 'hierarchical' && this.coordinatorAgent) {
      await this.coordinatorAgent.execute(
        `Task ${task.id} failed. Result: ${result.output}. How should I handle this?`,
        {
          taskId: task.id,
        }
      );
    }

    this.emit('taskFailed', { taskId: task.id, error: result });
  }

  private async processDependencies(completedTaskId: string): Promise<void> {
    const dependentTasks = Array.from(this.taskQueue.values()).filter((t) =>
      t.dependencies.includes(completedTaskId)
    );

    for (const task of dependentTasks) {
      const allDepsCompleted = task.dependencies.every((depId) => this.completedTasks.has(depId));

      if (allDepsCompleted && task.status === 'pending') {
        await this.assignTask(task.id);
      }
    }
  }

  private startTaskProcessor(): void {
    setInterval(async () => {
      const pendingTasks = Array.from(this.taskQueue.values()).filter(
        (t) => t.status === 'pending'
      );

      const runningCount = Array.from(this.agents.values()).reduce(
        (sum, a) => sum + a.currentLoad,
        0
      );

      if (runningCount < this.config.maxParallelTasks) {
        const slotsAvailable = this.config.maxParallelTasks - runningCount;

        for (const task of pendingTasks.slice(0, slotsAvailable)) {
          await this.assignTask(task.id);
        }
      }
    }, 1000);
  }

  getSwarmStatus(): SwarmStatus {
    const agents = Array.from(this.agents.values());

    return {
      name: this.config.name,
      totalAgents: agents.length,
      availableAgents: agents.filter((a) => a.status === 'available').length,
      busyAgents: agents.filter((a) => a.status === 'busy').length,
      pendingTasks: Array.from(this.taskQueue.values()).filter((t) => t.status === 'pending')
        .length,
      completedTasks: this.completedTasks.size,
      failedTasks: Array.from(this.taskQueue.values()).filter((t) => t.status === 'failed').length,
      coordinatorType: this.config.coordinator,
      uptime: Date.now(),
    };
  }

  async shutdown(): Promise<void> {
    for (const [, registration] of this.agents) {
      registration.status = 'offline';
    }

    for (const [taskId, task] of this.taskQueue) {
      if (task.timeout) {
        clearTimeout(task.timeout);
      }
    }

    this.emit('shutdown', { swarmName: this.config.name });
  }
}

interface AgentConfig {
  id: string;
  name: string;
  role: string;
  systemPrompt: string;
  capabilities: string[];
  maxIterations: number;
  reflectionInterval: number;
  temperature: number;
  model: string;
}

interface ConsensusResult {
  winner: any;
  votes: Map<any, number>;
  score: number;
  consensus: boolean;
}

interface SwarmStatus {
  name: string;
  totalAgents: number;
  availableAgents: number;
  busyAgents: number;
  pendingTasks: number;
  completedTasks: number;
  failedTasks: number;
  coordinatorType: string;
  uptime: number;
}

class ConsensusMechanism {
  private threshold: number;

  constructor(threshold: number) {
    this.threshold = threshold;
  }

  async vote(proposals: any[]): Promise<ConsensusResult> {
    if (proposals.length === 0) {
      return { winner: null, votes: new Map(), score: 0, consensus: false };
    }

    const votes = new Map<any, number>();

    for (const proposal of proposals) {
      votes.set(proposal, (votes.get(proposal) || 0) + 1);
    }

    const sorted = Array.from(votes.entries()).sort((a, b) => b[1] - a[1]);
    const winner = sorted[0][0];
    const score = sorted[0][1] / proposals.length;
    const consensus = score >= this.threshold;

    return { winner, votes, score, consensus };
  }
}

class TaskScheduler {
  private tasks: Map<string, NodeJS.Timeout>;

  constructor() {
    this.tasks = new Map();
  }

  schedule(taskId: string, fn: () => void, delayMs: number): void {
    const timeout = setTimeout(fn, delayMs);
    this.tasks.set(taskId, timeout);
  }

  cancel(taskId: string): void {
    const timeout = this.tasks.get(taskId);
    if (timeout) {
      clearTimeout(timeout);
      this.tasks.delete(taskId);
    }
  }
}

export { SwarmOrchestrator };
