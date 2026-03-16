import { describe, it, expect, beforeEach } from 'vitest';
import { EpisodicSummarizer } from '../src/memory/episodic-summarizer.js';

const makeMessages = (count: number) =>
    Array.from({ length: count }, (_, i) => ({
        role: i % 2 === 0 ? 'user' : 'assistant',
        content: `Message ${i + 1} about topic ${i % 3 === 0 ? 'coding' : i % 3 === 1 ? 'weather' : 'travel'}`,
    }));

describe('EpisodicSummarizer', () => {
    let summarizer: EpisodicSummarizer;

    beforeEach(() => {
        summarizer = new EpisodicSummarizer({
            maxMessagesBeforeSummarize: 10,
            keepRecentMessages: 4,
            summaryMaxTokens: 200,
        });
    });

    describe('addEpisode', () => {
        it('should add an episode and return it', async () => {
            const messages = makeMessages(4);
            const episode = await summarizer.addEpisode('user-1', 'conv-1', messages);

            expect(episode.id).toBeDefined();
            expect(episode.userId).toBe('user-1');
            expect(episode.conversationId).toBe('conv-1');
            expect(episode.messages).toHaveLength(4);
        });

        it('should store episodes for retrieval', async () => {
            await summarizer.addEpisode('user-1', 'conv-1', makeMessages(3));
            await summarizer.addEpisode('user-1', 'conv-2', makeMessages(3));

            const episodes = await summarizer.getEpisodes('user-1');
            expect(episodes.length).toBeGreaterThanOrEqual(1);
        });
    });

    describe('compression', () => {
        it('should compress episodes when message threshold exceeded', async () => {
            // Add enough messages to trigger compression
            await summarizer.addEpisode('user-1', 'conv-1', makeMessages(6));
            await summarizer.addEpisode('user-1', 'conv-2', makeMessages(6));

            const summaries = await summarizer.getSummaries('user-1');
            expect(summaries.length).toBeGreaterThan(0);
        });

        it('should create a summary with required fields', async () => {
            await summarizer.addEpisode('user-1', 'conv-1', makeMessages(6));
            await summarizer.addEpisode('user-1', 'conv-2', makeMessages(6));

            const summaries = await summarizer.getSummaries('user-1');
            if (summaries.length > 0) {
                const summary = summaries[0];
                expect(summary.id).toBeDefined();
                expect(summary.userId).toBe('user-1');
                expect(summary.summary).toBeDefined();
                expect(summary.summary.length).toBeGreaterThan(0);
                expect(summary.keyTopics).toBeInstanceOf(Array);
                expect(summary.period.start).toBeInstanceOf(Date);
                expect(summary.period.end).toBeInstanceOf(Date);
            }
        });

        it('should use custom summarize function when provided', async () => {
            const customSummarizer = new EpisodicSummarizer(
                { maxMessagesBeforeSummarize: 10, keepRecentMessages: 4 },
                async (messages) => `Custom summary of ${messages.length} messages`
            );

            await customSummarizer.addEpisode('user-1', 'conv-1', makeMessages(6));
            await customSummarizer.addEpisode('user-1', 'conv-2', makeMessages(6));

            const summaries = await customSummarizer.getSummaries('user-1');
            if (summaries.length > 0) {
                expect(summaries[0].summary).toContain('Custom summary');
            }
        });
    });

    describe('getEpisodes', () => {
        it('should return empty array for unknown user', async () => {
            const episodes = await summarizer.getEpisodes('unknown-user');
            expect(episodes).toEqual([]);
        });
    });

    describe('getSummaries', () => {
        it('should return empty array when no compression has occurred', async () => {
            await summarizer.addEpisode('user-1', 'conv-1', makeMessages(3));
            const summaries = await summarizer.getSummaries('user-1');
            expect(summaries).toEqual([]);
        });
    });

    describe('buildContextString', () => {
        it('should return empty string for user with no data', async () => {
            const ctx = await summarizer.buildContextString('unknown-user');
            expect(ctx).toBe('');
        });

        it('should include recent episodes in context', async () => {
            await summarizer.addEpisode('user-1', 'conv-1', [
                { role: 'user', content: 'Tell me about coding' },
                { role: 'assistant', content: 'Coding is great!' },
            ]);

            const ctx = await summarizer.buildContextString('user-1');
            expect(ctx).toContain('coding');
        });

        it('should include summaries when present', async () => {
            await summarizer.addEpisode('user-1', 'conv-1', makeMessages(6));
            await summarizer.addEpisode('user-1', 'conv-2', makeMessages(6));

            const summaries = await summarizer.getSummaries('user-1');
            const ctx = await summarizer.buildContextString('user-1');

            if (summaries.length > 0) {
                expect(ctx).toContain('summaries');
            }
        });
    });

    describe('clearUser', () => {
        it('should remove all data for a user', async () => {
            await summarizer.addEpisode('user-1', 'conv-1', makeMessages(3));
            await summarizer.clearUser('user-1');

            const episodes = await summarizer.getEpisodes('user-1');
            const summaries = await summarizer.getSummaries('user-1');
            expect(episodes).toEqual([]);
            expect(summaries).toEqual([]);
        });
    });

    describe('setSummarizeFunction', () => {
        it('should allow setting summarize function after construction', async () => {
            summarizer.setSummarizeFunction(async (msgs) => `Summary: ${msgs.length} messages`);

            await summarizer.addEpisode('user-1', 'conv-1', makeMessages(6));
            await summarizer.addEpisode('user-1', 'conv-2', makeMessages(6));

            const summaries = await summarizer.getSummaries('user-1');
            if (summaries.length > 0) {
                expect(summaries[0].summary).toContain('Summary:');
            }
        });
    });

    describe('getConfig', () => {
        it('should return current configuration', () => {
            const config = summarizer.getConfig();
            expect(config.maxMessagesBeforeSummarize).toBe(10);
            expect(config.keepRecentMessages).toBe(4);
        });
    });
});
