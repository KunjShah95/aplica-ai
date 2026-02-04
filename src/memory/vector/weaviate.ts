import { WeaviateClient, weaviateConfig, ApiKey } from 'weaviate-ts-client';
import { v4 as uuidv4 } from 'uuid';

export interface WeaviateConfig {
  host: string;
  apiKey?: string;
  scheme?: 'http' | 'https';
  className?: string;
}

export interface WeaviateDocument {
  id?: string;
  content: string;
  embedding?: number[];
  metadata?: Record<string, any>;
}

export interface WeaviateSearchResult {
  id: string;
  score: number;
  content: string;
  metadata?: Record<string, any>;
}

export interface WeaviateStore {
  add(documents: WeaviateDocument[]): Promise<string[]>;
  search(query: string | number[], options?: SearchOptions): Promise<WeaviateSearchResult[]>;
  delete(ids: string[]): Promise<void>;
  query(
    vector?: number[],
    nearText?: { concepts: string[] },
    where?: Record<string, any>,
    limit?: number
  ): Promise<WeaviateSearchResult[]>;
  getClassSchema(): Promise<any>;
}

export interface SearchOptions {
  limit?: number;
  offset?: number;
  where?: Record<string, any>;
  sort?: string[];
  includeVector?: boolean;
}

export class WeaviateVectorStore implements WeaviateStore {
  private client: WeaviateClient;
  private className: string;

  constructor(config: WeaviateConfig) {
    const weaviateConfigObj = weaviateConfig({
      host: config.host,
      scheme: config.scheme || 'http',
    });

    if (config.apiKey) {
      (weaviateConfigObj as any).apiKey = new ApiKey(config.apiKey);
    }

    this.client = (WeaviateClient as any)(weaviateConfigObj);
    this.className = config.className || 'SentinelDocument';
  }

  async initialize(): Promise<void> {
    try {
      const schema = await this.getClassSchema();

      if (!schema) {
        console.log(`Creating Weaviate class '${this.className}'...`);
        await this.createClass();
      } else {
        console.log(`Weaviate class '${this.className}' exists`);
      }
    } catch (error) {
      console.error('Failed to initialize Weaviate:', error);
      throw error;
    }
  }

  async add(documents: WeaviateDocument[]): Promise<string[]> {
    const ids: string[] = [];

    try {
      for (const doc of documents) {
        const id = doc.id || uuidv4();
        ids.push(id);

        await this.client.data
          .creator()
          .withClassName(this.className)
          .withId(id)
          .withProperties({
            content: doc.content,
            metadata: doc.metadata ? JSON.stringify(doc.metadata) : {},
            ...(doc.embedding && { vector: doc.embedding }),
          })
          .do();
      }

      return ids;
    } catch (error) {
      console.error('Weaviate add error:', error);
      throw error;
    }
  }

  async search(query: string | number[], options?: SearchOptions): Promise<WeaviateSearchResult[]> {
    const limit = options?.limit || 10;

    try {
      let searchBuilder: any;

      if (typeof query === 'string') {
        searchBuilder = this.client.graphql
          .get()
          .withClassName(this.className)
          .withNearText({
            concepts: [query],
          });
      } else {
        searchBuilder = this.client.graphql.get().withClassName(this.className).withNearVector({
          vector: query,
        });
      }

      if (options?.where) {
        searchBuilder = searchBuilder.withWhere(options.where);
      }

      if (options?.offset) {
        searchBuilder = searchBuilder.withOffset(options.offset);
      }

      searchBuilder = searchBuilder.withLimit(limit);

      if (options?.includeVector !== false) {
        searchBuilder = searchBuilder.withAdd('vector');
      }

      const result = await searchBuilder.do();
      const data = result.data?.Get?.[this.className] || [];

      return data.map((item: any) => ({
        id: item._additional?.id || '',
        score: item._additional?.score || 0,
        content: item.content || '',
        metadata: item.metadata ? JSON.parse(item.metadata) : {},
      }));
    } catch (error) {
      console.error('Weaviate search error:', error);
      throw error;
    }
  }

  async query(
    vector?: number[],
    nearText?: { concepts: string[] },
    where?: Record<string, any>,
    limit?: number
  ): Promise<WeaviateSearchResult[]> {
    return this.search(vector || nearText!.concepts.join(' '), {
      limit,
      where,
    });
  }

  async delete(ids: string[]): Promise<void> {
    try {
      for (const id of ids) {
        await this.client.data.deleter().withClassName(this.className).withId(id).do();
      }
    } catch (error) {
      console.error('Weaviate delete error:', error);
      throw error;
    }
  }

  async getClassSchema(): Promise<any> {
    try {
      const schema = await this.client.schema.getter().do();
      const classObj = schema.classes?.find((c: any) => c.class === this.className);
      return classObj || null;
    } catch (error) {
      console.error('Weaviate get schema error:', error);
      return null;
    }
  }

  private async createClass(): Promise<void> {
    const classObj = {
      class: this.className,
      description: 'Document embeddings for Sentinel AI',
      vectorizer: 'text2vec-transformers',
      moduleConfig: {
        'text2vec-transformers': {
          vectorizeClassName: false,
        },
      },
      properties: [
        {
          name: 'content',
          dataType: ['text'],
          description: 'Document content',
        },
        {
          name: 'metadata',
          dataType: ['text'],
          description: 'JSON metadata',
        },
      ],
    };

    try {
      await this.client.schema.classCreator().withClass(classObj).do();
    } catch (error: any) {
      if (!error.message?.includes('already exists')) {
        throw error;
      }
    }
  }

  async batchAdd(documents: WeaviateDocument[]): Promise<string[]> {
    const batch = documents.map((doc) => ({
      class: this.className,
      id: doc.id || uuidv4(),
      properties: {
        content: doc.content,
        metadata: doc.metadata ? JSON.stringify(doc.metadata) : {},
      },
      ...(doc.embedding && { vector: doc.embedding }),
    }));

    try {
      await this.client.batch.objectsBatcher().withObjects(batch).do();

      return batch.map((b) => b.id);
    } catch (error) {
      console.error('Weaviate batch add error:', error);
      throw error;
    }
  }

  async fetchById(id: string): Promise<WeaviateSearchResult | null> {
    try {
      const result = await this.client.data.getter().withClassName(this.className).withId(id).do();
      const item = result.objects?.[0];

      if (!item) return null;

      return {
        id: item._additional?.id || '',
        score: 1,
        content: item.properties?.content || '',
        metadata: item.properties?.metadata ? JSON.parse(item.properties.metadata) : {},
      };
    } catch (error) {
      console.error('Weaviate fetch by ID error:', error);
      throw error;
    }
  }

  async update(id: string, content: string, metadata?: Record<string, any>): Promise<void> {
    try {
      await this.client.data
        .updater()
        .withClassName(this.className)
        .withId(id)
        .withProperties({
          content,
          metadata: metadata ? JSON.stringify(metadata) : {},
        })
        .do();
    } catch (error) {
      console.error('Weaviate update error:', error);
      throw error;
    }
  }

  async getStats(): Promise<{ totalCount: number }> {
    try {
      const result = await this.client.graphql
        .aggregate()
        .withClassName(this.className)
        .withGroupBy('content')
        .do();
      return {
        totalCount: result.data?.Aggregate?.[this.className]?.[0]?.meta?.count || 0,
      };
    } catch (error) {
      console.error('Weaviate stats error:', error);
      throw error;
    }
  }

  async createBackup(backupId: string): Promise<void> {
    try {
      await this.client.backups.create(backupId, [this.className], {
        backend: 'filesystem',
        includeClassNames: [this.className],
      });
    } catch (error) {
      console.error('Weaviate backup error:', error);
      throw error;
    }
  }
}

export { WeaviateVectorStore };
