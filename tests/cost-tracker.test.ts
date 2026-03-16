import { describe, it, expect, beforeEach } from 'vitest';
import { CostTracker } from '../src/monitoring/cost-tracker.js';

describe('CostTracker', () => {
    let tracker: CostTracker;

    beforeEach(() => {
        tracker = new CostTracker();
    });

    describe('getPricing', () => {
        it('should return pricing for known OpenAI models', () => {
            const pricing = tracker.getPricing('openai', 'gpt-4o');
            expect(pricing).toBeDefined();
            expect(pricing?.provider).toBe('openai');
            expect(pricing?.inputCostPer1kTokens).toBeGreaterThan(0);
        });

        it('should return pricing for known Anthropic models', () => {
            const pricing = tracker.getPricing('anthropic', 'claude-3-5-sonnet-20241022');
            expect(pricing).toBeDefined();
            expect(pricing?.provider).toBe('anthropic');
        });

        it('should return undefined for unknown models', () => {
            const pricing = tracker.getPricing('unknown', 'unknown-model');
            expect(pricing).toBeUndefined();
        });

        it('should support custom pricing', () => {
            tracker.addCustomPricing({
                provider: 'custom',
                model: 'my-model',
                inputCostPer1kTokens: 0.001,
                outputCostPer1kTokens: 0.002,
            });

            const pricing = tracker.getPricing('custom', 'my-model');
            expect(pricing).toBeDefined();
            expect(pricing?.inputCostPer1kTokens).toBe(0.001);
        });
    });

    describe('calculateCost', () => {
        it('should calculate cost correctly for known model', () => {
            const cost = tracker.calculateCost('openai', 'gpt-4o', {
                promptTokens: 1000,
                completionTokens: 500,
                totalTokens: 1500,
            });
            // gpt-4o: $0.005 per 1k input, $0.015 per 1k output
            // 1000 * 0.005 / 1000 + 500 * 0.015 / 1000 = 0.005 + 0.0075 = 0.0125
            expect(cost).toBeCloseTo(0.0125, 4);
        });

        it('should return 0 for unknown models', () => {
            const cost = tracker.calculateCost('unknown', 'unknown-model', {
                promptTokens: 1000,
                completionTokens: 500,
                totalTokens: 1500,
            });
            expect(cost).toBe(0);
        });

        it('should calculate zero cost for zero tokens', () => {
            const cost = tracker.calculateCost('openai', 'gpt-4o', {
                promptTokens: 0,
                completionTokens: 0,
                totalTokens: 0,
            });
            expect(cost).toBe(0);
        });
    });

    describe('track', () => {
        it('should create a cost entry and return it', () => {
            const entry = tracker.track('session-1', 'user-1', 'openai', 'gpt-4o', {
                promptTokens: 500,
                completionTokens: 250,
                totalTokens: 750,
            });

            expect(entry.id).toBeDefined();
            expect(entry.sessionId).toBe('session-1');
            expect(entry.userId).toBe('user-1');
            expect(entry.provider).toBe('openai');
            expect(entry.model).toBe('gpt-4o');
            expect(entry.usage.totalTokens).toBe(750);
            expect(entry.costUsd).toBeGreaterThan(0);
            expect(entry.timestamp).toBeInstanceOf(Date);
        });

        it('should store operation name when provided', () => {
            const entry = tracker.track('session-1', 'user-1', 'openai', 'gpt-4o', {
                promptTokens: 100,
                completionTokens: 50,
                totalTokens: 150,
            }, 'chat_completion');

            expect(entry.operation).toBe('chat_completion');
        });
    });

    describe('getSessionCost', () => {
        it('should aggregate costs for a session', () => {
            tracker.track('session-1', 'user-1', 'openai', 'gpt-4o', {
                promptTokens: 500, completionTokens: 250, totalTokens: 750,
            });
            tracker.track('session-1', 'user-1', 'openai', 'gpt-4o', {
                promptTokens: 300, completionTokens: 150, totalTokens: 450,
            });

            const sessionCost = tracker.getSessionCost('session-1');
            expect(sessionCost).not.toBeNull();
            expect(sessionCost?.totalTokens).toBe(1200);
            expect(sessionCost?.entries).toHaveLength(2);
            expect(sessionCost?.totalCostUsd).toBeGreaterThan(0);
        });

        it('should return null for unknown session', () => {
            const sessionCost = tracker.getSessionCost('nonexistent');
            expect(sessionCost).toBeNull();
        });

        it('should include start and last activity timestamps', () => {
            tracker.track('session-1', 'user-1', 'openai', 'gpt-4o', {
                promptTokens: 100, completionTokens: 50, totalTokens: 150,
            });

            const sessionCost = tracker.getSessionCost('session-1');
            expect(sessionCost?.startedAt).toBeInstanceOf(Date);
            expect(sessionCost?.lastActivityAt).toBeInstanceOf(Date);
        });
    });

    describe('getUserCostSummary', () => {
        beforeEach(() => {
            tracker.track('session-1', 'user-1', 'openai', 'gpt-4o', {
                promptTokens: 1000, completionTokens: 500, totalTokens: 1500,
            });
            tracker.track('session-2', 'user-1', 'anthropic', 'claude-3-5-sonnet-20241022', {
                promptTokens: 800, completionTokens: 400, totalTokens: 1200,
            });
            tracker.track('session-3', 'user-2', 'openai', 'gpt-4o', {
                promptTokens: 500, completionTokens: 250, totalTokens: 750,
            });
        });

        it('should sum costs for a specific user', () => {
            const summary = tracker.getUserCostSummary('user-1');
            expect(summary.userId).toBe('user-1');
            expect(summary.totalTokens).toBe(2700);
            expect(summary.sessionCount).toBe(2);
            expect(summary.totalCostUsd).toBeGreaterThan(0);
        });

        it('should not include other users costs', () => {
            const user1Summary = tracker.getUserCostSummary('user-1');
            const user2Summary = tracker.getUserCostSummary('user-2');
            expect(user1Summary.totalTokens).not.toBe(user2Summary.totalTokens);
        });

        it('should provide model breakdown', () => {
            const summary = tracker.getUserCostSummary('user-1');
            expect(summary.modelBreakdown.length).toBeGreaterThan(0);
            const models = summary.modelBreakdown.map((m) => m.model);
            expect(models.some((m) => m.includes('gpt-4o'))).toBe(true);
        });

        it('should provide daily breakdown', () => {
            const summary = tracker.getUserCostSummary('user-1');
            expect(summary.dailyBreakdown.length).toBeGreaterThan(0);
            expect(summary.dailyBreakdown[0].date).toBeDefined();
        });

        it('should return zero costs for user with no entries', () => {
            const summary = tracker.getUserCostSummary('unknown-user');
            expect(summary.totalCostUsd).toBe(0);
            expect(summary.totalTokens).toBe(0);
            expect(summary.sessionCount).toBe(0);
        });
    });

    describe('getGlobalStats', () => {
        it('should aggregate across all users', () => {
            tracker.track('session-1', 'user-1', 'openai', 'gpt-4o', {
                promptTokens: 1000, completionTokens: 500, totalTokens: 1500,
            });
            tracker.track('session-2', 'user-2', 'anthropic', 'claude-3-5-sonnet-20241022', {
                promptTokens: 800, completionTokens: 400, totalTokens: 1200,
            });

            const stats = tracker.getGlobalStats();
            expect(stats.totalEntries).toBe(2);
            expect(stats.totalTokens).toBe(2700);
            expect(stats.byProvider.length).toBe(2);
        });
    });

    describe('clearEntries', () => {
        it('should clear all entries when no parameter', () => {
            tracker.track('session-1', 'user-1', 'openai', 'gpt-4o', {
                promptTokens: 100, completionTokens: 50, totalTokens: 150,
            });

            const cleared = tracker.clearEntries();
            expect(cleared).toBe(1);

            const stats = tracker.getGlobalStats();
            expect(stats.totalEntries).toBe(0);
        });
    });

    describe('getSupportedModels', () => {
        it('should return list of supported models', () => {
            const models = tracker.getSupportedModels();
            expect(models.length).toBeGreaterThan(0);
            expect(models[0].provider).toBeDefined();
            expect(models[0].model).toBeDefined();
        });
    });
});
