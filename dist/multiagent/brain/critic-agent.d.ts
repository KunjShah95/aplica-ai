import { Agent } from '../../core/agent.js';
import { AgentOptions } from '../../core/agent.js';
/**
 * Critique Agent - Self-critique loop with quality scoring
 */
export declare class CriticAgent extends Agent {
    private critiqueHistory;
    constructor(options: AgentOptions);
    /**
     * Evaluate a response against quality rubric
     */
    evaluate(response: string, task: string, expectedOutcome?: string): CritiqueResult;
    /**
     * Score accuracy (0-10)
     */
    private scoreAccuracy;
    /**
     * Score completeness (0-10)
     */
    private scoreCompleteness;
    /**
     * Score tone (0-10)
     */
    private scoreTone;
    /**
     * Score usefulness (0-10)
     */
    private scoreUsefulness;
    /**
     * Generate feedback based on scores
     */
    private generateFeedback;
    /**
     * Get critique history
     */
    getHistory(): CritiqueRecord[];
    /**
     * Get average score over all critiques
     */
    getAverageScore(): number;
}
export interface CritiqueScores {
    accuracy: number;
    completeness: number;
    tone: number;
    usefulness: number;
}
export interface CritiqueResult {
    score: number;
    scores: CritiqueScores;
    feedback: string;
    shouldRetry: boolean;
}
export interface CritiqueRecord {
    score: number;
    scores: CritiqueScores;
    feedback: string;
    shouldRetry: boolean;
    timestamp: Date;
}
/**
 * Factory function to create a critic agent
 */
export declare function createCriticAgent(options: AgentOptions): CriticAgent;
//# sourceMappingURL=critic-agent.d.ts.map