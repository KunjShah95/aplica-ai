const MODEL_PRICING = [
    { provider: 'openai', model: 'gpt-4o', inputCostPer1kTokens: 0.005, outputCostPer1kTokens: 0.015 },
    { provider: 'openai', model: 'gpt-4o-mini', inputCostPer1kTokens: 0.00015, outputCostPer1kTokens: 0.0006 },
    { provider: 'openai', model: 'gpt-4-turbo', inputCostPer1kTokens: 0.01, outputCostPer1kTokens: 0.03 },
    { provider: 'openai', model: 'gpt-4', inputCostPer1kTokens: 0.03, outputCostPer1kTokens: 0.06 },
    { provider: 'openai', model: 'gpt-3.5-turbo', inputCostPer1kTokens: 0.0005, outputCostPer1kTokens: 0.0015 },
    { provider: 'openai', model: 'whisper-1', inputCostPer1kTokens: 0.006, outputCostPer1kTokens: 0 },
    { provider: 'openai', model: 'tts-1', inputCostPer1kTokens: 0.015, outputCostPer1kTokens: 0 },
    { provider: 'anthropic', model: 'claude-3-5-sonnet-20241022', inputCostPer1kTokens: 0.003, outputCostPer1kTokens: 0.015 },
    { provider: 'anthropic', model: 'claude-3-5-haiku-20241022', inputCostPer1kTokens: 0.001, outputCostPer1kTokens: 0.005 },
    { provider: 'anthropic', model: 'claude-3-opus-20240229', inputCostPer1kTokens: 0.015, outputCostPer1kTokens: 0.075 },
    { provider: 'anthropic', model: 'claude-3-sonnet-20240229', inputCostPer1kTokens: 0.003, outputCostPer1kTokens: 0.015 },
    { provider: 'anthropic', model: 'claude-3-haiku-20240307', inputCostPer1kTokens: 0.00025, outputCostPer1kTokens: 0.00125 },
];
export class CostTracker {
    entries = [];
    customPricing = new Map();
    addCustomPricing(pricing) {
        const key = `${pricing.provider}:${pricing.model}`;
        this.customPricing.set(key, pricing);
    }
    getPricing(provider, model) {
        const key = `${provider}:${model}`;
        if (this.customPricing.has(key)) {
            return this.customPricing.get(key);
        }
        const normalized = model.toLowerCase();
        return MODEL_PRICING.find((p) => p.provider.toLowerCase() === provider.toLowerCase() &&
            (p.model.toLowerCase() === normalized ||
                normalized.startsWith(p.model.toLowerCase()) ||
                p.model.toLowerCase().startsWith(normalized)));
    }
    calculateCost(provider, model, usage) {
        const pricing = this.getPricing(provider, model);
        if (!pricing) {
            return 0;
        }
        const inputCost = (usage.promptTokens / 1000) * pricing.inputCostPer1kTokens;
        const outputCost = (usage.completionTokens / 1000) * pricing.outputCostPer1kTokens;
        return inputCost + outputCost;
    }
    track(sessionId, userId, provider, model, usage, operation) {
        const costUsd = this.calculateCost(provider, model, usage);
        const entry = {
            id: crypto.randomUUID(),
            sessionId,
            userId,
            provider,
            model,
            usage,
            costUsd,
            timestamp: new Date(),
            operation,
        };
        this.entries.push(entry);
        return entry;
    }
    getSessionCost(sessionId) {
        const sessionEntries = this.entries.filter((e) => e.sessionId === sessionId);
        if (sessionEntries.length === 0)
            return null;
        const first = sessionEntries[0];
        const last = sessionEntries[sessionEntries.length - 1];
        return {
            sessionId,
            userId: first.userId,
            totalTokens: sessionEntries.reduce((acc, e) => acc + e.usage.totalTokens, 0),
            totalCostUsd: sessionEntries.reduce((acc, e) => acc + e.costUsd, 0),
            entries: sessionEntries,
            startedAt: first.timestamp,
            lastActivityAt: last.timestamp,
        };
    }
    getUserCostSummary(userId, sinceDays = 30) {
        const since = new Date();
        since.setDate(since.getDate() - sinceDays);
        const userEntries = this.entries.filter((e) => e.userId === userId && e.timestamp >= since);
        const dailyMap = new Map();
        const modelMap = new Map();
        const sessionSet = new Set();
        for (const entry of userEntries) {
            const date = entry.timestamp.toISOString().split('T')[0];
            const daily = dailyMap.get(date) ?? { costUsd: 0, tokens: 0 };
            daily.costUsd += entry.costUsd;
            daily.tokens += entry.usage.totalTokens;
            dailyMap.set(date, daily);
            const modelKey = `${entry.provider}/${entry.model}`;
            const model = modelMap.get(modelKey) ?? { costUsd: 0, tokens: 0 };
            model.costUsd += entry.costUsd;
            model.tokens += entry.usage.totalTokens;
            modelMap.set(modelKey, model);
            sessionSet.add(entry.sessionId);
        }
        return {
            userId,
            totalCostUsd: userEntries.reduce((acc, e) => acc + e.costUsd, 0),
            totalTokens: userEntries.reduce((acc, e) => acc + e.usage.totalTokens, 0),
            sessionCount: sessionSet.size,
            dailyBreakdown: Array.from(dailyMap.entries())
                .sort((a, b) => a[0].localeCompare(b[0]))
                .map(([date, data]) => ({ date, ...data })),
            modelBreakdown: Array.from(modelMap.entries())
                .sort((a, b) => b[1].costUsd - a[1].costUsd)
                .map(([model, data]) => ({ model, ...data })),
        };
    }
    getGlobalStats() {
        const providerMap = new Map();
        for (const entry of this.entries) {
            const data = providerMap.get(entry.provider) ?? { costUsd: 0, tokens: 0 };
            data.costUsd += entry.costUsd;
            data.tokens += entry.usage.totalTokens;
            providerMap.set(entry.provider, data);
        }
        return {
            totalEntries: this.entries.length,
            totalCostUsd: this.entries.reduce((acc, e) => acc + e.costUsd, 0),
            totalTokens: this.entries.reduce((acc, e) => acc + e.usage.totalTokens, 0),
            byProvider: Array.from(providerMap.entries())
                .sort((a, b) => b[1].costUsd - a[1].costUsd)
                .map(([provider, data]) => ({ provider, ...data })),
        };
    }
    clearEntries(olderThanDays) {
        if (!olderThanDays) {
            const count = this.entries.length;
            this.entries = [];
            return count;
        }
        const cutoff = new Date();
        cutoff.setDate(cutoff.getDate() - olderThanDays);
        const before = this.entries.length;
        this.entries = this.entries.filter((e) => e.timestamp >= cutoff);
        return before - this.entries.length;
    }
    getSupportedModels() {
        return MODEL_PRICING.map(({ provider, model }) => ({ provider, model }));
    }
}
export const costTracker = new CostTracker();
//# sourceMappingURL=cost-tracker.js.map