import { randomUUID } from 'crypto';

export interface RegulatoryUpdate {
  id: string;
  title: string;
  summary: string;
  agency: string;
  url: string;
  publicationDate: Date;
  effectiveDate?: Date;
  documentNumber: string;
  type: 'proposed' | 'final' | 'interim' | 'notice';
  topics: string[];
  relevanceScore?: number;
  impactLevel?: 'high' | 'medium' | 'low';
}

export interface RegulatoryWatchQuery {
  id: string;
  agencies: string[];
  topics: string[];
  keywords: string[];
  alertEnabled: boolean;
  userId: string;
  createdAt: Date;
}

export class RegulatoryWatcher {
  private queries: Map<string, RegulatoryWatchQuery[]> = new Map();
  private cache: Map<string, { data: RegulatoryUpdate[]; timestamp: number }> = new Map();
  private cacheDuration: number = 1000 * 60 * 60;

  async search(
    keywords: string[],
    options: {
      agencies?: string[];
      topics?: string[];
      type?: RegulatoryUpdate['type'];
      dateFrom?: Date;
      maxResults?: number;
    } = {}
  ): Promise<RegulatoryUpdate[]> {
    const { maxResults = 20 } = options;
    const cacheKey = `reg-${keywords.join('-')}-${options.type || 'all'}`;

    const cached = this.cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < this.cacheDuration) {
      return cached.data.slice(0, maxResults);
    }

    const updates = await this.fetchFederalRegister(keywords, options);
    this.cache.set(cacheKey, { data: updates, timestamp: Date.now() });

    return updates.slice(0, maxResults);
  }

  private async fetchFederalRegister(
    keywords: string[],
    options: any
  ): Promise<RegulatoryUpdate[]> {
    try {
      const queryParams = new URLSearchParams();
      queryParams.set('conditions[terms]', keywords.join(' '));
      queryParams.set('conditions[type]', options.type || 'proposed,final');
      queryParams.set('order', 'newest');
      queryParams.set('size', String(options.maxResults || 20));

      const url = `https://www.federalregister.gov/api/v1/articles?${queryParams.toString()}`;
      const response = await fetch(url);

      if (!response.ok) return [];

      const data = await response.json();
      return this.parseFederalRegister(data.results, keywords);
    } catch (error) {
      console.error('Federal Register API error:', error);
      return [];
    }
  }

  private parseFederalRegister(results: any[], keywords: string[]): RegulatoryUpdate[] {
    return results.map((article: any) => ({
      id: article.article_number || randomUUID(),
      title: article.title || '',
      summary: article.excerpts?.[0] || article.abstract || '',
      agency: article.agencies?.[0]?.name || 'Unknown',
      url: article.html_url || '',
      publicationDate: new Date(article.publication_date),
      effectiveDate: article.effective_date ? new Date(article.effective_date) : undefined,
      documentNumber: article.regulation_id_number?.[0] || article.document_number || '',
      type: this.mapDocumentType(article.type),
      topics: article.topics?.map((t: any) => t.name) || [],
      relevanceScore: this.calculateRelevance(article, keywords),
      impactLevel: this.estimateImpact(article),
    }));
  }

  private mapDocumentType(type: string): RegulatoryUpdate['type'] {
    const typeMap: Record<string, RegulatoryUpdate['type']> = {
      'Proposed Rule': 'proposed',
      'Rule': 'final',
      'Notice': 'notice',
      'Interim Final Rule': 'interim',
    };
    return typeMap[type] || 'notice';
  }

  private calculateRelevance(article: any, keywords: string[]): number {
    const text = `${article.title || ''} ${article.excerpts?.[0] || ''}`.toLowerCase();
    const queryLower = keywords.join(' ').toLowerCase();

    let score = 0;
    for (const term of queryLower.split(/\s+/)) {
      if (text.includes(term)) score += 12;
    }

    if (article.type === 'Rule') score += 5;
    if (article.type === 'Proposed Rule') score += 10;

    return Math.min(100, score);
  }

  private estimateImpact(article: any): 'high' | 'medium' | 'low' {
    const title = (article.title || '').toLowerCase();
    const highImpact = ['mandate', 'requirement', 'compliance', 'enforcement', 'penalty'];
    const mediumImpact = ['amendment', 'update', 'revision', 'modification'];

    if (highImpact.some((w) => title.includes(w))) return 'high';
    if (mediumImpact.some((w) => title.includes(w))) return 'medium';
    return 'low';
  }

  registerQuery(userId: string, query: RegulatoryWatchQuery): void {
    const userQueries = this.queries.get(userId) || [];
    userQueries.push(query);
    this.queries.set(userId, userQueries);
  }

  getQueries(userId: string): RegulatoryWatchQuery[] {
    return this.queries.get(userId) || [];
  }

  async checkForUpdates(userId: string): Promise<RegulatoryUpdate[]> {
    const queries = this.getQueries(userId);
    const updates: RegulatoryUpdate[] = [];

    for (const q of queries) {
      if (!q.alertEnabled) continue;

      const results = await this.search(q.keywords, {
        agencies: q.agencies,
        topics: q.topics,
      });

      updates.push(...results);
    }

    return updates.sort((a, b) => (b.relevanceScore || 0) - (a.relevanceScore || 0));
  }

  async getComplianceDeadlines(userId: string): Promise<RegulatoryUpdate[]> {
    const queries = this.getQueries(userId);
    const allUpdates: RegulatoryUpdate[] = [];

    for (const q of queries) {
      const updates = await this.search(q.keywords, {
        agencies: q.agencies,
        type: 'final',
      });

      const withDeadline = updates.filter((u) => u.effectiveDate && u.effectiveDate > new Date());
      allUpdates.push(...withDeadline);
    }

    return allUpdates.sort(
      (a, b) => (a.effectiveDate?.getTime() || 0) - (b.effectiveDate?.getTime() || 0)
    );
  }
}

export const regulatoryWatcher = new RegulatoryWatcher();
