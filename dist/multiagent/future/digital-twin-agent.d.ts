import { Agent } from '../../core/agent.js';
import { AgentOptions } from '../../core/agent.js';
/**
 * Digital Twin Agent - User modeling and autonomous action
 */
export declare class DigitalTwinAgent extends Agent {
    private userModel;
    private autonomyLevel;
    constructor(options: AgentOptions);
    /**
     * Learn from user interactions
     */
    learnFromInteraction(interaction: Interaction): Promise<void>;
    /**
     * Analyze writing style
     */
    private analyzeWritingStyle;
    /**
     * Update preferences based on interaction
     */
    private updatePreferences;
    /**
     * Record decision pattern
     */
    private recordDecisionPattern;
    /**
     * Update user model
     */
    private updateUserModel;
    /**
     * Get user model
     */
    getUserModel(): UserModel;
    /**
     * Act on behalf of user (autonomous action)
     */
    actOnBehalf(task: string, options?: {
        autonomyLevel?: 'low' | 'medium' | 'high';
    }): Promise<AutonomousAction>;
    /**
     * Generate action based on learned patterns
     */
    private generateAction;
    /**
     * Get recommended autonomous actions
     */
    getRecommendedActions(): AutonomousAction[];
    /**
     * Set autonomy level
     */
    setAutonomyLevel(level: 'none' | 'low' | 'medium' | 'high'): void;
    /**
     * Get autonomy level
     */
    getAutonomyLevel(): 'none' | 'low' | 'medium' | 'high';
}
export interface UserModel {
    writingStyle: {
        complexity: 'simple' | 'medium' | 'complex';
        tone: 'professional' | 'casual' | 'friendly';
    };
    preferences: Record<string, {
        count: number;
        positive: number;
        lastUsed?: Date;
    }>;
    decisionPatterns: DecisionPattern[];
    taskTemplates: TaskTemplate[];
    learnedBehaviors: LearnedBehavior[];
    lastUpdated: Date;
}
export interface DecisionPattern {
    type: InteractionType;
    choice: string;
    timestamp: Date;
}
export interface TaskTemplate {
    task: string;
    action: string;
    autonomyLevel: 'low' | 'medium' | 'high';
    timestamp: Date;
}
export interface LearnedBehavior {
    type: string;
    key: string;
    value: string;
    timestamp: Date;
}
export interface Interaction {
    type: InteractionType;
    content: string;
    choice?: string;
    outcome: 'positive' | 'negative';
}
export type InteractionType = 'email' | 'task' | 'decision' | 'communication';
export interface AutonomousAction {
    id: string;
    action: string;
    status: 'completed' | 'requires_review' | 'blocked' | 'recommended';
    reason?: string;
    timestamp: Date;
}
/**
 * Factory function to create a digital twin agent
 */
export declare function createDigitalTwinAgent(options: AgentOptions): DigitalTwinAgent;
//# sourceMappingURL=digital-twin-agent.d.ts.map