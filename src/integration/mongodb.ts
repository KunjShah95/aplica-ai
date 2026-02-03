import { MongoClient, Db, Collection, Document, ObjectId } from 'mongodb';

export interface MongoConfig {
  uri: string;
  database: string;
  options?: {
    maxPoolSize?: number;
    minPoolSize?: number;
    maxIdleTimeMS?: number;
    connectTimeoutMS?: number;
    serverSelectionTimeoutMS?: number;
  };
}

export interface MongoQuery<T extends Document> {
  filter?: Partial<T>;
  projection?: Record<string, 1 | 0>;
  sort?: Record<string, 1 | -1>;
  skip?: number;
  limit?: number;
}

export interface MongoUpdate<T extends Document> {
  $set?: Partial<T>;
  $unset?: Record<string, ''>;
  $inc?: Record<string, number>;
  $push?: Record<string, any>;
  $pull?: Record<string, any>;
}

export class MongoDatabase {
  private client: MongoClient | null = null;
  private db: Db | null = null;
  private config: MongoConfig;

  constructor(config: MongoConfig) {
    this.config = config;
  }

  async connect(): Promise<void> {
    if (this.client) return;

    this.client = new MongoClient(this.config.uri, {
      maxPoolSize: this.config.options?.maxPoolSize || 10,
      minPoolSize: this.config.options?.minPoolSize || 0,
      maxIdleTimeMS: this.config.options?.maxIdleTimeMS || 0,
      connectTimeoutMS: this.config.options?.connectTimeoutMS || 10000,
      serverSelectionTimeoutMS: this.config.options?.serverSelectionTimeoutMS || 10000,
    });

    await this.client.connect();
    this.db = this.client.db(this.config.database);
    console.log('MongoDB connected successfully');
  }

  async disconnect(): Promise<void> {
    if (this.client) {
      await this.client.close();
      this.client = null;
      this.db = null;
    }
  }

  getCollection<T extends Document>(name: string): Collection<T> {
    if (!this.db) throw new Error('Database not connected');
    return this.db.collection<T>(name);
  }

  async createCollection(name: string, options?: any): Promise<void> {
    if (!this.db) throw new Error('Database not connected');
    await this.db.createCollection(name, options);
  }

  async listCollections(): Promise<string[]> {
    if (!this.db) throw new Error('Database not connected');
    const collections = await this.db.listCollections().toArray();
    return collections.map((c) => c.name);
  }

  async dropCollection(name: string): Promise<void> {
    if (!this.db) throw new Error('Database not connected');
    await this.db.collection(name).drop();
  }

  async createIndex<T extends Document>(
    collection: string,
    fieldOrSpec: string | Record<string, 1 | -1 | string>,
    options?: Record<string, any>
  ): Promise<string> {
    return this.getCollection<T>(collection).createIndex(fieldOrSpec as any, options);
  }

  async createTextIndex<T extends Document>(
    collection: string,
    fields: string[],
    options?: { weights?: Record<string, number>; name?: string }
  ): Promise<string> {
    const indexSpec: Record<string, 1> = {};
    for (const field of fields) {
      indexSpec[field] = 'text';
    }
    return this.getCollection<T>(collection).createIndex(indexSpec, {
      weights: options?.weights,
      name: options?.name,
    });
  }

  async ping(): Promise<boolean> {
    try {
      if (!this.client) return false;
      await this.client.db('admin').command({ ping: 1 });
      return true;
    } catch {
      return false;
    }
  }
}

export class MongoRepository<T extends Document> {
  private collection: Collection<T>;
  private name: string;

  constructor(db: MongoDatabase, collectionName: string) {
    this.collection = db.getCollection<T>(collectionName);
    this.name = collectionName;
  }

  async findOne(query: MongoQuery<T>): Promise<T | null> {
    return this.collection.findOne(query.filter || {}, {
      projection: query.projection,
    }) as Promise<T | null>;
  }

  async findById(id: string | ObjectId): Promise<T | null> {
    return this.collection.findOne({ _id: new ObjectId(id) } as any) as Promise<T | null>;
  }

  async findMany(query: MongoQuery<T>): Promise<T[]> {
    return this.collection
      .find(query.filter || {})
      .project(query.projection || {})
      .sort(query.sort || {})
      .skip(query.skip || 0)
      .limit(query.limit || 100)
      .toArray() as Promise<T[]>;
  }

  async findOneAndUpdate(
    filter: Partial<T>,
    update: MongoUpdate<T>,
    options?: { upsert?: boolean; returnDocument?: 'before' | 'after' }
  ): Promise<T | null> {
    const result = await this.collection.findOneAndUpdate(filter as any, update as any, {
      upsert: options?.upsert || false,
      returnDocument: options?.returnDocument || 'after',
    });
    return result;
  }

  async insertOne(doc: T): Promise<string> {
    const result = await this.collection.insertOne(doc as any);
    return result.insertedId.toString();
  }

  async insertMany(docs: T[]): Promise<string[]> {
    const result = await this.collection.insertMany(docs as any);
    return Object.values(result.insertedIds).map((id) => id.toString());
  }

  async updateOne(filter: Partial<T>, update: MongoUpdate<T>): Promise<boolean> {
    const result = await this.collection.updateOne(filter as any, update as any);
    return result.modifiedCount > 0;
  }

  async updateMany(filter: Partial<T>, update: MongoUpdate<T>): Promise<number> {
    const result = await this.collection.updateMany(filter as any, update as any);
    return result.modifiedCount;
  }

  async deleteOne(filter: Partial<T>): Promise<boolean> {
    const result = await this.collection.deleteOne(filter as any);
    return result.deletedCount > 0;
  }

  async deleteMany(filter: Partial<T>): Promise<number> {
    const result = await this.collection.deleteMany(filter as any);
    return result.deletedCount;
  }

  async count(filter?: Partial<T>): Promise<number> {
    return this.collection.countDocuments(filter || {});
  }

  async aggregate(pipeline: any[]): Promise<any[]> {
    return this.collection.aggregate(pipeline).toArray();
  }

  async distinct(field: string, filter?: Partial<T>): Promise<any[]> {
    return this.collection.distinct(field, filter || {});
  }

  async textSearch(query: string, options?: { limit?: number; filter?: Partial<T> }): Promise<T[]> {
    return this.collection
      .find({ $text: { $search: query }, ...options?.filter } as any, {
        projection: { score: { $meta: 'textScore' } },
      })
      .sort({ score: { $meta: 'textScore' } })
      .limit(options?.limit || 100)
      .toArray() as Promise<T[]>;
  }
}

export function createMongoService(config: MongoConfig): MongoDatabase {
  return new MongoDatabase(config);
}
