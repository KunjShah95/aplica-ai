import { randomUUID } from 'crypto';

export interface EpisodicMemory {
  id: string;
  userId: string;
  conversationId: string;
  messages: { role: string; content: string }[];
  summary?: string;
  createdAt: Date;
  summarizedAt?: Date;
}

export interface SummarizationConfig {
  maxMessagesBeforeSummarize: number;
  summaryMaxTokens: number;
  keepRecentMessages: number;
}

export interface SummarizedEpisode {
  id: string;
  userId: string;
  originalConversationIds: string[];
  summary: string;
  keyTopics: string[];
  period: { start: Date; end: Date };
  createdAt: Date;
}

type SummarizeFunction = (messages: { role: string; content: string }[]) => Promise<string>;

const DEFAULT_CONFIG: SummarizationConfig = {
  maxMessagesBeforeSummarize: 20,
  summaryMaxTokens: 300,
  keepRecentMessages: 5,
};

export class EpisodicSummarizer {
  private episodes: Map<string, EpisodicMemory[]> = new Map();
  private summaries: Map<string, SummarizedEpisode[]> = new Map();
  private config: SummarizationConfig;
  private summarizeFn?: SummarizeFunction;

  constructor(config?: Partial<SummarizationConfig>, summarizeFn?: SummarizeFunction) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.summarizeFn = summarizeFn;
  }

  setSummarizeFunction(fn: SummarizeFunction): void {
    this.summarizeFn = fn;
  }

  async addEpisode(
    userId: string,
    conversationId: string,
    messages: { role: string; content: string }[]
  ): Promise<EpisodicMemory> {
    const episode: EpisodicMemory = {
      id: randomUUID(),
      userId,
      conversationId,
      messages,
      createdAt: new Date(),
    };

    const userEpisodes = this.episodes.get(userId) ?? [];
    userEpisodes.push(episode);
    this.episodes.set(userId, userEpisodes);

    await this.maybeCompress(userId);

    return episode;
  }

  private async maybeCompress(userId: string): Promise<void> {
    const userEpisodes = this.episodes.get(userId) ?? [];
    const totalMessages = userEpisodes.reduce((acc, e) => acc + e.messages.length, 0);

    if (totalMessages <= this.config.maxMessagesBeforeSummarize) {
      return;
    }

    const episodesToSummarize = userEpisodes.slice(
      0,
      userEpisodes.length - Math.ceil(this.config.keepRecentMessages / 5)
    );

    if (episodesToSummarize.length === 0) {
      return;
    }

    await this.summarizeEpisodes(userId, episodesToSummarize);

    const remaining = userEpisodes.slice(
      userEpisodes.length - Math.ceil(this.config.keepRecentMessages / 5)
    );
    this.episodes.set(userId, remaining);
  }

  private async summarizeEpisodes(
    userId: string,
    episodes: EpisodicMemory[]
  ): Promise<SummarizedEpisode> {
    const allMessages = episodes.flatMap((e) => e.messages);
    const conversationIds = episodes.map((e) => e.conversationId);

    const startDate = episodes[0]?.createdAt ?? new Date();
    const endDate = episodes[episodes.length - 1]?.createdAt ?? new Date();

    let summaryText: string;
    let keyTopics: string[];

    if (this.summarizeFn) {
      summaryText = await this.summarizeFn(allMessages);
      keyTopics = this.extractTopics(summaryText);
    } else {
      const result = this.heuristicSummarize(allMessages);
      summaryText = result.summary;
      keyTopics = result.topics;
    }

    const summarized: SummarizedEpisode = {
      id: randomUUID(),
      userId,
      originalConversationIds: conversationIds,
      summary: summaryText,
      keyTopics,
      period: { start: startDate, end: endDate },
      createdAt: new Date(),
    };

    const userSummaries = this.summaries.get(userId) ?? [];
    userSummaries.push(summarized);
    this.summaries.set(userId, userSummaries);

    for (const episode of episodes) {
      episode.summary = summaryText;
      episode.summarizedAt = new Date();
    }

    return summarized;
  }

  private heuristicSummarize(messages: { role: string; content: string }[]): {
    summary: string;
    topics: string[];
  } {
    const userMessages = messages.filter((m) => m.role === 'user').map((m) => m.content);
    const assistantMessages = messages.filter((m) => m.role === 'assistant').map((m) => m.content);

    const topics = this.extractTopicsFromMessages(userMessages);

    const snippets = userMessages.slice(0, 3).map((m) => m.slice(0, 100));
    const summary =
      `Conversation summary (${messages.length} messages): ` +
      `User asked about: ${topics.join(', ')}. ` +
      `Key queries: ${snippets.map((s) => `"${s}"`).join('; ')}.`;

    return { summary, topics };
  }

  private extractTopicsFromMessages(messages: string[]): string[] {
    const wordFreq: Map<string, number> = new Map();
    const stopWords = new Set([
      'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
      'of', 'with', 'by', 'from', 'is', 'are', 'was', 'were', 'be', 'been',
      'has', 'have', 'had', 'do', 'does', 'did', 'will', 'would', 'can', 'could',
      'should', 'may', 'might', 'i', 'you', 'he', 'she', 'it', 'we', 'they',
      'what', 'how', 'why', 'when', 'where', 'which', 'that', 'this', 'these',
      'please', 'help', 'me', 'my', 'your', 'their', 'our',
    ]);

    for (const message of messages) {
      const words = message.toLowerCase().match(/\b[a-z]{3,}\b/g) ?? [];
      for (const word of words) {
        if (!stopWords.has(word)) {
          wordFreq.set(word, (wordFreq.get(word) ?? 0) + 1);
        }
      }
    }

    return Array.from(wordFreq.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([word]) => word);
  }

  private extractTopics(text: string): string[] {
    return this.extractTopicsFromMessages([text]);
  }

  async getEpisodes(userId: string): Promise<EpisodicMemory[]> {
    return this.episodes.get(userId) ?? [];
  }

  async getSummaries(userId: string): Promise<SummarizedEpisode[]> {
    return this.summaries.get(userId) ?? [];
  }

  async buildContextString(userId: string): Promise<string> {
    const summaries = await this.getSummaries(userId);
    const recentEpisodes = await this.getEpisodes(userId);

    const parts: string[] = [];

    if (summaries.length > 0) {
      const recentSummaries = summaries.slice(-3);
      const summaryText = recentSummaries
        .map((s) => `[${s.period.start.toLocaleDateString()}] ${s.summary}`)
        .join('\n');
      parts.push(`Past conversation summaries:\n${summaryText}`);
    }

    if (recentEpisodes.length > 0) {
      const recent = recentEpisodes.slice(-2);
      const recentText = recent
        .flatMap((e) => e.messages.slice(-this.config.keepRecentMessages))
        .map((m) => `[${m.role}]: ${m.content.slice(0, 150)}`)
        .join('\n');
      parts.push(`Recent conversation:\n${recentText}`);
    }

    return parts.join('\n\n');
  }

  async clearUser(userId: string): Promise<void> {
    this.episodes.delete(userId);
    this.summaries.delete(userId);
  }

  getConfig(): SummarizationConfig {
    return { ...this.config };
  }
}

export const episodicSummarizer = new EpisodicSummarizer();
