import { LLMMessage, LLMCompletionResult } from './llm/index.js';
export interface ModelConfig {
    provider: string;
    model: string;
    apiKey?: string;
    baseUrl?: string;
    maxTokens?: number;
    temperature?: number;
    priority?: number;
}
export interface ModelFailoverConfig {
    enabled: boolean;
    maxRetries: number;
    retryDelay: number;
    fallbackProviders: string[];
}
export interface ModelUsage {
    requests: number;
    tokens: number;
    errors: number;
    lastUsed: Date;
}
export declare class ModelManager {
    private models;
    private usage;
    private failoverConfig;
    private primaryModel;
    private currentModel;
    private errorCount;
    constructor(failoverConfig?: Partial<ModelFailoverConfig>);
    registerModel(id: string, config: ModelConfig): void;
    unregisterModel(id: string): boolean;
    complete(messages: LLMMessage[], options: {
        systemPrompt?: string;
        maxTokens?: number;
        temperature?: number;
    }): Promise<LLMCompletionResult>;
    private executeWithModel;
    private mockComplete;
    private findNextAvailableModel;
    private shouldFailover;
    private recordError;
    private updateUsage;
    private delay;
    getCurrentModel(): string;
    getModelInfo(modelId?: string): ModelConfig | null;
    getAllModels(): ModelConfig[];
    getUsageStats(): Record<string, ModelUsage>;
    switchModel(modelId: string): boolean;
    resetErrorCount(modelId?: string): void;
}
export declare const modelManager: ModelManager;
//# sourceMappingURL=model-manager.d.ts.map