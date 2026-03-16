import { randomUUID } from 'crypto';

export interface ArxivPaper {
  id: string;
  title: string;
  authors: string[];
  abstract: string;
  published: Date;
  categories: string[];
  pdfUrl: string;
  relevanceScore?: number;
}

export interface SearchQuery {
  id: string;
  query: string;
  categories: string[];
  maxResults: number;
  alertEnabled: boolean;
  userId: string;
  createdAt: Date;
  lastRun?: Date;
}

export class ArxivWatcher {
  private queries: Map<string, SearchQuery[]> = new Map();
  private cache: Map<string, ArxivPaper[]> = new Map();
  private cacheExpiry: number = 1000 * 60 * 60;

  async search(
    query: string,
    categories: string[] = ['cs.ai', 'cs.lg', 'cs.cl'],
    maxResults: number = 10
  ): Promise<ArxivPaper[]> {
    const cacheKey = `${query}-${categories.join(',')}`;
    const cached = this.cache.get(cacheKey);

    if (cached && Date.now() - this.cacheExpiry < this.cacheExpiry) {
      return cached;
    }

    const papers = await this.fetchArxivPapers(query, categories, maxResults);
    this.cache.set(cacheKey, papers);

    return papers;
  }

  private async fetchArxivPapers(
    query: string,
    categories: string[],
    maxResults: number
  ): Promise<ArxivPaper[]> {
    const catQuery = categories.map((c) => `cat:${c}`).join('+OR+');
    const searchQuery = `all:${query}+AND+(${catQuery})`;
    const url = `http://export.arxiv.org/api/query?search_query=${encodeURIComponent(searchQuery)}&max_results=${maxResults}&sortBy=submittedDate&sortOrder=descending`;

    try {
      const response = await fetch(url);
      const xml = await response.text();
      return this.parseArxivXml(xml, query);
    } catch (error) {
      console.error('Arxiv API error:', error);
      return [];
    }
  }

  private parseArxivXml(xml: string, query: string): ArxivPaper[] {
    const papers: ArxivPaper[] = [];
    const entryRegex = /<entry>([\s\S]*?)<\/entry>/g;
    let match;

    while ((match = entryRegex.exec(xml)) !== null) {
      const entry = match[1];
      const title = this.extractTag(entry, 'title')?.replace(/\s+/g, ' ').trim() || '';
      const authors = this.extractAuthors(entry);
      const abstract = this.extractTag(entry, 'summary')?.replace(/\s+/g, ' ').trim() || '';
      const published = this.extractTag(entry, 'published') || '';
      const pdfUrl = this.extractTag(entry, 'pdf') || '';
      const id = this.extractTag(entry, 'id')?.split('/').pop() || randomUUID();
      const categories = this.extractCategories(entry);

      const relevanceScore = this.calculateRelevance(title, abstract, query);

      papers.push({
        id,
        title,
        authors,
        abstract,
        published: new Date(published),
        categories,
        pdfUrl,
        relevanceScore,
      });
    }

    return papers.sort((a, b) => (b.relevanceScore || 0) - (a.relevanceScore || 0));
  }

  private extractTag(xml: string, tag: string): string | null {
    const regex = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`);
    const match = xml.match(regex);
    return match ? match[1] : null;
  }

  private extractAuthors(xml: string): string[] {
    const authorRegex = /<author><name>(.*?)<\/name><\/author>/g;
    const authors: string[] = [];
    let match;
    while ((match = authorRegex.exec(xml)) !== null) {
      authors.push(match[1]);
    }
    return authors;
  }

  private extractCategories(xml: string): string[] {
    const catRegex = /<category term="([^"]+)"/g;
    const categories: string[] = [];
    let match;
    while ((match = catRegex.exec(xml)) !== null) {
      categories.push(match[1]);
    }
    return categories;
  }

  private calculateRelevance(title: string, abstract: string, query: string): number {
    const queryLower = query.toLowerCase();
    const titleLower = title.toLowerCase();
    const abstractLower = abstract.toLowerCase();

    let score = 0;
    const queryTerms = queryLower.split(/\s+/);

    for (const term of queryTerms) {
      if (titleLower.includes(term)) score += 10;
      if (abstractLower.includes(term)) score += 3;
    }

    return Math.min(100, score);
  }

  registerQuery(userId: string, query: SearchQuery): void {
    const userQueries = this.queries.get(userId) || [];
    userQueries.push(query);
    this.queries.set(userId, userQueries);
  }

  getQueries(userId: string): SearchQuery[] {
    return this.queries.get(userId) || [];
  }

  async checkForNewPapers(userId: string): Promise<ArxivPaper[]> {
    const queries = this.getQueries(userId);
    const newPapers: ArxivPaper[] = [];

    for (const q of queries) {
      if (!q.alertEnabled) continue;

      const papers = await this.search(q.query, q.categories, q.maxResults);
      const lastRun = q.lastRun || new Date(0);

      const recentPapers = papers.filter((p) => p.published > lastRun);
      newPapers.push(...recentPapers);

      q.lastRun = new Date();
    }

    return newPapers;
  }
}

export const arxivWatcher = new ArxivWatcher();
