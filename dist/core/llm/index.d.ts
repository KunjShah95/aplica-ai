import { LLMConfig } from '../../config/types';
export interface LLMMessage {
    role: 'user' | 'assistant' | 'system';
    content: string;
}
export interface LLMCompletionOptions {
    maxTokens?: number;
    temperature?: number;
    systemPrompt?: string;
}
export interface LLMCompletionResult {
    content: string;
    tokensUsed: number;
    model: string;
}
export declare abstract class LLMProvider {
    protected config: LLMConfig;
    constructor(config: LLMConfig);
    abstract complete(messages: LLMMessage[], options?: LLMCompletionOptions): Promise<LLMCompletionResult>;
    abstract stream(messages: LLMMessage[], options?: LLMCompletionOptions): AsyncIterable<string>;
    abstract isAvailable(): boolean;
}
export declare function createProvider(config: LLMConfig): LLMProvider;
//# sourceMappingURL=index.d.ts.map