import { randomUUID } from 'crypto';
import { Agent } from '../../core/agent.js';
/**
 * Delegate Agent - Task routing and skill matching
 */
export class DelegateAgent extends Agent {
    delegationHistory = [];
    agentRegistry = new Map();
    constructor(options) {
        super(options);
    }
    /**
     * Register an agent in the registry
     */
    registerAgent(agentId, agent) {
        this.agentRegistry.set(agentId, agent);
    }
    /**
     * Unregister an agent
     */
    unregisterAgent(agentId) {
        return this.agentRegistry.delete(agentId);
    }
    /**
     * Get an agent from the registry
     */
    getAgent(agentId) {
        return this.agentRegistry.get(agentId);
    }
    /**
     * Get all available agents
     */
    getAllAgents() {
        return Array.from(this.agentRegistry.keys());
    }
    /**
     * Delegate a task to the best available agent
     */
    async delegateTask(task, options) {
        const startTime = Date.now();
        // Analyze task
        const taskAnalysis = this.analyzeTask(task, options?.requiredSkills);
        // Find matching agent
        let agentId = this.findBestAgent(taskAnalysis, options);
        if (!agentId && options?.forceMatch) {
            // Use fallback agent if no match found
            agentId = 'fallback_agent';
        }
        // Record delegation
        const result = {
            id: randomUUID(),
            taskId: randomUUID(),
            task,
            analysis: taskAnalysis,
            assignedAgent: agentId || 'no_match',
            confidence: agentId ? 0.9 : 0.1,
            assignedAt: new Date(),
            duration: Date.now() - startTime,
        };
        this.delegationHistory.push({ delegation: result });
        return result;
    }
    /**
     * Analyze a task
     */
    analyzeTask(task, requiredSkills) {
        const words = task.toLowerCase().split(/\s+/);
        // Identify task type
        const taskTypes = this.classifyTaskType(words);
        const requiredSkillsFound = this.identifyRequiredSkills(task, requiredSkills);
        return {
            taskType: taskTypes.primary,
            secondaryTypes: taskTypes.secondary,
            complexity: this.estimateComplexity(words),
            requiredSkills: requiredSkillsFound,
            keywords: words.filter((w) => w.length > 3),
        };
    }
    /**
     * Classify task type
     */
    classifyTaskType(words) {
        const taskMap = {
            research: ['research', 'investigate', 'find', 'learn', 'study', 'analyze'],
            coding: ['code', 'fix', 'bug', 'develop', 'implement', 'create', 'write'],
            analysis: ['analyze', 'report', 'chart', 'graph', '统计', 'data'],
            communication: ['email', 'write', 'draft', 'reply', 'respond'],
            organization: ['schedule', 'organize', 'plan', 'sort'],
            other: [],
        };
        let primary = 'other';
        const secondary = [];
        for (const [type, keywords] of Object.entries(taskMap)) {
            const matches = keywords.filter((k) => words.some((w) => w.includes(k)));
            if (matches.length > 0) {
                if (primary === 'other') {
                    primary = type;
                }
                if (type !== primary && matches.length >= 2) {
                    secondary.push(type);
                }
            }
        }
        return { primary, secondary };
    }
    /**
     * Identify required skills
     */
    identifyRequiredSkills(task, requiredSkills) {
        const skills = [];
        const taskLower = task.toLowerCase();
        if (taskLower.includes('code') || taskLower.includes('program'))
            skills.push('coding');
        if (taskLower.includes('data') || taskLower.includes('analysis'))
            skills.push('analysis');
        if (taskLower.includes('write') || taskLower.includes('draft'))
            skills.push('writing');
        if (taskLower.includes('research') || taskLower.includes('investigate'))
            skills.push('research');
        if (taskLower.includes('image') || taskLower.includes('visual'))
            skills.push('visual');
        if (taskLower.includes('audio') || taskLower.includes('transcribe'))
            skills.push('audio');
        if (requiredSkills) {
            for (const skill of requiredSkills) {
                if (!skills.includes(skill)) {
                    skills.push(skill);
                }
            }
        }
        return skills;
    }
    /**
     * Estimate task complexity
     */
    estimateComplexity(words) {
        const length = words.length;
        if (length < 5)
            return 'simple';
        if (length < 15)
            return 'medium';
        return 'complex';
    }
    /**
     * Find best matching agent
     */
    findBestAgent(analysis, options) {
        // Check preferred agent first
        if (options?.preferredAgent && this.agentRegistry.has(options.preferredAgent)) {
            return options.preferredAgent;
        }
        // Find agent by skills
        for (const [agentId, agent] of this.agentRegistry) {
            const agentSkills = this.getAgentSkills(agent);
            if (this.skillsMatch(agentSkills, analysis.requiredSkills)) {
                return agentId;
            }
        }
        // Fall back to generalist agent
        if (this.agentRegistry.has('generalist')) {
            return 'generalist';
        }
        return null;
    }
    /**
     * Get skills for an agent
     */
    getAgentSkills(agent) {
        // In production, would extract from agent configuration
        return ['general'];
    }
    /**
     * Check if skills match
     */
    skillsMatch(agentSkills, requiredSkills) {
        if (requiredSkills.length === 0)
            return true;
        return requiredSkills.some((skill) => agentSkills.includes(skill));
    }
    /**
     * Get delegation history
     */
    getHistory() {
        return this.delegationHistory;
    }
    /**
     * Get statistics
     */
    getStats() {
        if (this.delegationHistory.length === 0) {
            return {
                totalDelegations: 0,
                successRate: 0,
                avgConfidence: 0,
                assignmentByAgent: {},
            };
        }
        const assignmentByAgent = {};
        let totalConfidence = 0;
        for (const record of this.delegationHistory) {
            const delegation = record.delegation;
            assignmentByAgent[delegation.assignedAgent] =
                (assignmentByAgent[delegation.assignedAgent] || 0) + 1;
            totalConfidence += delegation.confidence;
        }
        const successCount = this.delegationHistory.filter((r) => r.delegation.confidence > 0.5).length;
        return {
            totalDelegations: this.delegationHistory.length,
            successRate: successCount / this.delegationHistory.length,
            avgConfidence: totalConfidence / this.delegationHistory.length,
            assignmentByAgent,
        };
    }
}
/**
 * Factory function to create a delegate agent
 */
export function createDelegateAgent(options) {
    return new DelegateAgent(options);
}
//# sourceMappingURL=delegate-agent.js.map