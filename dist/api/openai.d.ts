import { Agent } from '../core/agent.js';
import { MessageRouter } from '../gateway/router.js';
export interface OpenAICompletionRequest {
    model: string;
    messages: Array<{
        role: 'system' | 'user' | 'assistant' | 'function';
        content: string;
        name?: string;
    }>;
    max_tokens?: number;
    temperature?: number;
    top_p?: number;
    stream?: boolean;
    stop?: string | string[];
    presence_penalty?: number;
    frequency_penalty?: number;
    logit_bias?: Record<string, number>;
    user?: string;
}
export interface OpenAICompletionResponse {
    id: string;
    object: 'chat.completion';
    created: number;
    model: string;
    choices: Array<{
        index: number;
        message: {
            role: 'assistant';
            content: string;
            tool_calls?: unknown[];
        };
        finish_reason: 'stop' | 'length' | 'tool_calls' | 'content_filter' | null;
    }>;
    usage: {
        prompt_tokens: number;
        completion_tokens: number;
        total_tokens: number;
    };
}
export interface OpenAIChatCompletionsOptions {
    port?: number;
    apiKey?: string;
    authToken?: string;
}
export declare class OpenAIEndpoint {
    private server;
    private port;
    private apiKey;
    private agent;
    private router;
    constructor(agent: Agent, router: MessageRouter, options?: OpenAIChatCompletionsOptions);
    start(): Promise<void>;
    private handleRequest;
    private handleChatCompletion;
    private handleStreamingCompletion;
    private processCompletion;
    private handleModelsList;
    private handleHealth;
    private validateApiKey;
    private generateId;
    private estimateTokens;
    private getCorsHeaders;
    stop(): Promise<void>;
}
//# sourceMappingURL=openai.d.ts.map