import { LLMConfig } from '../../config/types.js';
export interface LLMMessage {
    role: 'user' | 'assistant' | 'system';
    content: string;
}
export interface LLMCompletionOptions {
    maxTokens?: number;
    temperature?: number;
    systemPrompt?: string;
    tools?: string[];
}
export interface LLMCompletionResult {
    content: string;
    tokensUsed: number;
    model: string;
    finished?: boolean;
    toolCalls?: any[];
}
export declare abstract class LLMProvider {
    protected config: LLMConfig;
    constructor(config: LLMConfig);
    abstract complete(messages: LLMMessage[], options?: LLMCompletionOptions): Promise<LLMCompletionResult>;
    abstract stream(messages: LLMMessage[], options?: LLMCompletionOptions): AsyncIterable<string>;
    abstract isAvailable(): boolean | Promise<boolean>;
}
//# sourceMappingURL=base.d.ts.map