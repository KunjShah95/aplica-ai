export class ModelManager {
    models = new Map();
    usage = new Map();
    failoverConfig;
    primaryModel = '';
    currentModel = '';
    errorCount = new Map();
    constructor(failoverConfig) {
        this.failoverConfig = {
            enabled: failoverConfig?.enabled ?? true,
            maxRetries: failoverConfig?.maxRetries ?? 3,
            retryDelay: failoverConfig?.retryDelay ?? 1000,
            fallbackProviders: failoverConfig?.fallbackProviders ?? ['anthropic', 'openai', 'ollama'],
        };
    }
    registerModel(id, config) {
        this.models.set(id, { ...config, priority: config.priority ?? 0 });
        this.usage.set(id, { requests: 0, tokens: 0, errors: 0, lastUsed: new Date() });
        if (!this.primaryModel ||
            (config.priority ?? 0) > (this.models.get(this.primaryModel)?.priority ?? 0)) {
            this.primaryModel = id;
            this.currentModel = id;
        }
        console.log(`Registered model: ${id} (${config.provider}/${config.model})`);
    }
    unregisterModel(id) {
        this.models.delete(id);
        this.usage.delete(id);
        this.errorCount.delete(id);
        if (this.currentModel === id) {
            this.currentModel = this.findNextAvailableModel();
        }
        return this.models.has(this.currentModel);
    }
    async complete(messages, options) {
        let lastError = null;
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
            }
            catch (error) {
                lastError = error;
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
    async executeWithModel(modelId, messages, options) {
        const modelConfig = this.models.get(modelId);
        if (!modelConfig) {
            throw new Error(`Model ${modelId} not found`);
        }
        const response = await this.mockComplete(messages, options, modelConfig);
        return response;
    }
    async mockComplete(messages, options, config) {
        return {
            content: `Response from ${config.provider}/${config.model}`,
            tokensUsed: 100,
            model: config.model,
        };
    }
    findNextAvailableModel(excludeId) {
        const available = Array.from(this.models.entries())
            .filter(([id]) => id !== excludeId)
            .sort((a, b) => (b[1].priority ?? 0) - (a[1].priority ?? 0));
        return available[0]?.[0] || '';
    }
    shouldFailover(modelId) {
        if (!this.failoverConfig.enabled)
            return false;
        const errors = this.errorCount.get(modelId) ?? 0;
        return errors >= 2;
    }
    recordError(modelId) {
        this.errorCount.set(modelId, (this.errorCount.get(modelId) ?? 0) + 1);
        const usage = this.usage.get(modelId);
        if (usage) {
            usage.errors++;
        }
    }
    updateUsage(modelId, tokens) {
        const usage = this.usage.get(modelId);
        if (usage) {
            usage.requests++;
            usage.tokens += tokens;
            usage.lastUsed = new Date();
        }
    }
    delay(ms) {
        return new Promise((resolve) => setTimeout(resolve, ms));
    }
    getCurrentModel() {
        return this.currentModel;
    }
    getModelInfo(modelId) {
        return this.models.get(modelId ?? this.currentModel) || null;
    }
    getAllModels() {
        return Array.from(this.models.values());
    }
    getUsageStats() {
        return Object.fromEntries(this.usage);
    }
    switchModel(modelId) {
        if (this.models.has(modelId)) {
            this.currentModel = modelId;
            this.errorCount.set(modelId, 0);
            return true;
        }
        return false;
    }
    resetErrorCount(modelId) {
        if (modelId) {
            this.errorCount.delete(modelId);
        }
        else {
            this.errorCount.clear();
        }
    }
}
export const modelManager = new ModelManager();
//# sourceMappingURL=model-manager.js.map