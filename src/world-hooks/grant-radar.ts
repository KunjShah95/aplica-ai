import { randomUUID } from 'crypto';

export interface Grant {
  id: string;
  title: string;
  description: string;
  agency: string;
  url: string;
  amount?: number;
  deadline: Date;
  eligibility: string[];
  categories: string[];
  postedDate: Date;
  relevanceScore?: number;
}

export interface GrantSearchQuery {
  id: string;
  keywords: string[];
  agencies?: string[];
  amountMin?: number;
  deadlineAfter?: Date;
  categories: string[];
  alertEnabled: boolean;
  userId: string;
  createdAt: Date;
}

export class GrantRadar {
  private queries: Map<string, GrantSearchQuery[]> = new Map();
  private grants: Map<string, Grant[]> = new Map();

  async search(
    keywords: string[],
    options: {
      agencies?: string[];
      amountMin?: number;
      deadlineAfter?: Date;
      categories?: string[];
      maxResults?: number;
    } = {}
  ): Promise<Grant[]> {
    const { maxResults = 25 } = options;
    const allGrants: Grant[] = [];

    const usGrants = await this.searchGrantsGov(keywords, options);
    allGrants.push(...usGrants);

    const nsfGrants = await this.searchNsf(keywords, options);
    allGrants.push(...nsfGrants);

    const nihGrants = await this.searchGovLoans(keywords, options);
    allGrants.push(...nihGrants);

    return allGrants.sort((a, b) => b.relevanceScore! - a.relevanceScore!).slice(0, maxResults);
  }

  private async searchGrantsGov(keywords: string[], options: any): Promise<Grant[]> {
    try {
      const queryParams = new URLSearchParams();
      queryParams.set('keyword', keywords.join(' '));
      queryParams.set('size', String(options.maxResults || 10));

      const url = `https://api.grants.gov/v1/api/search2?${queryParams.toString()}`;
      const response = await fetch(url, {
        headers: { Accept: 'application/json' },
      });

      if (!response.ok) return [];

      const data = await response.json();
      return this.parseGrantsGov(data, keywords);
    } catch (error) {
      console.error('Grants.gov API error:', error);
      return [];
    }
  }

  private parseGrantsGov(data: any, keywords: string[]): Grant[] {
    if (!data?.response?.docs) return [];

    return data.response.docs.map((doc: any) => ({
      id: doc.synopsis_id || randomUUID(),
      title: doc.title || '',
      description: doc.synopsis || '',
      agency: doc.agency_name || '',
      url: doc.url || '',
      amount: doc.estimated_total_program_funding,
      deadline: new Date(doc.closing_date || doc.expected_number_of_awards || Date.now()),
      eligibility: doc.eligibility_category ? [doc.eligibility_category] : [],
      categories: doc.program_type_codes || [],
      postedDate: new Date(doc.posted_date || Date.now()),
      relevanceScore: this.calculateRelevance(doc, keywords),
    }));
  }

  private async searchNsf(keywords: string[], options: any): Promise<Grant[]> {
    return [];
  }

  private async searchGovLoans(keywords: string[], options: any): Promise<Grant[]> {
    return [];
  }

  private calculateRelevance(doc: any, keywords: string[]): number {
    const text = `${doc.title || ''} ${doc.synopsis || ''}`.toLowerCase();
    const queryLower = keywords.join(' ').toLowerCase();

    let score = 0;
    for (const term of queryLower.split(/\s+/)) {
      if (text.includes(term)) score += 15;
    }

    return Math.min(100, score);
  }

  registerQuery(userId: string, query: GrantSearchQuery): void {
    const userQueries = this.queries.get(userId) || [];
    userQueries.push(query);
    this.queries.set(userId, userQueries);
  }

  getQueries(userId: string): GrantSearchQuery[] {
    return this.queries.get(userId) || [];
  }

  async checkForNewGrants(userId: string): Promise<Grant[]> {
    const queries = this.getQueries(userId);
    const newGrants: Grant[] = [];

    for (const q of queries) {
      if (!q.alertEnabled) continue;

      const grants = await this.search(q.keywords, {
        agencies: q.agencies,
        amountMin: q.amountMin,
        deadlineAfter: q.deadlineAfter,
        categories: q.categories,
      });

      newGrants.push(...grants);
    }

    return newGrants;
  }

  async getUpcomingDeadlines(userId: string, daysAhead: number = 30): Promise<Grant[]> {
    const queries = this.getQueries(userId);
    const allGrants: Grant[] = [];
    const cutoffDate = new Date(Date.now() + daysAhead * 24 * 60 * 60 * 1000);

    for (const q of queries) {
      const grants = await this.search(q.keywords, {
        agencies: q.agencies,
        categories: q.categories,
        deadlineAfter: new Date(),
      });

      const upcoming = grants.filter((g) => g.deadline <= cutoffDate);
      allGrants.push(...upcoming);
    }

    return allGrants.sort((a, b) => a.deadline.getTime() - b.deadline.getTime());
  }
}

export const grantRadar = new GrantRadar();
