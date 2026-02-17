import { LLMProvider, LLMMessage, LLMCompletionResult, LLMCompletionOptions } from '../base.js';
import { LLMConfig } from '../../../config/types.js';
export declare class GroqProvider extends LLMProvider {
    private client;
    constructor(config: LLMConfig);
    complete(messages: LLMMessage[], options?: LLMCompletionOptions): Promise<LLMCompletionResult>;
    stream(messages: LLMMessage[], options?: LLMCompletionOptions): AsyncIterable<string>;
    isAvailable(): boolean | Promise<boolean>;
    private formatMessages;
}
//# sourceMappingURL=groq.d.ts.map