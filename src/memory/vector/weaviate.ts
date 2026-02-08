import weaviate, { WeaviateClient, ApiKey } from 'weaviate-ts-client';
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
  metadata?: Record<string, unknown>;
}

export interface WeaviateSearchResult {
  id: string;
  score: number;
  content: string;
  metadata?: Record<string, unknown>;
}

export interface WeaviateStore {
  add(documents: WeaviateDocument[]): Promise<string[]>;
  search(query: string | number[], options?: SearchOptions): Promise<WeaviateSearchResult[]>;
  delete(ids: string[]): Promise<void>;
  query(
    vector?: number[],
    nearText?: { concepts: string[] },
    where?: Record<string, unknown>,
    limit?: number
  ): Promise<WeaviateSearchResult[]>;
  getClassSchema(): Promise<unknown>;
}

export interface SearchOptions {
  limit?: number;
  offset?: number;
  where?: Record<string, unknown>;
  sort?: string[];
  includeVector?: boolean;
}

export class WeaviateVectorStore implements WeaviateStore {
  private client: WeaviateClient;
  private className: string;

  constructor(config: WeaviateConfig) {
    this.client = weaviate.client({
      scheme: config.scheme || 'http',
      host: config.host,
      apiKey: config.apiKey ? new ApiKey(config.apiKey) : undefined,
    });
    this.className = config.className || 'AlpiciaDocument';
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
      let searchBuilder: unknown;

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
        searchBuilder = (
          searchBuilder as { withWhere: (where: Record<string, unknown>) => unknown }
        ).withWhere(options.where);
      }

      if (options?.offset) {
        searchBuilder = (searchBuilder as { withOffset: (offset: number) => unknown }).withOffset(
          options.offset
        );
      }

      searchBuilder = (searchBuilder as { withLimit: (limit: number) => unknown }).withLimit(limit);

      if (options?.includeVector !== false) {
        searchBuilder = (searchBuilder as { withFields: (fields: string) => unknown }).withFields(
          '_additional { id certainty distance vector } content metadata'
        );
      } else {
        searchBuilder = (searchBuilder as { withFields: (fields: string) => unknown }).withFields(
          '_additional { id certainty distance } content metadata'
        );
      }

      const result = await (searchBuilder as { do: () => Promise<unknown> }).do();
      const resultData = (result as { data?: { Get?: { [key: string]: unknown[] } } })?.data;
      const data = resultData?.Get?.[this.className] || [];

      return (data as unknown[]).map((item: unknown) => {
        const typedItem = item as Record<string, unknown>;
        const additional = typedItem._additional as Record<string, unknown>;
        return {
          id: (additional?.id as string) || '',
          score: (additional?.certainty as number) || (additional?.distance as number) || 0,
          content: (typedItem.content as string) || '',
          metadata: typedItem.metadata ? JSON.parse(typedItem.metadata as string) : {},
        };
      });
    } catch (error) {
      console.error('Weaviate search error:', error);
      throw error;
    }
  }

  async query(
    vector?: number[],
    nearText?: { concepts: string[] },
    where?: Record<string, unknown>,
    limit?: number
  ): Promise<WeaviateSearchResult[]> {
    const queryText = vector ? undefined : nearText?.concepts.join(' ');
    return this.search(queryText || (vector as unknown as string), {
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

  async getClassSchema(): Promise<unknown> {
    try {
      const schema = await this.client.schema.getter().do();
      const classObj = schema.classes?.find((c) => c.class === this.className);
      return classObj || null;
    } catch (error) {
      console.error('Weaviate get schema error:', error);
      return null;
    }
  }

  private async createClass(): Promise<void> {
    const classObj = {
      class: this.className,
      description: 'Document embeddings for Alpicia AI',
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
    const ids: string[] = [];

    try {
      let batcher = this.client.batch.objectsBatcher();

      for (const doc of documents) {
        const id = doc.id || uuidv4();
        ids.push(id);

        batcher = batcher.withObject({
          class: this.className,
          id,
          properties: {
            content: doc.content,
            metadata: doc.metadata ? JSON.stringify(doc.metadata) : {},
          },
          vector: doc.embedding,
        });
      }

      await batcher.do();
      return ids;
    } catch (error) {
      console.error('Weaviate batch add error:', error);
      throw error;
    }
  }

  async fetchById(id: string): Promise<WeaviateSearchResult | null> {
    try {
      const result = await this.client.graphql
        .get()
        .withClassName(this.className)
        .withWhere({
          path: ['id'],
          operator: 'Equal',
          valueString: id,
        })
        .withFields('_additional { id } content metadata')
        .do();

      const items = result.data?.Get?.[this.className];
      if (!items || items.length === 0) return null;

      const item = items[0];
      return {
        id: item._additional?.id || '',
        score: 1,
        content: item.content || '',
        metadata: item.metadata ? JSON.parse(item.metadata) : {},
      };
    } catch (error) {
      console.error('Weaviate fetch by ID error:', error);
      throw error;
    }
  }

  async update(id: string, content: string, metadata?: Record<string, unknown>): Promise<void> {
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
        .withFields('meta { count }')
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
      await this.client.backup
        .creator()
        .withBackend('filesystem')
        .withBackupId(backupId)
        .withIncludeClassNames(this.className)
        .do();
    } catch (error) {
      console.error('Weaviate backup error:', error);
      throw error;
    }
  }
}
