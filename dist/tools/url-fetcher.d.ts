export interface URLMetadata {
    title?: string;
    description?: string;
    author?: string;
    keywords?: string[];
    image?: string;
    favicon?: string;
    siteName?: string;
    twitterCard?: string;
    ogType?: string;
    canonicalUrl?: string;
    language?: string;
    publishedTime?: string;
}
export interface URLFetchResult {
    success: boolean;
    url?: string;
    statusCode?: number;
    contentType?: string;
    contentLength?: number;
    html?: string;
    text?: string;
    metadata?: URLMetadata;
    links?: string[];
    images?: string[];
    error?: string;
}
export declare class URLFetcher {
    private defaultHeaders;
    constructor();
    fetch(url: string, options?: {
        headers?: Record<string, string>;
        timeout?: number;
    }): Promise<URLFetchResult>;
    fetchJson(url: string): Promise<{
        success: boolean;
        data?: any;
        error?: string;
    }>;
    fetchXml(url: string): Promise<{
        success: boolean;
        data?: any;
        error?: string;
    }>;
    private stripHtml;
    getHeaders(url: string): Promise<{
        success: boolean;
        headers?: Record<string, string>;
        error?: string;
    }>;
}
export declare const urlFetcher: URLFetcher;
export default urlFetcher;
//# sourceMappingURL=url-fetcher.d.ts.map