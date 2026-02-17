import { LLMProvider, LLMMessage, LLMCompletionResult, LLMCompletionOptions } from '../base.js';
import { LLMConfig } from '../../../config/types.js';
export declare class CustomProvider extends LLMProvider {
    private client;
    constructor(config: LLMConfig);
    complete(messages: LLMMessage[], options?: LLMCompletionOptions): Promise<LLMCompletionResult>;
    stream(messages: LLMMessage[], options?: LLMCompletionOptions): AsyncIterable<string>;
    isAvailable(): boolean | Promise<boolean>;
    private formatMessages;
}
//# sourceMappingURL=custom.d.ts.map