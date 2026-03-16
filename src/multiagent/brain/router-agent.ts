import { randomUUID } from 'crypto';
import { Agent } from '../../core/agent.js';
import { AgentOptions } from '../../core/agent.js';
import { TaskRouter, taskRouter } from '../router.js';
import { RoutingDecision } from '../types.js';

/**
 * Router Agent - Smart model routing and task distribution
 */
export class RouterAgent extends Agent {
  private taskRouter: TaskRouter;
  private routingHistory: RoutingDecision[] = [];

  constructor(options: AgentOptions) {
    super(options);
    this.taskRouter = taskRouter;
  }

  /**
   * Route an incoming task to the appropriate agent/model
   */
  async routeTask(input: string, options?: { taskType?: string }): Promise<RoutingDecision> {
    const decision = this.taskRouter.routeTask(input);

    this.routingHistory.push(decision);
    console.log(`[RouterAgent] Routed: ${decision.agentRole} -> ${decision.modelTier}`);

    return decision;
  }

  /**
   * Determine model tier for a specific task
   */
  determineModelTier(task: string): 'haiku' | 'sonnet' | 'opus' {
    const complexity = this.taskRouter.classifyComplexity(task);
    return this.taskRouter.determineModelTier(complexity);
  }

  /**
   * Classify task complexity
   */
  classifyComplexity(task: string): 'simple' | 'medium' | 'complex' {
    return this.taskRouter.classifyComplexity(task);
  }

  /**
   * Get routing history
   */
  getHistory(): RoutingDecision[] {
    return this.routingHistory;
  }

  /**
   * Get statistics about routing decisions
   */
  getStats(): {
    totalRouted: number;
    byModel: Record<string, number>;
    byRole: Record<string, number>;
    avgConfidence: number;
  } {
    const byModel: Record<string, number> = { haiku: 0, sonnet: 0, opus: 0 };
    const byRole: Record<string, number> = {};
    let totalConfidence = 0;

    for (const decision of this.routingHistory) {
      byModel[decision.modelTier]++;
      byRole[decision.agentRole] = (byRole[decision.agentRole] || 0) + 1;
      totalConfidence += decision.confidence;
    }

    return {
      totalRouted: this.routingHistory.length,
      byModel,
      byRole,
      avgConfidence: this.routingHistory.length
        ? totalConfidence / this.routingHistory.length
        : 0,
    };
  }

  /**
   * Reset routing history
   */
  clearHistory(): void {
    this.routingHistory = [];
    console.log('[RouterAgent] History cleared');
  }

  /**
   * Advanced routing with custom rules
   */
  async routeWithRules(
    input: string,
    rules: {
      priorityRoles?: string[];
      forbiddenModels?: string[];
      forceModel?: string;
    }
  ): Promise<RoutingDecision> {
    let decision = this.taskRouter.routeTask(input);

    // Apply rules
    if (rules.forceModel) {
      decision.modelTier = rules.forceModel as 'haiku' | 'sonnet' | 'opus';
      decision.reasoning += ` (forced: ${rules.forceModel})`;
    }

    if (rules.forbiddenModels?.includes(decision.modelTier)) {
      // Downgrade model
      const tierOrder: ('haiku' | 'sonnet' | 'opus')[] = ['haiku', 'sonnet', 'opus'];
      const currentIndex = tierOrder.indexOf(decision.modelTier);

      for (let i = currentIndex - 1; i >= 0; i--) {
        if (!rules.forbiddenModels?.includes(tierOrder[i])) {
          decision.modelTier = tierOrder[i];
          decision.reasoning += ` (downgraded due to constraints)`;
          break;
        }
      }
    }

    if (rules.priorityRoles?.includes(decision.agentRole)) {
      decision.confidence = Math.min(1.0, decision.confidence + 0.2);
      decision.reasoning += ' (priority role)';
    }

    this.routingHistory.push(decision);
    return decision;
  }
}

/**
 * Factory function to create a router agent
 */
export function createRouterAgent(options: AgentOptions): RouterAgent {
  return new RouterAgent(options);
}
