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

export class ModelManager {
  private models: Map<string, ModelConfig> = new Map();
  private usage: Map<string, ModelUsage> = new Map();
  private failoverConfig: ModelFailoverConfig;
  private primaryModel: string = '';
  private currentModel: string = '';
  private errorCount: Map<string, number> = new Map();

  constructor(failoverConfig?: Partial<ModelFailoverConfig>) {
    this.failoverConfig = {
      enabled: failoverConfig?.enabled ?? true,
      maxRetries: failoverConfig?.maxRetries ?? 3,
      retryDelay: failoverConfig?.retryDelay ?? 1000,
      fallbackProviders: failoverConfig?.fallbackProviders ?? ['anthropic', 'openai', 'ollama'],
    };
  }

  registerModel(id: string, config: ModelConfig): void {
    this.models.set(id, { ...config, priority: config.priority ?? 0 });
    this.usage.set(id, { requests: 0, tokens: 0, errors: 0, lastUsed: new Date() });

    if (
      !this.primaryModel ||
      (config.priority ?? 0) > (this.models.get(this.primaryModel)?.priority ?? 0)
    ) {
      this.primaryModel = id;
      this.currentModel = id;
    }

    console.log(`Registered model: ${id} (${config.provider}/${config.model})`);
  }

  unregisterModel(id: string): boolean {
    this.models.delete(id);
    this.usage.delete(id);
    this.errorCount.delete(id);

    if (this.currentModel === id) {
      this.currentModel = this.findNextAvailableModel();
    }

    return this.models.has(this.currentModel);
  }

  async complete(
    messages: LLMMessage[],
    options: { systemPrompt?: string; maxTokens?: number; temperature?: number }
  ): Promise<LLMCompletionResult> {
    let lastError: Error | null = null;
    let usedModel = this.currentModel;

    for (let attempt = 0; attempt <= this.failoverConfig.maxRetries; attempt++) {
      const modelConfig = this.models.get(usedModel);
      if (!modelConfig) {
        usedModel = this.findNextAvailableModel();
        if (!usedModel) {
          throw new Error('No available models');
        }
        continue;
      }

      try {
        const response = await this.executeWithModel(usedModel, messages, options);

        this.updateUsage(usedModel, response.tokensUsed);

        return response;
      } catch (error) {
        lastError = error as Error;
        this.recordError(usedModel);

        if (this.shouldFailover(usedModel)) {
          usedModel = this.findNextAvailableModel(usedModel);
          console.log(`Failover from ${usedModel} to ${usedModel}`);
        }
      }

      if (attempt < this.failoverConfig.maxRetries) {
        await this.delay(this.failoverConfig.retryDelay * (attempt + 1));
      }
    }

    throw lastError || new Error('All model attempts failed');
  }

  private async executeWithModel(
    modelId: string,
    messages: LLMMessage[],
    options: { systemPrompt?: string; maxTokens?: number; temperature?: number }
  ): Promise<LLMCompletionResult> {
    const modelConfig = this.models.get(modelId);
    if (!modelConfig) {
      throw new Error(`Model ${modelId} not found`);
    }

    const response = await this.mockComplete(messages, options, modelConfig);
    return response;
  }

  private async mockComplete(
    messages: LLMMessage[],
    options: { systemPrompt?: string; maxTokens?: number; temperature?: number },
    config: ModelConfig
  ): Promise<LLMCompletionResult> {
    return {
      content: `Response from ${config.provider}/${config.model}`,
      tokensUsed: 100,
      model: config.model,
    };
  }

  private findNextAvailableModel(excludeId?: string): string {
    const available = Array.from(this.models.entries())
      .filter(([id]) => id !== excludeId)
      .sort((a, b) => (b[1].priority ?? 0) - (a[1].priority ?? 0));

    return available[0]?.[0] || '';
  }

  private shouldFailover(modelId: string): boolean {
    if (!this.failoverConfig.enabled) return false;

    const errors = this.errorCount.get(modelId) ?? 0;
    return errors >= 2;
  }

  private recordError(modelId: string): void {
    this.errorCount.set(modelId, (this.errorCount.get(modelId) ?? 0) + 1);
    const usage = this.usage.get(modelId);
    if (usage) {
      usage.errors++;
    }
  }

  private updateUsage(modelId: string, tokens: number): void {
    const usage = this.usage.get(modelId);
    if (usage) {
      usage.requests++;
      usage.tokens += tokens;
      usage.lastUsed = new Date();
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  getCurrentModel(): string {
    return this.currentModel;
  }

  getModelInfo(modelId?: string): ModelConfig | null {
    return this.models.get(modelId ?? this.currentModel) || null;
  }

  getAllModels(): ModelConfig[] {
    return Array.from(this.models.values());
  }

  getUsageStats(): Record<string, ModelUsage> {
    return Object.fromEntries(this.usage);
  }

  switchModel(modelId: string): boolean {
    if (this.models.has(modelId)) {
      this.currentModel = modelId;
      this.errorCount.set(modelId, 0);
      return true;
    }
    return false;
  }

  resetErrorCount(modelId?: string): void {
    if (modelId) {
      this.errorCount.delete(modelId);
    } else {
      this.errorCount.clear();
    }
  }
}

export const modelManager = new ModelManager();
