export interface AgentMessage {
    role: 'system' | 'user' | 'assistant' | 'tool';
    content: string;
    name?: string;
    toolCallId?: string;
}
export interface ToolCall {
    id: string;
    name: string;
    arguments: Record<string, unknown>;
}
export interface AgentConfig {
    userId: string;
    conversationId?: string;
    personaId?: string;
    knowledgeBaseIds?: string[];
    maxIterations?: number;
    temperature?: number;
    maxTokens?: number;
    tools?: string[];
}
export interface AgentResponse {
    content: string;
    toolCalls?: ToolCall[];
    usage?: {
        promptTokens: number;
        completionTokens: number;
        totalTokens: number;
    };
    finished: boolean;
}
type LLMProvider = (messages: AgentMessage[], config: any) => Promise<AgentResponse>;
export declare class AgentOrchestrator {
    private llmProvider;
    private maxIterations;
    constructor(llmProvider: LLMProvider, maxIterations?: number);
    run(userMessage: string, config: AgentConfig): Promise<{
        response: string;
        iterations: number;
        toolsUsed: string[];
    }>;
    runStream(userMessage: string, config: AgentConfig): AsyncGenerator<{
        type: 'text' | 'tool' | 'done';
        content: string;
        toolName?: string;
    }>;
    private buildSystemPrompt;
    private gatherContext;
    private storeMemoryIfNeeded;
    private findTool;
}
export declare function createAgentOrchestrator(llmProvider: LLMProvider, maxIterations?: number): AgentOrchestrator;
export {};
//# sourceMappingURL=orchestrator.d.ts.map