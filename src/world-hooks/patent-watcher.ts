import { randomUUID } from 'crypto';

export interface Patent {
  id: string;
  title: string;
  abstract: string;
  inventors: string[];
  assignee: string;
  patentNumber: string;
  filingDate: Date;
  grantDate?: Date;
  url: string;
  relevanceScore?: number;
  CPCCodes: string[];
}

export interface PatentSearchQuery {
  id: string;
  keywords: string[];
  cpcCodes: string[];
  assignee?: string;
  dateFrom?: Date;
  dateTo?: Date;
  alertEnabled: boolean;
  userId: string;
  createdAt: Date;
}

export class PatentWatcher {
  private queries: Map<string, PatentSearchQuery[]> = new Map();
  private recentPatents: Map<string, Patent[]> = new Map();

  async search(
    keywords: string[],
    options: {
      cpcCodes?: string[];
      assignee?: string;
      dateFrom?: Date;
      dateTo?: Date;
      maxResults?: number;
    } = {}
  ): Promise<Patent[]> {
    const { cpcCodes = [], assignee, dateFrom, dateTo, maxResults = 20 } = options;

    const queryParams = new URLSearchParams();
    queryParams.set('q', keywords.join(' OR '));
    queryParams.set('rows', String(maxResults));
    queryParams.set('o', '100');

    if (cpcCodes.length > 0) {
      queryParams.set('cpcs', cpcCodes.join('|'));
    }

    const url = `https://developer.uspto.gov/api/v1/patent?${queryParams.toString()}`;

    try {
      const response = await fetch(url);
      const data = await response.json();
      return this.parsePatents(data.response.docs, keywords);
    } catch (error) {
      console.error('USPTO API error:', error);
      return [];
    }
  }

  private parsePatents(docs: any[], keywords: string[]): Patent[] {
    return docs.map((doc: any) => ({
      id: doc.patent_number || randomUUID(),
      title: doc.title || '',
      abstract: doc.abstract_text?.[0] || '',
      inventors: doc.inventor_name_array_text || [],
      assignee: doc.assignee_organization_name || 'Unknown',
      patentNumber: doc.patent_number || '',
      filingDate: new Date(doc.filing_date || doc.application_date || Date.now()),
      grantDate: doc.patent_date ? new Date(doc.patent_date) : undefined,
      url: `https://patents.google.com/patent/US${doc.patent_number}`,
      CPCCodes: doc.cpc_subgroup_id_array || [],
      relevanceScore: this.calculateRelevance(doc, keywords),
    }));
  }

  private calculateRelevance(doc: any, keywords: string[]): number {
    const text = `${doc.title} ${doc.abstract_text?.[0] || ''}`.toLowerCase();
    const queryLower = keywords.join(' ').toLowerCase();

    let score = 0;
    for (const term of queryLower.split(/\s+/)) {
      if (text.includes(term)) score += 10;
    }

    return Math.min(100, score);
  }

  registerQuery(userId: string, query: PatentSearchQuery): void {
    const userQueries = this.queries.get(userId) || [];
    userQueries.push(query);
    this.queries.set(userId, userQueries);
  }

  getQueries(userId: string): PatentSearchQuery[] {
    return this.queries.get(userId) || [];
  }

  async checkForNewPatents(userId: string): Promise<Patent[]> {
    const queries = this.getQueries(userId);
    const newPatents: Patent[] = [];

    for (const q of queries) {
      if (!q.alertEnabled) continue;

      const patents = await this.search(q.keywords, {
        cpcCodes: q.cpcCodes,
        assignee: q.assignee,
        dateFrom: q.dateFrom,
        dateTo: q.dateTo,
      });

      newPatents.push(...patents);
    }

    return newPatents;
  }
}

export const patentWatcher = new PatentWatcher();
