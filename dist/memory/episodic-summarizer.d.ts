export interface EpisodicMemory {
    id: string;
    userId: string;
    conversationId: string;
    messages: {
        role: string;
        content: string;
    }[];
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
    period: {
        start: Date;
        end: Date;
    };
    createdAt: Date;
}
type SummarizeFunction = (messages: {
    role: string;
    content: string;
}[]) => Promise<string>;
export declare class EpisodicSummarizer {
    private episodes;
    private summaries;
    private config;
    private summarizeFn?;
    constructor(config?: Partial<SummarizationConfig>, summarizeFn?: SummarizeFunction);
    setSummarizeFunction(fn: SummarizeFunction): void;
    addEpisode(userId: string, conversationId: string, messages: {
        role: string;
        content: string;
    }[]): Promise<EpisodicMemory>;
    private maybeCompress;
    private summarizeEpisodes;
    private heuristicSummarize;
    private extractTopicsFromMessages;
    private extractTopics;
    getEpisodes(userId: string): Promise<EpisodicMemory[]>;
    getSummaries(userId: string): Promise<SummarizedEpisode[]>;
    buildContextString(userId: string): Promise<string>;
    clearUser(userId: string): Promise<void>;
    getConfig(): SummarizationConfig;
}
export declare const episodicSummarizer: EpisodicSummarizer;
export {};
//# sourceMappingURL=episodic-summarizer.d.ts.map