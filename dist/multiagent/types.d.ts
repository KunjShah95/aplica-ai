/**
 * Agent Categories for specialization
 */
export type AgentCategory = 'brain' | 'senses' | 'body' | 'team' | 'ops' | 'future';
/**
 * Brain Agents - Intelligence upgrades
 */
export type BrainAgentType = 'scratchpad' | 'critic' | 'router';
/**
 * Senses Agents - Perception capabilities
 */
export type SensesAgentType = 'vision' | 'audio' | 'iot';
/**
 * Body Agents - New skills
 */
export type BodyAgentType = 'research' | 'code_review' | 'analyst';
/**
 * Team Agents - Multi-agent patterns
 */
export type TeamAgentType = 'drafter' | 'critic_team' | 'debater' | 'delegate';
/**
 * Ops Agents - Production hardening
 */
export type OpsAgentType = 'observability' | 'cost_governor' | 'chaos_tester';
/**
 * Future Agents - Ambitious capabilities
 */
export type FutureAgentType = 'digital_twin' | 'foresight' | 'federated_memory';
/**
 * Full agent role type
 */
export type AgentRole = BrainAgentType | SensesAgentType | BodyAgentType | TeamAgentType | OpsAgentType | FutureAgentType;
/**
 * Task complexity levels for model routing
 */
export type TaskComplexity = 'simple' | 'medium' | 'complex';
/**
 * Task routing result
 */
export interface RoutingDecision {
    agentRole: AgentRole;
    modelTier: 'haiku' | 'sonnet' | 'opus';
    reasoning: string;
    confidence: number;
}
/**
 * Agent message format for inter-agent communication
 */
export interface AgentMessage {
    id: string;
    from: string;
    to: string;
    type: 'task' | 'result' | 'query' | 'response' | 'status' | 'request' | 'ack';
    payload: unknown;
    timestamp: Date;
    priority?: number;
    context?: Record<string, unknown>;
}
/**
 * Task state for agent coordination
 */
export interface AgentTask {
    id: string;
    type: string;
    payload: Record<string, unknown>;
    status: 'pending' | 'assigned' | 'processing' | 'completed' | 'failed' | 'debating';
    assignedTo?: string;
    priority: number;
    dependencies?: string[];
    result?: unknown;
    error?: string;
    createdAt: Date;
    updatedAt: Date;
    metadata?: {
        scratchpad?: string[];
        critique?: {
            score: number;
            feedback: string;
            timestamp: Date;
        }[];
        modelUsed?: string;
        modelConfidence?: number;
        routingReason?: string;
        cost?: number;
    };
}
/**
 * Agent configuration
 */
export interface AgentConfig {
    id: string;
    name: string;
    role: AgentRole;
    category: AgentCategory;
    capabilities: string[];
    systemPrompt?: string;
    modelPreferences?: {
        preferred: string;
        fallback?: string[];
    };
    maxTasks?: number;
    priority?: number;
    settings?: Record<string, unknown>;
}
/**
 * Swarm configuration
 */
export interface SwarmConfig {
    name: string;
    workflow: 'sequential' | 'parallel' | 'hierarchical' | 'peer_review' | 'debate';
    maxConcurrency?: number;
    maxRetries?: number;
    failFast?: boolean;
}
/**
 * Statistics for agent monitoring
 */
export interface AgentStats {
    totalTasks: number;
    completedTasks: number;
    failedTasks: number;
    avgResponseTime: number;
    totalCost?: number;
    modelUsage: Record<string, number>;
}
/**
 * Observability data for ops agents
 */
export interface ObservabilityData {
    latency: number;
    errorRate: number;
    throughput: number;
    agents: Record<string, AgentStats>;
    timestamp: Date;
}
/**
 * Cost tracking interface
 */
export interface CostTracking {
    tokensUsed: number;
    cost: number;
    model: string;
    timestamp: Date;
    userId?: string;
    agentId?: string;
}
/**
 * Debate format for multi-agent discussions
 */
export interface DebateFormat {
    topic: string;
    sides: {
        pro: AgentRole;
        con: AgentRole;
    };
    rules: {
        maxTurns: number;
        timeLimit?: number;
        requiredArguments: string[];
    };
}
/**
 * Proactive alert for foresight agent
 */
export interface ProactiveAlert {
    id: string;
    type: 'calendar' | 'inbox' | 'codebase' | 'habit';
    title: string;
    description: string;
    context: Record<string, unknown>;
    timestamp: Date;
    suggestedAction?: string;
}
//# sourceMappingURL=types.d.ts.map