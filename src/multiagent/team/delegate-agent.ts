import { randomUUID } from 'crypto';
import { Agent } from '../../core/agent.js';
import { AgentOptions } from '../../core/agent.js';
import { agentFactory, AgentFactory } from '../agent-factory.js';
import { TaskRouter, taskRouter } from '../router.js';

/**
 * Delegate Agent - Task routing and skill matching
 */
export class DelegateAgent extends Agent {
  private delegationHistory: DelegationRecord[] = [];
  private agentRegistry: Map<string, any> = new Map();

  constructor(options: AgentOptions) {
    super(options);
  }

  /**
   * Register an agent in the registry
   */
  registerAgent(agentId: string, agent: any): void {
    this.agentRegistry.set(agentId, agent);
  }

  /**
   * Unregister an agent
   */
  unregisterAgent(agentId: string): boolean {
    return this.agentRegistry.delete(agentId);
  }

  /**
   * Get an agent from the registry
   */
  getAgent(agentId: string): any {
    return this.agentRegistry.get(agentId);
  }

  /**
   * Get all available agents
   */
  getAllAgents(): string[] {
    return Array.from(this.agentRegistry.keys());
  }

  /**
   * Delegate a task to the best available agent
   */
  async delegateTask(
    task: string,
    options?: {
      requiredSkills?: string[];
      preferredAgent?: string;
      forceMatch?: boolean;
    }
  ): Promise<DelegationResult> {
    const startTime = Date.now();

    // Analyze task
    const taskAnalysis = this.analyzeTask(task, options?.requiredSkills);

    // Find matching agent
    let agentId = this.findBestAgent(taskAnalysis, options);

    if (!agentId && options?.forceMatch) {
      // Use fallback agent if no match found
      agentId = 'fallback_agent';
    }

    // Record delegation
    const result: DelegationResult = {
      id: randomUUID(),
      taskId: randomUUID(),
      task,
      analysis: taskAnalysis,
      assignedAgent: agentId || 'no_match',
      confidence: agentId ? 0.9 : 0.1,
      assignedAt: new Date(),
      duration: Date.now() - startTime,
    };

    this.delegationHistory.push({ delegation: result });
    return result;
  }

  /**
   * Analyze a task
   */
  private analyzeTask(
    task: string,
    requiredSkills?: string[]
  ): TaskAnalysis {
    const words = task.toLowerCase().split(/\s+/);

    // Identify task type
    const taskTypes = this.classifyTaskType(words);
    const requiredSkillsFound = this.identifyRequiredSkills(task, requiredSkills);

    return {
      taskType: taskTypes.primary,
      secondaryTypes: taskTypes.secondary,
      complexity: this.estimateComplexity(words),
      requiredSkills: requiredSkillsFound,
      keywords: words.filter((w) => w.length > 3),
    };
  }

  /**
   * Classify task type
   */
  private classifyTaskType(words: string[]): { primary: string; secondary: string[] } {
    const taskMap: Record<string, string[]> = {
      research: ['research', 'investigate', 'find', 'learn', 'study', 'analyze'],
      coding: ['code', 'fix', 'bug', 'develop', 'implement', 'create', 'write'],
      analysis: ['analyze', 'report', 'chart', 'graph', '统计', 'data'],
      communication: ['email', 'write', 'draft', 'reply', 'respond'],
      organization: ['schedule', 'organize', 'plan', 'sort'],
      other: [],
    };

    let primary = 'other';
    const secondary: string[] = [];

    for (const [type, keywords] of Object.entries(taskMap)) {
      const matches = keywords.filter((k) => words.some((w) => w.includes(k)));
      if (matches.length > 0) {
        if (primary === 'other') {
          primary = type;
        }
        if (type !== primary && matches.length >= 2) {
          secondary.push(type);
        }
      }
    }

    return { primary, secondary };
  }

  /**
   * Identify required skills
   */
  private identifyRequiredSkills(
    task: string,
    requiredSkills?: string[]
  ): string[] {
    const skills: string[] = [];

    const taskLower = task.toLowerCase();

    if (taskLower.includes('code') || taskLower.includes('program')) skills.push('coding');
    if (taskLower.includes('data') || taskLower.includes('analysis')) skills.push('analysis');
    if (taskLower.includes('write') || taskLower.includes('draft')) skills.push('writing');
    if (taskLower.includes('research') || taskLower.includes('investigate')) skills.push('research');
    if (taskLower.includes('image') || taskLower.includes('visual')) skills.push('visual');
    if (taskLower.includes('audio') || taskLower.includes('transcribe')) skills.push('audio');

    if (requiredSkills) {
      for (const skill of requiredSkills) {
        if (!skills.includes(skill)) {
          skills.push(skill);
        }
      }
    }

    return skills;
  }

  /**
   * Estimate task complexity
   */
  private estimateComplexity(words: string[]): 'simple' | 'medium' | 'complex' {
    const length = words.length;

    if (length < 5) return 'simple';
    if (length < 15) return 'medium';
    return 'complex';
  }

  /**
   * Find best matching agent
   */
  private findBestAgent(
    analysis: TaskAnalysis,
    options?: { preferredAgent?: string }
  ): string | null {
    // Check preferred agent first
    if (options?.preferredAgent && this.agentRegistry.has(options.preferredAgent)) {
      return options.preferredAgent;
    }

    // Find agent by skills
    for (const [agentId, agent] of this.agentRegistry) {
      const agentSkills = this.getAgentSkills(agent);
      if (this.skillsMatch(agentSkills, analysis.requiredSkills)) {
        return agentId;
      }
    }

    // Fall back to generalist agent
    if (this.agentRegistry.has('generalist')) {
      return 'generalist';
    }

    return null;
  }

  /**
   * Get skills for an agent
   */
  private getAgentSkills(agent: any): string[] {
    // In production, would extract from agent configuration
    return ['general'];
  }

  /**
   * Check if skills match
   */
  private skillsMatch(agentSkills: string[], requiredSkills: string[]): boolean {
    if (requiredSkills.length === 0) return true;
    return requiredSkills.some((skill) => agentSkills.includes(skill));
  }

  /**
   * Get delegation history
   */
  getHistory(): DelegationRecord[] {
    return this.delegationHistory;
  }

  /**
   * Get statistics
   */
  getStats(): {
    totalDelegations: number;
    successRate: number;
    avgConfidence: number;
    assignmentByAgent: Record<string, number>;
  } {
    if (this.delegationHistory.length === 0) {
      return {
        totalDelegations: 0,
        successRate: 0,
        avgConfidence: 0,
        assignmentByAgent: {},
      };
    }

    const assignmentByAgent: Record<string, number> = {};
    let totalConfidence = 0;

    for (const record of this.delegationHistory) {
      const delegation = record.delegation;
      assignmentByAgent[delegation.assignedAgent] =
        (assignmentByAgent[delegation.assignedAgent] || 0) + 1;
      totalConfidence += delegation.confidence;
    }

    const successCount = this.delegationHistory.filter((r) => r.delegation.confidence > 0.5).length;

    return {
      totalDelegations: this.delegationHistory.length,
      successRate: successCount / this.delegationHistory.length,
      avgConfidence: totalConfidence / this.delegationHistory.length,
      assignmentByAgent,
    };
  }
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
export function createDelegateAgent(options: AgentOptions): DelegateAgent {
  return new DelegateAgent(options);
}
