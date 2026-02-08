import { LLMProvider, LLMConfig, LLMMessage, LLMResponse, StreamCallback } from './base.js';
export interface OpenAIConfig extends LLMConfig {
    apiKey: string;
    model: string;
    maxTokens?: number;
    temperature?: number;
    topP?: number;
    frequencyPenalty?: number;
    presencePenalty?: number;
    stop?: string[];
    stream?: boolean;
}
export declare class OpenAIProvider implements LLMProvider {
    private client;
    private config;
    private defaultModel;
    constructor(config: Partial<OpenAIConfig>);
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
//# sourceMappingURL=openai.d.ts.map