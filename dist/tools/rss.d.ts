export interface RSSItem {
    title: string;
    link: string;
    description?: string;
    pubDate?: string;
    author?: string;
    guid?: string;
    categories?: string[];
    enclosure?: {
        url: string;
        type?: string;
        length?: number;
    };
    image?: string;
}
export interface RSSFeed {
    title: string;
    link: string;
    description?: string;
    language?: string;
    lastBuildDate?: string;
    items: RSSItem[];
}
export interface RSSResult {
    success: boolean;
    feed?: RSSFeed;
    error?: string;
}
export declare class RSSReader {
    readFeed(url: string): Promise<RSSResult>;
    private parseRSSFeed;
    private parseAtomFeed;
    discoverFeeds(url: string): Promise<{
        success: boolean;
        feeds?: string[];
        error?: string;
    }>;
}
export declare const rssReader: RSSReader;
export default rssReader;
//# sourceMappingURL=rss.d.ts.map