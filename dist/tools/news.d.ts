export interface NewsOptions {
    query?: string;
    category?: 'general' | 'business' | 'entertainment' | 'health' | 'science' | 'sports' | 'technology';
    country?: string;
    language?: string;
    pageSize?: number;
    page?: number;
}
export interface NewsArticle {
    source: {
        id: string | null;
        name: string;
    };
    author: string | null;
    title: string;
    description: string | null;
    url: string;
    urlToImage: string | null;
    publishedAt: string;
    content: string | null;
}
export interface NewsResult {
    success: boolean;
    status?: string;
    totalResults?: number;
    articles?: NewsArticle[];
    error?: string;
}
export declare class NewsTool {
    private newsApiKey?;
    constructor(options?: {
        newsApiKey?: string;
    });
    getTopHeadlines(options?: NewsOptions): Promise<NewsResult>;
    searchNews(options: NewsOptions): Promise<NewsResult>;
    getSources(category?: string, language?: string, country?: string): Promise<{
        success: boolean;
        sources?: Array<{
            id: string;
            name: string;
            description: string;
            url: string;
            category: string;
            language: string;
            country: string;
        }>;
        error?: string;
    }>;
}
export declare const newsTool: NewsTool;
export default newsTool;
//# sourceMappingURL=news.d.ts.map