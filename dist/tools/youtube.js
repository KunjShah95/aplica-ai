import axios from 'axios';
import * as cheerio from 'cheerio';
export class YouTubeTool {
    async getTranscript(videoUrl, language) {
        try {
            const videoId = this.extractVideoId(videoUrl);
            if (!videoId) {
                return { success: false, error: 'Invalid YouTube URL' };
            }
            const response = await axios.get(`https://www.youtube.com/watch?v=${videoId}`, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                },
            });
            const $ = cheerio.load(response.data);
            const title = $('meta[name="title"]').attr('content') || $('title').text();
            const ytInitialData = response.data.match(/ytInitialData\s*=\s*({[^;]+})/);
            if (!ytInitialData) {
                return { success: false, error: 'Could not extract video data' };
            }
            const data = JSON.parse(ytInitialData[1]);
            const captionTracks = this.findCaptionTracks(data);
            if (!captionTracks || captionTracks.length === 0) {
                return { success: false, error: 'No captions available for this video' };
            }
            const selectedTrack = captionTracks.find((t) => t.languageCode === (language || 'en')) || captionTracks[0];
            const transcriptResponse = await axios.get(selectedTrack.url, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                },
            });
            const transcripts = this.parseCaptions(transcriptResponse.data);
            return {
                success: true,
                videoId,
                title,
                author: this.findAuthor(data),
                language: selectedTrack.languageCode,
                transcripts,
            };
        }
        catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : String(error),
            };
        }
    }
    async getVideoInfo(videoUrl) {
        try {
            const videoId = this.extractVideoId(videoUrl);
            if (!videoId) {
                return { success: false, error: 'Invalid YouTube URL' };
            }
            const response = await axios.get(`https://www.youtube.com/watch?v=${videoId}`, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                },
            });
            const $ = cheerio.load(response.data);
            const title = $('meta[name="title"]').attr('content');
            const description = $('meta[name="description"]').attr('content');
            const author = $('meta[name="author"]').attr('content');
            const views = parseInt($('meta[itemprop="viewCount"]').attr('content') || '0');
            const likes = parseInt($('meta[itemprop="ratingCount"]').attr('content') || '0');
            const duration = $('meta[itemprop="duration"]').attr('content');
            const uploadDate = $('meta[itemprop="uploadDate"]').attr('content');
            const thumbnails = [];
            $('meta[itemprop="image"]').each((_, el) => {
                const content = $(el).attr('content');
                if (content)
                    thumbnails.push(content);
            });
            return {
                success: true,
                videoId,
                title,
                description,
                author,
                views: isNaN(views) ? undefined : views,
                likes: isNaN(likes) ? undefined : likes,
                duration,
                uploadDate,
                thumbnails,
            };
        }
        catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : String(error),
            };
        }
    }
    async searchVideos(query, maxResults = 10) {
        try {
            const response = await axios.get('https://www.youtube.com/results', {
                params: { search_query: query },
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                },
            });
            const videos = [];
            const ytInitialData = response.data.match(/ytInitialData\s*=\s*({[^;]+})/);
            if (!ytInitialData) {
                return { success: false, error: 'Could not parse search results' };
            }
            const data = JSON.parse(ytInitialData[1]);
            const contents = data.contents?.twoColumnSearchResultsRenderer?.primaryContents?.sectionListRenderer
                ?.contents;
            if (contents) {
                for (const section of contents) {
                    const items = section?.itemSectionRenderer?.contents;
                    if (items) {
                        for (const item of items.slice(0, maxResults)) {
                            const videoRenderer = item?.videoRenderer;
                            if (videoRenderer) {
                                videos.push({
                                    title: videoRenderer.title?.runs?.[0]?.text || '',
                                    videoId: videoRenderer.videoId || '',
                                    channel: videoRenderer.shortBylineText?.runs?.[0]?.text || '',
                                    duration: videoRenderer.lengthText?.simpleText || '',
                                    views: parseInt(videoRenderer.viewCountText?.simpleText?.replace(/[^0-9]/g, '') || '0'),
                                });
                            }
                        }
                    }
                }
            }
            return { success: true, videos: videos.slice(0, maxResults) };
        }
        catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : String(error),
            };
        }
    }
    extractVideoId(url) {
        const patterns = [
            /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\s?]+)/,
            /^([a-zA-Z0-9_-]{11})$/,
        ];
        for (const pattern of patterns) {
            const match = url.match(pattern);
            if (match)
                return match[1];
        }
        return null;
    }
    findCaptionTracks(data) {
        const tracks = [];
        const searchCaptions = (obj) => {
            if (obj?.captionTracks) {
                for (const track of obj.captionTracks) {
                    if (track.url && track.languageCode) {
                        tracks.push({ url: track.url, languageCode: track.languageCode });
                    }
                }
            }
            if (obj && typeof obj === 'object') {
                for (const key of Object.values(obj)) {
                    if (typeof key === 'object') {
                        searchCaptions(key);
                    }
                }
            }
        };
        searchCaptions(data);
        return tracks;
    }
    findAuthor(data) {
        const searchAuthor = (obj) => {
            if (obj?.shortBylineText?.runs) {
                return obj.shortBylineText.runs[0]?.text;
            }
            if (obj && typeof obj === 'object') {
                for (const key of Object.values(obj)) {
                    if (typeof key === 'object') {
                        const result = searchAuthor(key);
                        if (result)
                            return result;
                    }
                }
            }
            return undefined;
        };
        return searchAuthor(data);
    }
    parseCaptions(xml) {
        const $ = cheerio.load(xml, { xmlMode: true });
        const segments = [];
        $('transcript text').each((_, el) => {
            const $el = $(el);
            const text = $el.text().trim();
            const start = parseFloat($el.attr('start') || '0');
            const duration = parseFloat($el.attr('dur') || '0');
            if (text) {
                segments.push({ text, start, duration });
            }
        });
        return segments;
    }
}
export const youtubeTool = new YouTubeTool();
export default youtubeTool;
//# sourceMappingURL=youtube.js.map