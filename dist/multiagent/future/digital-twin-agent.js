import { randomUUID } from 'crypto';
import { Agent } from '../../core/agent.js';
/**
 * Digital Twin Agent - User modeling and autonomous action
 */
export class DigitalTwinAgent extends Agent {
    userModel = {
        writingStyle: { complexity: 'medium', tone: 'professional' },
        preferences: {},
        decisionPatterns: [],
        taskTemplates: [],
        learnedBehaviors: [],
        lastUpdated: new Date(),
    };
    autonomyLevel = 'low';
    constructor(options) {
        super(options);
    }
    /**
     * Learn from user interactions
     */
    async learnFromInteraction(interaction) {
        this.analyzeWritingStyle(interaction.content);
        this.updatePreferences(interaction.type, interaction.outcome);
        this.recordDecisionPattern(interaction.type, interaction.choice || 'unspecified');
        this.updateUserModel();
    }
    /**
     * Analyze writing style
     */
    analyzeWritingStyle(content) {
        const words = content.split(/\s+/);
        const sentences = content.split(/[.!?]+/);
        const avgWordLength = content.replace(/\s+/g, '').length / words.length;
        const avgSentenceLength = words.length / sentences.length;
        // Determine complexity
        let complexity = 'medium';
        if (avgWordLength > 5 && avgSentenceLength > 15) {
            complexity = 'complex';
        }
        else if (avgWordLength < 4 || avgSentenceLength < 8) {
            complexity = 'simple';
        }
        // Determine tone
        let tone = 'professional';
        const casualWords = ['hey', 'hiya', 'guy', 'stuff', 'thing', 'guy'];
        const professionalWords = ['regards', 'sincerely', 'respectfully', 'therefore', 'furthermore'];
        const casualCount = casualWords.filter((w) => content.toLowerCase().includes(w)).length;
        const professionalCount = professionalWords.filter((w) => content.toLowerCase().includes(w)).length;
        if (professionalCount > casualCount * 2)
            tone = 'professional';
        else if (casualCount > professionalCount * 2)
            tone = 'casual';
        this.userModel.writingStyle = { complexity, tone };
    }
    /**
     * Update preferences based on interaction
     */
    updatePreferences(type, outcome) {
        const key = `interaction:${type}`;
        const existing = this.userModel.preferences[key] || { count: 0, positive: 0 };
        this.userModel.preferences[key] = {
            count: existing.count + 1,
            positive: existing.positive + (outcome === 'positive' ? 1 : 0),
            lastUsed: new Date(),
        };
        // Update learned behavior
        if (outcome === 'positive') {
            this.userModel.learnedBehaviors.push({
                type: 'preference',
                key,
                value: outcome,
                timestamp: new Date(),
            });
        }
    }
    /**
     * Record decision pattern
     */
    recordDecisionPattern(type, choice) {
        this.userModel.decisionPatterns.push({
            type,
            choice,
            timestamp: new Date(),
        });
        // Keep only last 1000 patterns
        if (this.userModel.decisionPatterns.length > 1000) {
            this.userModel.decisionPatterns.shift();
        }
    }
    /**
     * Update user model
     */
    updateUserModel() {
        this.userModel.lastUpdated = new Date();
    }
    /**
     * Get user model
     */
    getUserModel() {
        return this.userModel;
    }
    /**
     * Act on behalf of user (autonomous action)
     */
    async actOnBehalf(task, options) {
        const autonomy = options?.autonomyLevel || this.autonomyLevel;
        if (autonomy === 'none') {
            return {
                id: randomUUID(),
                action: task,
                status: 'blocked',
                reason: 'Autonomy disabled',
                timestamp: new Date(),
            };
        }
        // Generate action based on learned patterns
        const action = this.generateAction(task);
        // If autonomy is low, mark for review
        const status = autonomy === 'low' ? 'requires_review' : 'completed';
        const actionResult = {
            id: randomUUID(),
            action,
            status,
            timestamp: new Date(),
        };
        // Record the action
        this.userModel.taskTemplates.push({
            task,
            action,
            autonomyLevel: autonomy,
            timestamp: new Date(),
        });
        return actionResult;
    }
    /**
     * Generate action based on learned patterns
     */
    generateAction(task) {
        // Check for similar tasks in history
        const matchingTemplates = this.userModel.taskTemplates.filter((t) => t.task === task);
        if (matchingTemplates.length > 0) {
            // Return the action used before
            return matchingTemplates[matchingTemplates.length - 1].action;
        }
        // Generate new action based on task type
        if (task.includes('email')) {
            return `Drafted email response for: ${task}`;
        }
        if (task.includes('schedule') || task.includes('meeting')) {
            return `Created calendar entry for: ${task}`;
        }
        if (task.includes('write') || task.includes('document')) {
            return `Created document for: ${task}`;
        }
        return `Generated response for: ${task}`;
    }
    /**
     * Get recommended autonomous actions
     */
    getRecommendedActions() {
        // Find tasks that user has done multiple times
        const actionCounts = {};
        for (const pattern of this.userModel.decisionPatterns) {
            actionCounts[pattern.choice] = (actionCounts[pattern.choice] || 0) + 1;
        }
        return Object.entries(actionCounts)
            .filter(([_, count]) => count >= 3)
            .map(([action]) => ({
            id: randomUUID(),
            action,
            status: 'recommended',
            timestamp: new Date(),
        }));
    }
    /**
     * Set autonomy level
     */
    setAutonomyLevel(level) {
        this.autonomyLevel = level;
        console.log(`[DigitalTwinAgent] Autonomy level set to: ${level}`);
    }
    /**
     * Get autonomy level
     */
    getAutonomyLevel() {
        return this.autonomyLevel;
    }
}
/**
 * Factory function to create a digital twin agent
 */
export function createDigitalTwinAgent(options) {
    return new DigitalTwinAgent(options);
}
//# sourceMappingURL=digital-twin-agent.js.map