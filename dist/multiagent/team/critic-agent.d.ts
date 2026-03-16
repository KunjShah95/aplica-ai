import { Agent } from '../../core/agent.js';
import { AgentOptions } from '../../core/agent.js';
/**
 * Critic Agent - Peer review and feedback generation
 */
export declare class CriticAgent extends Agent {
    private reviewHistory;
    private approvalThreshold;
    constructor(options: AgentOptions);
    /**
     * Review a draft
     */
    reviewDraft(draft: string, context?: {
        purpose?: string;
        audience?: string;
        requirements?: string[];
    }): Promise<CritiqueResult>;
    /**
     * Analyze a draft
     */
    private analyzeDraft;
    /**
     * Check for clarity issues
     */
    private checkClarity;
    /**
     * Check for tone issues
     */
    private checkTone;
    /**
     * Check for structure issues
     */
    private checkStructure;
    /**
     * Score a draft
     */
    private scoreDraft;
    /**
     * Generate feedback
     */
    private generateFeedback;
    /**
     * Generate summary
     */
    private generateSummary;
    /**
     * Get suggested improvements
     */
    private getSuggestedImprovements;
    /**
     * Final approval check
     */
    canApprove(critique?: CritiqueResult): boolean;
    /**
     * Get review history
     */
    getHistory(): CritiqueRecord[];
    /**
     * Get statistics
     */
    getStats(): {
        totalReviews: number;
        approvalRate: number;
        avgScore: number;
    };
}
export interface DraftAnalysis {
    wordCount: number;
    sentenceCount: number;
    averageSentenceLength: number;
    clarityIssues: boolean;
    toneIssues: boolean;
    structureIssues: boolean;
    issues: string[];
}
export interface DraftScores {
    overall: number;
    clarity: number;
    tone: number;
    structure: number;
    completeness: number;
}
export interface Feedback {
    summary: string;
    comments: string[];
    suggestedImprovements: string[];
}
export interface CritiqueResult {
    id: string;
    draftId: string;
    scores: DraftScores;
    feedback: Feedback;
    shouldRevise: boolean;
    analysis: DraftAnalysis;
    reviewedAt: Date;
    duration: number;
}
export interface CritiqueRecord {
    critique: CritiqueResult;
    reviewer: string;
}
/**
 * Factory function to create a critic agent
 */
export declare function createCriticTeamAgent(options: AgentOptions): CriticAgent;
//# sourceMappingURL=critic-agent.d.ts.map