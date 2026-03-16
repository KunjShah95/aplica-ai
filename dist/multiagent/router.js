import { agentFactory } from './agent-factory.js';
/**
 * Task Router - Classifies tasks and routes them to appropriate agents/models
 */
export class TaskRouter {
    routingRules = new Map();
    complexityThresholds = {
        simple: 300,
        medium: 1500,
        complex: 99999,
    };
    constructor() {
        this.initRoutingRules();
    }
    /**
     * Initialize routing rules based on task keywords
     */
    initRoutingRules() {
        const rules = [
            // Brain tasks
            { keywords: ['reason', 'think', 'analyze', 'plan', 'breakdown'], category: 'brain', role: 'scratchpad' },
            { keywords: ['review', 'check', 'score', 'evaluate', 'quality'], category: 'brain', role: 'critic' },
            { keywords: ['route', 'send', 'forward', 'assign', 'delegate'], category: 'brain', role: 'router' },
            // Senses tasks
            { keywords: ['screenshot', 'image', 'visual', 'read pdf', 'ocr', 'table', 'diagram'], category: 'senses', role: 'vision' },
            { keywords: ['audio', 'transcribe', 'speech', 'meeting', 'record', 'speaker'], category: 'senses', role: 'audio' },
            { keywords: ['iot', 'sensor', 'mqtt', 'temp', 'humidity', 'device', 'threshold'], category: 'senses', role: 'iot' },
            // Body tasks
            { keywords: ['research', 'find', 'investigate', 'sources', 'synthes'], category: 'body', role: 'research' },
            { keywords: ['review code', 'pr', 'patch', 'security', 'vulnerability', 'anti-pattern'], category: 'body', role: 'code_review' },
            { keywords: ['data', 'csv', 'table', 'statistics', 'analyze', 'matplotlib'], category: 'body', role: 'analyst' },
            // Team tasks
            { keywords: ['draft', 'write', 'create', 'version', 'initial'], category: 'team', role: 'drafter' },
            { keywords: ['critique', 'feedback', 'improve', 'review draft', 'peer'], category: 'team', role: 'critic' },
            { keywords: ['debate', 'argue', 'opposing', 'counter', 'side'], category: 'team', role: 'debater' },
            { keywords: ['assign', 'task', 'delegate', 'match', 'skill'], category: 'team', role: 'delegate' },
            // Ops tasks
            { keywords: ['monitor', 'metrics', 'latency', 'error', 'grafana', 'prometheus'], category: 'ops', role: 'observability' },
            { keywords: ['cost', 'budget', 'spend', 'token', 'price', 'downgrade'], category: 'ops', role: 'cost_governor' },
            { keywords: ['chaos', 'break', 'test', 'timeout', 'malformed', 'failure'], category: 'ops', role: 'chaos_tester' },
            // Future tasks
            { keywords: ['learn', 'remember', 'style', 'pattern', 'twin', 'model'], category: 'future', role: 'digital_twin' },
            { keywords: ['alert', '提醒', 'notify', 'calendar', 'inbox', 'proactive'], category: 'future', role: 'foresight' },
            { keywords: ['sync', 'device', 'memory', 'privacy', 'federated'], category: 'future', role: 'federated_memory' },
        ];
        rules.forEach((rule) => {
            rule.keywords.forEach((keyword) => {
                this.routingRules.set(keyword, { category: rule.category, role: rule.role });
            });
        });
    }
    /**
     * Classify task complexity based on content analysis
     */
    classifyComplexity(input) {
        const text = Array.isArray(input) ? input.map((m) => m.content).join(' ') : input;
        // Simple heuristic-based classification
        const wordCount = text.split(/\s+/).length;
        const hasComplexityMarkers = this.hasComplexityMarkers(text);
        if (hasComplexityMarkers || wordCount > this.complexityThresholds.medium) {
            return 'complex';
        }
        if (wordCount > this.complexityThresholds.simple) {
            return 'medium';
        }
        return 'simple';
    }
    /**
     * Check for complexity-indicating patterns
     */
    hasComplexityMarkers(text) {
        const markers = [
            'compare and contrast',
            'analyze the implications',
            'synthes',
            'deep research',
            'multiple sources',
            'debate',
            'opposing views',
            'trade-offs',
            'architecture decision',
            'security vulnerability',
            'triangulate',
            'first principles',
        ];
        return markers.some((marker) => text.toLowerCase().includes(marker));
    }
    /**
     * Determine model tier based on task complexity
     */
    determineModelTier(complexity) {
        switch (complexity) {
            case 'simple':
                return 'haiku';
            case 'medium':
                return 'sonnet';
            case 'complex':
                return 'opus';
            default:
                return 'sonnet';
        }
    }
    /**
     * Route a task to the appropriate agent and model
     */
    routeTask(input) {
        const text = Array.isArray(input) ? input.map((m) => m.content).join(' ') : input;
        const complexity = this.classifyComplexity(input);
        const modelTier = this.determineModelTier(complexity);
        // First pass: direct keyword matching
        const words = text.toLowerCase().split(/\s+/);
        const matches = words.flatMap((word) => {
            const matches = Array.from(this.routingRules.keys()).filter((rule) => word.includes(rule));
            return matches.map((rule) => this.routingRules.get(rule));
        });
        const matchedCategories = new Set();
        const matchedRoles = new Set();
        matches.forEach((m) => {
            if (m) {
                matchedCategories.add(m.category);
                matchedRoles.add(m.role);
            }
        });
        // Determine final routing
        let role;
        let reasoning;
        if (matchedRoles.size === 1) {
            role = Array.from(matchedRoles)[0];
            reasoning = `Matched role based on task keywords`;
        }
        else if (matchedCategories.size === 1 && matchedRoles.size > 1) {
            // Multiple roles in same category - pick most relevant
            const category = Array.from(matchedCategories)[0];
            role = this.getMostRelevantRole(category, text);
            reasoning = `Multiple matches in ${category} category; selected most relevant role`;
        }
        else if (matchedCategories.size > 1) {
            // Ambiguous - route to brain:router for self-reference
            role = 'router';
            reasoning = `Task spans multiple categories (${Array.from(matchedCategories).join(', ')}); routing to router agent for self-classification`;
        }
        else {
            // No clear matches - use complexity-based default
            role = this.getDefaultRoleForComplexity(complexity);
            reasoning = `No specific role matched; using complexity-based default (${complexity})`;
        }
        // If complexity is high but model is haiku, upgrade
        const finalModel = complexity === 'complex' ? 'opus' : modelTier;
        return {
            agentRole: role,
            modelTier: finalModel,
            reasoning,
            confidence: this.calculateConfidence(matchedRoles, complexity),
        };
    }
    /**
     * Get most relevant role for a category based on content
     */
    getMostRelevantRole(category, text) {
        const textLower = text.toLowerCase();
        switch (category) {
            case 'brain':
                if (textLower.includes('review') || textLower.includes('score') || textLower.includes('quality')) {
                    return 'critic';
                }
                return 'router';
            case 'senses':
                if (textLower.includes('audio') || textLower.includes('transcribe')) {
                    return 'audio';
                }
                if (textLower.includes('iot') || textLower.includes('sensor')) {
                    return 'iot';
                }
                return 'vision';
            case 'body':
                if (textLower.includes('code') || textLower.includes('security') || textLower.includes('pr')) {
                    return 'code_review';
                }
                if (textLower.includes('data') || textLower.includes('csv') || textLower.includes('analyze')) {
                    return 'analyst';
                }
                return 'research';
            case 'team':
                if (textLower.includes('draft') || textLower.includes('write')) {
                    return 'drafter';
                }
                if (textLower.includes('critique') || textLower.includes('feedback')) {
                    return 'critic';
                }
                if (textLower.includes('debate') || textLower.includes('argue')) {
                    return 'debater';
                }
                return 'delegate';
            case 'ops':
                if (textLower.includes('cost') || textLower.includes('budget') || textLower.includes('token')) {
                    return 'cost_governor';
                }
                if (textLower.includes('chaos') || textLower.includes('break')) {
                    return 'chaos_tester';
                }
                return 'observability';
            case 'future':
                if (textLower.includes('sync') || textLower.includes('memory')) {
                    return 'federated_memory';
                }
                if (textLower.includes('alert') || textLower.includes('proactive')) {
                    return 'foresight';
                }
                return 'digital_twin';
            default:
                return 'router';
        }
    }
    /**
     * Get default role based on complexity
     */
    getDefaultRoleForComplexity(complexity) {
        switch (complexity) {
            case 'simple':
                return 'delegate';
            case 'medium':
                return 'analyst';
            case 'complex':
                return 'research';
            default:
                return 'delegate';
        }
    }
    /**
     * Calculate confidence score for routing decision
     */
    calculateConfidence(matchedRoles, complexity) {
        if (matchedRoles.size === 1) {
            return Math.min(0.95, 0.7 + complexity.length / 10);
        }
        if (matchedRoles.size > 1) {
            return 0.5 + Math.random() * 0.3;
        }
        return 0.4 + Math.random() * 0.3;
    }
    /**
     * Create a specialized agent for a specific task
     */
    async createSpecializedAgent(config, llm, role) {
        const agentConfig = agentFactory.getAgentConfig(role);
        if (!agentConfig) {
            throw new Error(`Unknown agent role: ${role}`);
        }
        return agentFactory.createAgent(config, llm, role);
    }
    /**
     * Process a task through the routing pipeline
     */
    async processTask(input, config, llm) {
        const decision = this.routeTask(input);
        // Log routing decision for observability
        console.log(`[Router] Decision: ${decision.agentRole} -> ${decision.modelTier} (${decision.confidence.toFixed(2)})`);
        const agent = await this.createSpecializedAgent(config, llm, decision.agentRole);
        return {
            agent,
            decision,
        };
    }
}
/**
 * Global task router instance
 */
export const taskRouter = new TaskRouter();
//# sourceMappingURL=router.js.map