import { LLMProvider, LLMMessage, LLMCompletionResult, LLMCompletionOptions } from '../index';
import { LLMConfig } from '../../../config/types';
export declare class ClaudeProvider extends LLMProvider {
    private client;
    constructor(config: LLMConfig);
    complete(messages: LLMMessage[], options?: LLMCompletionOptions): Promise<LLMCompletionResult>;
    stream(messages: LLMMessage[], options?: LLMCompletionOptions): AsyncIterable<string>;
    isAvailable(): boolean;
}
//# sourceMappingURL=claude.d.ts.map