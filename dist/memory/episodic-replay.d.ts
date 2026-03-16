export interface EpisodeInsight {
    id: string;
    userId: string;
    type: 'pattern' | 'preference' | 'behavior' | 'relationship' | 'emotional';
    description: string;
    confidence: number;
    evidence: string[];
    firstObserved: Date;
    lastObserved: Date;
    occurrenceCount: number;
}
export interface DailyEpisode {
    date: string;
    messages: Array<{
        role: string;
        content: string;
        timestamp: Date;
        sentiment?: number;
    }>;
    extractedInsights: string[];
    topics: string[];
    participants: string[];
}
export declare class EpisodicReplay {
    private patternExtractors;
    constructor();
    private registerDefaultExtractors;
    runDailyReplay(userId: string, date: Date): Promise<EpisodeInsight[]>;
    private findSimilarInsight;
    private updateInsight;
    private storeInsight;
    private extractTopics;
    private extractTimePatterns;
    private extractTonePatterns;
    private extractTopicPatterns;
    private extractInteractionPatterns;
    private extractStressPatterns;
    private mapExtractorToType;
    private calculateSimilarity;
    getInsights(userId: string, _types?: EpisodeInsight['type'][]): Promise<EpisodeInsight[]>;
}
export declare const episodicReplay: EpisodicReplay;
//# sourceMappingURL=episodic-replay.d.ts.map