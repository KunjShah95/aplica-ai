import { Agent } from '../../core/agent.js';
import { AgentOptions } from '../../core/agent.js';
/**
 * Scratchpad Agent - Chain-of-thought reasoning before tool calls
 */
export declare class ScratchpadAgent extends Agent {
    private scratchpad;
    private thinkingThreshold;
    constructor(options: AgentOptions);
    /**
     * Add thought to scratchpad
     */
    private addThought;
    /**
     * Get current scratchpad content
     */
    getScratchpad(): string[];
    /**
     * Clear scratchpad
     */
    clearScratchpad(): void;
    /**
     * Process message with internal reasoning
     */
    processWithScratchpad(content: string): Promise<{
        response: string;
        reasoning: string[];
    }>;
    /**
     * Generate response based on thinking progress
     */
    private generateResponse;
    /**
     * Execute task after internal reasoning
     */
    executeWithReasoning(task: string, executeFn: () => Promise<unknown>): Promise<{
        response: string;
        reasoning: string[];
        result?: unknown;
        error?: string;
    }>;
}
/**
 * Factory function to create a scratchpad agent
 */
export declare function createScratchpadAgent(options: AgentOptions): ScratchpadAgent;
//# sourceMappingURL=scratchpad-agent.d.ts.map