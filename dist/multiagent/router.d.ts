import { LLMProvider, LLMMessage } from '../core/llm/index.js';
import { AgentRole, RoutingDecision, TaskComplexity } from './types.js';
/**
 * Task Router - Classifies tasks and routes them to appropriate agents/models
 */
export declare class TaskRouter {
    private routingRules;
    private complexityThresholds;
    constructor();
    /**
     * Initialize routing rules based on task keywords
     */
    private initRoutingRules;
    /**
     * Classify task complexity based on content analysis
     */
    classifyComplexity(input: string | LLMMessage[]): TaskComplexity;
    /**
     * Check for complexity-indicating patterns
     */
    private hasComplexityMarkers;
    /**
     * Determine model tier based on task complexity
     */
    determineModelTier(complexity: TaskComplexity): 'haiku' | 'sonnet' | 'opus';
    /**
     * Route a task to the appropriate agent and model
     */
    routeTask(input: string | LLMMessage[]): RoutingDecision;
    /**
     * Get most relevant role for a category based on content
     */
    private getMostRelevantRole;
    /**
     * Get default role based on complexity
     */
    private getDefaultRoleForComplexity;
    /**
     * Calculate confidence score for routing decision
     */
    private calculateConfidence;
    /**
     * Create a specialized agent for a specific task
     */
    createSpecializedAgent(config: any, llm: LLMProvider, role: AgentRole): Promise<any>;
    /**
     * Process a task through the routing pipeline
     */
    processTask(input: string | LLMMessage[], config: any, llm: LLMProvider): Promise<any>;
}
/**
 * Global task router instance
 */
export declare const taskRouter: TaskRouter;
//# sourceMappingURL=router.d.ts.map