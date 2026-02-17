import axios from 'axios';
export class NewsTool {
    newsApiKey;
    constructor(options) {
        this.newsApiKey = options?.newsApiKey || process.env.NEWS_API_KEY;
    }
    async getTopHeadlines(options) {
        if (!this.newsApiKey) {
            return { success: false, error: 'News API key not configured' };
        }
        try {
            const response = await axios.get('https://newsapi.org/v2/top-headlines', {
                params: {
                    country: options?.country || 'us',
                    category: options?.category,
                    q: options?.query,
                    language: options?.language,
                    pageSize: options?.pageSize || 20,
                    page: options?.page || 1,
                    apiKey: this.newsApiKey,
                },
            });
            return {
                success: true,
                status: response.data.status,
                totalResults: response.data.totalResults,
                articles: response.data.articles,
            };
        }
        catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : String(error),
            };
        }
    }
    async searchNews(options) {
        if (!this.newsApiKey) {
            return { success: false, error: 'News API key not configured' };
        }
        try {
            const response = await axios.get('https://newsapi.org/v2/everything', {
                params: {
                    q: options.query,
                    language: options.language,
                    sortBy: 'relevancy',
                    pageSize: options.pageSize || 20,
                    page: options?.page || 1,
                    apiKey: this.newsApiKey,
                },
            });
            return {
                success: true,
                status: response.data.status,
                totalResults: response.data.totalResults,
                articles: response.data.articles,
            };
        }
        catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : String(error),
            };
        }
    }
    async getSources(category, language, country) {
        if (!this.newsApiKey) {
            return { success: false, error: 'News API key not configured' };
        }
        try {
            const response = await axios.get('https://newsapi.org/v2/top-headlines/sources', {
                params: {
                    category,
                    language,
                    country,
                    apiKey: this.newsApiKey,
                },
            });
            return {
                success: true,
                sources: response.data.sources,
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
export const newsTool = new NewsTool();
export default newsTool;
//# sourceMappingURL=news.js.map