import { Pinecone } from '@pinecone-database/pinecone';
import { v4 as uuidv4 } from 'uuid';

export interface PineconeConfig {
  apiKey: string;
  environment: string;
  indexName: string;
  dimension?: number;
  metric?: 'cosine' | 'euclidean' | 'dotproduct';
}

export interface VectorDocument {
  id?: string;
  content: string;
  embedding: number[];
  metadata?: Record<string, any>;
}

export interface SearchResult {
  id: string;
  score: number;
  content: string;
  metadata?: Record<string, any>;
}

export interface VectorStore {
  upsert(documents: VectorDocument[]): Promise<string[]>;
  search(queryEmbedding: number[], options?: SearchOptions): Promise<SearchResult[]>;
  delete(ids: string[]): Promise<void>;
  query(vector: number[], filter?: Record<string, any>, topK?: number): Promise<SearchResult[]>;
  describeIndex(): Promise<IndexDescription>;
}

export interface SearchOptions {
  topK?: number;
  filter?: Record<string, any>;
  includeMetadata?: boolean;
}

export interface IndexDescription {
  name: string;
  dimension: number;
  metric: string;
  status: 'ready' | 'initializing' | 'failed';
}

export class PineconeVectorStore implements VectorStore {
  private client: Pinecone;
  private index: any;
  private indexName: string;

  constructor(config: PineconeConfig) {
    this.client = new Pinecone({
      apiKey: config.apiKey,
    });
    this.indexName = config.indexName;
  }

  async initialize(): Promise<void> {
    try {
      this.index = this.client.index(this.indexName);
      const description = await this.describeIndex();
      console.log(`Pinecone index '${this.indexName}' is ${description.status}`);
    } catch (error) {
      console.error('Failed to initialize Pinecone index:', error);
      throw error;
    }
  }

  async upsert(documents: VectorDocument[]): Promise<string[]> {
    const records = documents.map((doc) => ({
      id: doc.id || uuidv4(),
      values: doc.embedding,
      metadata: {
        content: doc.content.slice(0, 4000),
        ...doc.metadata,
      },
    }));

    try {
      const upsertRequest = await this.index.upsert(records);
      return records.map((r) => r.id);
    } catch (error) {
      console.error('Pinecone upsert error:', error);
      throw error;
    }
  }

  async search(queryEmbedding: number[], options?: SearchOptions): Promise<SearchResult[]> {
    const topK = options?.topK || 10;

    try {
      const searchRequest = {
        vector: queryEmbedding,
        topK,
        filter: options?.filter,
        includeMetadata: options?.includeMetadata !== false,
      };

      const results = await this.index.query(searchRequest);

      return (
        results.matches?.map((match: any) => ({
          id: match.id,
          score: match.score || 0,
          content: match.metadata?.content || '',
          metadata: match.metadata,
        })) || []
      );
    } catch (error) {
      console.error('Pinecone search error:', error);
      throw error;
    }
  }

  async query(
    vector: number[],
    filter?: Record<string, any>,
    topK?: number
  ): Promise<SearchResult[]> {
    return this.search(vector, { topK, filter });
  }

  async delete(ids: string[]): Promise<void> {
    try {
      await this.index.deleteMany(ids);
    } catch (error) {
      console.error('Pinecone delete error:', error);
      throw error;
    }
  }

  async describeIndex(): Promise<IndexDescription> {
    try {
      const description = await this.client.describeIndex(this.indexName);
      return {
        name: description.name,
        dimension: description.dimension || 1536,
        metric: description.metric || 'cosine',
        status: description.status?.ready ? 'ready' : 'initializing',
      };
    } catch (error) {
      console.error('Pinecone describe index error:', error);
      throw error;
    }
  }

  async createIndex(
    name: string,
    dimension: number,
    metric: 'cosine' | 'euclidean' | 'dotproduct' = 'cosine'
  ): Promise<void> {
    try {
      await this.client.createIndex({
        name,
        dimension,
        metric,
        spec: {
          serverless: {
            cloud: 'aws',
            region: 'us-west-2',
          },
        },
      });

      console.log(`Pinecone index '${name}' created successfully`);
    } catch (error) {
      console.error('Pinecone create index error:', error);
      throw error;
    }
  }

  async deleteIndex(name: string): Promise<void> {
    try {
      await this.client.deleteIndex(name);
    } catch (error) {
      console.error('Pinecone delete index error:', error);
      throw error;
    }
  }

  async listIndexes(): Promise<string[]> {
    try {
      const indexes = await this.client.listIndexes();
      return indexes.indexes?.map((i: any) => i.name) || [];
    } catch (error) {
      console.error('Pinecone list indexes error:', error);
      throw error;
    }
  }

  async upsertSingle(document: VectorDocument): Promise<string> {
    const ids = await this.upsert([document]);
    return ids[0];
  }

  async fetch(ids: string[]): Promise<VectorDocument[]> {
    try {
      const fetchResult = await this.index.fetch(ids);

      return Object.values(fetchResult.records || {}).map((record: any) => ({
        id: record.id,
        content: record.metadata?.content || '',
        embedding: record.values || [],
        metadata: record.metadata,
      }));
    } catch (error) {
      console.error('Pinecone fetch error:', error);
      throw error;
    }
  }

  async update(id: string, embedding: number[], metadata?: Record<string, any>): Promise<void> {
    try {
      await this.index.upsert([
        {
          id,
          values: embedding,
          metadata: {
            ...metadata,
          },
        },
      ]);
    } catch (error) {
      console.error('Pinecone update error:', error);
      throw error;
    }
  }

  async getStats(): Promise<{
    totalRecordCount: number;
    namespaceRecordCounts: Record<string, number>;
  }> {
    try {
      const stats = await this.index.describeIndexStats();
      return {
        totalRecordCount: stats.totalRecordCount || 0,
        namespaceRecordCounts: stats.namespaces || {},
      };
    } catch (error) {
      console.error('Pinecone stats error:', error);
      throw error;
    }
  }
}
