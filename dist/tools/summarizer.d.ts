export interface SummarizeOptions {
    text: string;
    maxLength?: number;
    style?: 'brief' | 'detailed' | 'bullets';
}
export interface SummarizeResult {
    success: boolean;
    summary?: string;
    keyPoints?: string[];
    error?: string;
}
export declare class SummarizerTool {
    private openaiApiKey?;
    constructor(options?: {
        openaiApiKey?: string;
    });
    summarize(options: SummarizeOptions): Promise<SummarizeResult>;
    summarizeUrl(url: string, options?: {
        maxLength?: number;
    }): Promise<SummarizeResult>;
    extractiveSummary(text: string, maxSentences?: number): Promise<{
        success: boolean;
        summary?: string;
        error?: string;
    }>;
    private extractTextFromHtml;
}
export declare const summarizerTool: SummarizerTool;
export default summarizerTool;
//# sourceMappingURL=summarizer.d.ts.map