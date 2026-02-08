import { LLMProvider, LLMMessage, LLMCompletionOptions, LLMCompletionResult } from '../index.js';
import { LLMConfig } from '../../../config/types.js';
export declare class OllamaProvider extends LLMProvider {
    private baseUrl;
    private defaultModel;
    private availableModels;
    constructor(config: LLMConfig);
    complete(messages: LLMMessage[], options?: LLMCompletionOptions): Promise<LLMCompletionResult>;
    stream(messages: LLMMessage[], options?: LLMCompletionOptions): AsyncIterable<string>;
    private readStream;
    isAvailable(): Promise<boolean>;
    getAvailableModels(): Promise<string[]>;
    pullModel(modelName: string): Promise<{
        success: boolean;
        status: string;
    }>;
    deleteModel(modelName: string): Promise<{
        success: boolean;
        status: string;
    }>;
    private callOllama;
    private buildPrompt;
    private estimateTokens;
    getStats(): {
        baseUrl: string;
        defaultModel: string;
        availableModels: number;
    };
}
//# sourceMappingURL=ollama.d.ts.map