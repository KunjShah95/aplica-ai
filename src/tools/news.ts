import axios from 'axios';

export interface NewsOptions {
  query?: string;
  category?:
    | 'general'
    | 'business'
    | 'entertainment'
    | 'health'
    | 'science'
    | 'sports'
    | 'technology';
  country?: string;
  language?: string;
  pageSize?: number;
  page?: number;
}

export interface NewsArticle {
  source: { id: string | null; name: string };
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

export class NewsTool {
  private newsApiKey?: string;

  constructor(options?: { newsApiKey?: string }) {
    this.newsApiKey = options?.newsApiKey || process.env.NEWS_API_KEY;
  }

  async getTopHeadlines(options?: NewsOptions): Promise<NewsResult> {
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
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  async searchNews(options: NewsOptions): Promise<NewsResult> {
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
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  async getSources(
    category?: string,
    language?: string,
    country?: string
  ): Promise<{
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
  }> {
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
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }
}

export const newsTool = new NewsTool();

export default newsTool;
