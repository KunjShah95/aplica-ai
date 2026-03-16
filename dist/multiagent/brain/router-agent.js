import { Agent } from '../../core/agent.js';
import { taskRouter } from '../router.js';
/**
 * Router Agent - Smart model routing and task distribution
 */
export class RouterAgent extends Agent {
    taskRouter;
    routingHistory = [];
    constructor(options) {
        super(options);
        this.taskRouter = taskRouter;
    }
    /**
     * Route an incoming task to the appropriate agent/model
     */
    async routeTask(input, options) {
        const decision = this.taskRouter.routeTask(input);
        this.routingHistory.push(decision);
        console.log(`[RouterAgent] Routed: ${decision.agentRole} -> ${decision.modelTier}`);
        return decision;
    }
    /**
     * Determine model tier for a specific task
     */
    determineModelTier(task) {
        const complexity = this.taskRouter.classifyComplexity(task);
        return this.taskRouter.determineModelTier(complexity);
    }
    /**
     * Classify task complexity
     */
    classifyComplexity(task) {
        return this.taskRouter.classifyComplexity(task);
    }
    /**
     * Get routing history
     */
    getHistory() {
        return this.routingHistory;
    }
    /**
     * Get statistics about routing decisions
     */
    getStats() {
        const byModel = { haiku: 0, sonnet: 0, opus: 0 };
        const byRole = {};
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
    clearHistory() {
        this.routingHistory = [];
        console.log('[RouterAgent] History cleared');
    }
    /**
     * Advanced routing with custom rules
     */
    async routeWithRules(input, rules) {
        let decision = this.taskRouter.routeTask(input);
        // Apply rules
        if (rules.forceModel) {
            decision.modelTier = rules.forceModel;
            decision.reasoning += ` (forced: ${rules.forceModel})`;
        }
        if (rules.forbiddenModels?.includes(decision.modelTier)) {
            // Downgrade model
            const tierOrder = ['haiku', 'sonnet', 'opus'];
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
export function createRouterAgent(options) {
    return new RouterAgent(options);
}
//# sourceMappingURL=router-agent.js.map