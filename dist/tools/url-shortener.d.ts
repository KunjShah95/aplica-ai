export interface ShortenResult {
    success: boolean;
    shortUrl?: string;
    originalUrl?: string;
    error?: string;
}
export interface ShortenerService {
    name: string;
    shorten(url: string): Promise<ShortenResult>;
}
export declare class URLShortener {
    private services;
    constructor(options?: {
        bitlyApiKey?: string;
        rebrandlyApiKey?: string;
    });
    shorten(url: string, preferredService?: string): Promise<ShortenResult>;
    getAvailableServices(): string[];
}
export declare const urlShortener: URLShortener;
export default urlShortener;
//# sourceMappingURL=url-shortener.d.ts.map