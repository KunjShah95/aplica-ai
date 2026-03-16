import { Agent } from '../../core/agent.js';
import { AgentOptions } from '../../core/agent.js';
import { RoutingDecision } from '../types.js';
/**
 * Router Agent - Smart model routing and task distribution
 */
export declare class RouterAgent extends Agent {
    private taskRouter;
    private routingHistory;
    constructor(options: AgentOptions);
    /**
     * Route an incoming task to the appropriate agent/model
     */
    routeTask(input: string, options?: {
        taskType?: string;
    }): Promise<RoutingDecision>;
    /**
     * Determine model tier for a specific task
     */
    determineModelTier(task: string): 'haiku' | 'sonnet' | 'opus';
    /**
     * Classify task complexity
     */
    classifyComplexity(task: string): 'simple' | 'medium' | 'complex';
    /**
     * Get routing history
     */
    getHistory(): RoutingDecision[];
    /**
     * Get statistics about routing decisions
     */
    getStats(): {
        totalRouted: number;
        byModel: Record<string, number>;
        byRole: Record<string, number>;
        avgConfidence: number;
    };
    /**
     * Reset routing history
     */
    clearHistory(): void;
    /**
     * Advanced routing with custom rules
     */
    routeWithRules(input: string, rules: {
        priorityRoles?: string[];
        forbiddenModels?: string[];
        forceModel?: string;
    }): Promise<RoutingDecision>;
}
/**
 * Factory function to create a router agent
 */
export declare function createRouterAgent(options: AgentOptions): RouterAgent;
//# sourceMappingURL=router-agent.d.ts.map