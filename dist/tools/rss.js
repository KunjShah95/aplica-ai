import axios from 'axios';
import * as cheerio from 'cheerio';
export class RSSReader {
    async readFeed(url) {
        try {
            const response = await axios.get(url, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                    'Accept': 'application/rss+xml, application/xml, text/xml',
                },
            });
            const $ = cheerio.load(response.data, { xmlMode: true });
            const isAtom = $('feed').length > 0;
            let feed;
            if (isAtom) {
                feed = this.parseAtomFeed($);
            }
            else {
                feed = this.parseRSSFeed($);
            }
            return { success: true, feed };
        }
        catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : String(error),
            };
        }
    }
    parseRSSFeed($) {
        const channel = $('channel');
        const items = [];
        $('item').each((_, el) => {
            const $el = $(el);
            items.push({
                title: $el.find('title').text().trim(),
                link: $el.find('link').text().trim(),
                description: $el.find('description').text().trim() || undefined,
                pubDate: $el.find('pubDate').text().trim() || $el.find('dc\\:date').text().trim() || undefined,
                author: $el.find('author').text().trim() || $el.find('dc\\:creator').text().trim() || undefined,
                guid: $el.find('guid').text().trim() || undefined,
                categories: $el
                    .find('category')
                    .map((_, c) => $(c).text().trim())
                    .get(),
                enclosure: $el.find('enclosure').attr('url')
                    ? {
                        url: $el.find('enclosure').attr('url'),
                        type: $el.find('enclosure').attr('type') || undefined,
                        length: parseInt($el.find('enclosure').attr('length') || '0') || undefined,
                    }
                    : undefined,
                image: $el.find('media\\:content, content').attr('url') ||
                    $el.find('media\\:thumbnail, thumbnail').attr('url') ||
                    undefined,
            });
        });
        return {
            title: channel.find('title').text().trim(),
            link: channel.find('link').text().trim(),
            description: channel.find('description').text().trim() || undefined,
            language: channel.find('language').text().trim() || undefined,
            lastBuildDate: channel.find('lastBuildDate').text().trim() || undefined,
            items,
        };
    }
    parseAtomFeed($) {
        const feed = $('feed');
        const items = [];
        $('entry').each((_, el) => {
            const $el = $(el);
            items.push({
                title: $el.find('title').text().trim(),
                link: $el.find('link').attr('href') || '',
                description: $el.find('summary').text().trim() || $el.find('content').text().trim() || undefined,
                pubDate: $el.find('updated').text().trim() || $el.find('published').text().trim() || undefined,
                author: $el.find('author name').text().trim() || undefined,
                guid: $el.find('id').text().trim() || undefined,
                categories: $el
                    .find('category')
                    .map((_, c) => $(c).attr('term'))
                    .get()
                    .filter(Boolean),
            });
        });
        return {
            title: feed.find('title').text().trim(),
            link: feed.find('link').attr('href') || '',
            description: feed.find('subtitle').text().trim() || undefined,
            language: feed.find('language').text().trim() || undefined,
            lastBuildDate: feed.find('updated').text().trim() || undefined,
            items,
        };
    }
    async discoverFeeds(url) {
        try {
            const response = await axios.get(url, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                },
            });
            const $ = cheerio.load(response.data);
            const feeds = [];
            $('link[type="application/rss+xml"]').each((_, el) => {
                const href = $(el).attr('href');
                if (href) {
                    try {
                        feeds.push(new URL(href, url).href);
                    }
                    catch {
                        feeds.push(href);
                    }
                }
            });
            $('link[type="application/atom+xml"]').each((_, el) => {
                const href = $(el).attr('href');
                if (href) {
                    try {
                        feeds.push(new URL(href, url).href);
                    }
                    catch {
                        feeds.push(href);
                    }
                }
            });
            return { success: true, feeds };
        }
        catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : String(error),
            };
        }
    }
}
export const rssReader = new RSSReader();
export default rssReader;
//# sourceMappingURL=rss.js.map