import { Agent } from '../../core/agent.js';
import { AgentOptions } from '../../core/agent.js';
/**
 * Debater Agent - Multi-agent debate coordination
 */
export declare class DebaterAgent extends Agent {
    private debateHistory;
    private debateFormat;
    constructor(options: AgentOptions);
    /**
     * Set up debate format
     */
    setupDebate(format: DebateFormat): void;
    /**
     * Run a debate
     */
    runDebate(topic: string, options?: {
        proAgent?: string;
        conAgent?: string;
        maxTurns?: number;
    }): Promise<DebateResult>;
    /**
     * Generate opening arguments
     */
    private generateOpening;
    /**
     * Generate argument content
     */
    private generateArgumentContent;
    /**
     * Generate rebuttals
     */
    private generateRebuttals;
    /**
     * Generate rebuttal content
     */
    private generateRebuttalContent;
    /**
     * Generate closing arguments
     */
    private generateClosing;
    /**
     * Generate closing content
     */
    private generateClosingContent;
    /**
     * Calculate argument score
     */
    private calculateArgumentScore;
    /**
     * Generate synthesis of the debate
     */
    private generateSynthesis;
    /**
     * Determine winner based on scores
     */
    private determineWinner;
    /**
     * Get debate history
     */
    getHistory(): DebateRecord[];
    /**
     * Get statistics
     */
    getStats(): {
        totalDebates: number;
        avgTurns: number;
        winRate: {
            pro: number;
            con: number;
            tie: number;
        };
    };
}
export interface OpeningArgument {
    id: string;
    type: string;
    content: string;
    strength: number;
}
export interface Rebuttal {
    id: string;
    targetOpeningId: string;
    content: string;
    effectiveness: number;
}
export interface ClosingArgument {
    id: string;
    content: string;
    summary: string;
    callToAction: string;
}
export interface DebateResult {
    id: string;
    topic: string;
    timestamp: Date;
    format: DebateFormat;
    turns: any[];
    pro: {
        agent: string;
        openings: OpeningArgument[];
        rebuttals: Rebuttal[];
        closings: ClosingArgument[];
        score: number;
    };
    con: {
        agent: string;
        openings: OpeningArgument[];
        rebuttals: Rebuttal[];
        closings: ClosingArgument[];
        score: number;
    };
    synthesis: DebateSynthesis;
    winner: 'pro' | 'con' | 'tie';
    duration: number;
}
export interface DebateSynthesis {
    keyPoints: string[];
    strengths: {
        pro: number;
        con: number;
    };
    weaknesses: {
        pro: string;
        con: string;
    };
    commonGround: string;
}
export interface DebateFormat {
    topic: string;
    sides: {
        pro: string;
        con: string;
    };
    rules: {
        maxTurns: number;
        timeLimit: number;
        requiredArguments: string[];
    };
}
export interface DebateRecord {
    debate: DebateResult;
}
/**
 * Factory function to create a debater agent
 */
export declare function createDebaterAgent(options: AgentOptions): DebaterAgent;
//# sourceMappingURL=debater-agent.d.ts.map