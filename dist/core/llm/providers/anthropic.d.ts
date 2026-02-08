import { LLMProvider, LLMConfig, LLMMessage, LLMResponse, StreamCallback } from './base.js';
export interface AnthropicConfig extends LLMConfig {
    apiKey: string;
    model: string;
    maxTokens?: number;
    temperature?: number;
    topK?: number;
    stopSequences?: string[];
}
export declare class AnthropicProvider implements LLMProvider {
    private client;
    private config;
    private defaultModel;
    constructor(config: Partial<AnthropicConfig>);
    complete(messages: LLMMessage[], options?: {
        temperature?: number;
        maxTokens?: number;
        stream?: boolean;
        onStream?: StreamCallback;
    }): Promise<LLMResponse>;
    private streamComplete;
    embed(text: string | string[]): Promise<number[][]>;
    countTokens(text: string): Promise<number>;
    getModelInfo(): Promise<{
        name: string;
        contextLength: number;
        capabilities: string[];
    }>;
    listModels(): Promise<string[]>;
    private handleError;
}
//# sourceMappingURL=anthropic.d.ts.map