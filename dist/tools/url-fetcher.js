import axios from 'axios';
import * as cheerio from 'cheerio';
export class URLFetcher {
    defaultHeaders;
    constructor() {
        this.defaultHeaders = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.5',
        };
    }
    async fetch(url, options) {
        try {
            const response = await axios.get(url, {
                headers: { ...this.defaultHeaders, ...options?.headers },
                timeout: options?.timeout || 30000,
                maxRedirects: 5,
                validateStatus: () => true,
            });
            const html = response.data;
            const $ = cheerio.load(html);
            const metadata = {
                title: $('title').text().trim() || $('meta[property="og:title"]').attr('content'),
                description: $('meta[name="description"]').attr('content') ||
                    $('meta[property="og:description"]').attr('content'),
                author: $('meta[name="author"]').attr('content'),
                keywords: $('meta[name="keywords"]')
                    .attr('content')
                    ?.split(',')
                    .map((k) => k.trim()),
                image: $('meta[property="og:image"]').attr('content') ||
                    $('meta[name="twitter:image"]').attr('content'),
                favicon: $('link[rel="icon"]').attr('href') || $('link[rel="shortcut icon"]').attr('href'),
                siteName: $('meta[property="og:site_name"]').attr('content'),
                twitterCard: $('meta[name="twitter:card"]').attr('content'),
                ogType: $('meta[property="og:type"]').attr('content'),
                canonicalUrl: $('link[rel="canonical"]').attr('href'),
                language: $('html').attr('lang'),
                publishedTime: $('meta[property="article:published_time"]').attr('content'),
            };
            if (metadata.favicon && !metadata.favicon.startsWith('http')) {
                const urlObj = new URL(url);
                metadata.favicon = `${urlObj.protocol}//${urlObj.host}${metadata.favicon}`;
            }
            const links = [];
            $('a[href]').each((_, el) => {
                const href = $(el).attr('href');
                if (href && !href.startsWith('#') && !href.startsWith('javascript:')) {
                    try {
                        links.push(new URL(href, url).href);
                    }
                    catch { }
                }
            });
            const images = [];
            $('img[src]').each((_, el) => {
                const src = $(el).attr('src');
                if (src) {
                    try {
                        images.push(new URL(src, url).href);
                    }
                    catch { }
                }
            });
            const text = this.stripHtml(html);
            return {
                success: true,
                url: response.request?.res?.responseUrl || url,
                statusCode: response.status,
                contentType: response.headers['content-type'],
                contentLength: parseInt(response.headers['content-length'] || '0'),
                html,
                text,
                metadata,
                links: [...new Set(links)].slice(0, 50),
                images: [...new Set(images)].slice(0, 20),
            };
        }
        catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : String(error),
            };
        }
    }
    async fetchJson(url) {
        try {
            const response = await axios.get(url, {
                headers: this.defaultHeaders,
            });
            return {
                success: true,
                data: response.data,
            };
        }
        catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : String(error),
            };
        }
    }
    async fetchXml(url) {
        try {
            const response = await axios.get(url, {
                headers: { ...this.defaultHeaders, Accept: 'application/xml, text/xml' },
            });
            return {
                success: true,
                data: response.data,
            };
        }
        catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : String(error),
            };
        }
    }
    stripHtml(html) {
        let text = html;
        text = text.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '');
        text = text.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '');
        text = text.replace(/<[^>]+>/g, ' ');
        text = text.replace(/&nbsp;/g, ' ');
        text = text.replace(/&amp;/g, '&');
        text = text.replace(/&lt;/g, '<');
        text = text.replace(/&gt;/g, '>');
        text = text.replace(/&quot;/g, '"');
        text = text.replace(/\s+/g, ' ').trim();
        return text;
    }
    async getHeaders(url) {
        try {
            const response = await axios.head(url, {
                headers: this.defaultHeaders,
                maxRedirects: 5,
            });
            return {
                success: true,
                headers: response.headers,
            };
        }
        catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : String(error),
            };
        }
    }
}
export const urlFetcher = new URLFetcher();
export default urlFetcher;
//# sourceMappingURL=url-fetcher.js.map