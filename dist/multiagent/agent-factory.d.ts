import { Agent } from '../core/agent.js';
import { AppConfig } from '../config/types.js';
import { LLMProvider } from '../core/llm/index.js';
import { AgentConfig, AgentRole } from './types.js';
/**
 * Factory for creating specialized sub-agents with pre-configured personalities
 */
export declare class AgentFactory {
    private agentConfigs;
    constructor();
    /**
     * Register all default specialized agents
     */
    private registerDefaultAgents;
    /**
     * Create a new agent instance with the specified role
     */
    createAgent(config: AppConfig, llm: LLMProvider, role: AgentRole, customId?: string): Agent;
    /**
     * Get configuration for an agent role
     */
    getAgentConfig(role: AgentRole): AgentConfig | undefined;
    /**
     * Get all registered agent configurations
     */
    getAllAgentConfigs(): AgentConfig[];
    /**
     * Get agent key for role lookup
     */
    private getAgentKey;
    private buildScratchpadPrompt;
    private buildCritiquePrompt;
    private buildRouterPrompt;
    private buildVisionPrompt;
    private buildAudioPrompt;
    private buildIotPrompt;
    private buildResearchPrompt;
    private buildCodeReviewPrompt;
    private buildAnalystPrompt;
    private buildDrafterPrompt;
    private buildCriticPrompt;
    private buildDebatePrompt;
    private buildDelegatePrompt;
    private buildObservabilityPrompt;
    private buildCostGovernorPrompt;
    private buildChaosTesterPrompt;
    private buildDigitalTwinPrompt;
    private buildForesightPrompt;
    private buildFederatedMemoryPrompt;
}
/**
 * Global agent factory instance
 */
export declare const agentFactory: AgentFactory;
//# sourceMappingURL=agent-factory.d.ts.map