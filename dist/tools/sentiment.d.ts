export interface SentimentResult {
    success: boolean;
    sentiment?: 'positive' | 'neutral' | 'negative';
    score?: number;
    magnitude?: number;
    emotions?: {
        joy?: number;
        sadness?: number;
        anger?: number;
        fear?: number;
        surprise?: number;
    };
    sentences?: Array<{
        text: string;
        sentiment: 'positive' | 'neutral' | 'negative';
        score: number;
    }>;
    error?: string;
}
export declare class SentimentTool {
    private openaiApiKey?;
    private googleNLPApiKey?;
    constructor(options?: {
        openaiApiKey?: string;
        googleNLPApiKey?: string;
    });
    analyzeWithOpenAI(text: string): Promise<SentimentResult>;
    analyzeWithGoogle(text: string): Promise<SentimentResult>;
    analyzeEntities(text: string): Promise<{
        success: boolean;
        entities?: Array<{
            name: string;
            type: string;
            salience: number;
            metadata: any;
        }>;
        error?: string;
    }>;
    classifyContent(text: string): Promise<{
        success: boolean;
        categories?: Array<{
            name: string;
            confidence: number;
        }>;
        error?: string;
    }>;
    analyze(text: string): Promise<SentimentResult>;
}
export declare const sentimentTool: SentimentTool;
export default sentimentTool;
//# sourceMappingURL=sentiment.d.ts.map