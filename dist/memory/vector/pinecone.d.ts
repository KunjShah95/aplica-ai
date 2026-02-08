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
export declare class PineconeVectorStore implements VectorStore {
    private client;
    private index;
    private indexName;
    constructor(config: PineconeConfig);
    initialize(): Promise<void>;
    upsert(documents: VectorDocument[]): Promise<string[]>;
    search(queryEmbedding: number[], options?: SearchOptions): Promise<SearchResult[]>;
    query(vector: number[], filter?: Record<string, any>, topK?: number): Promise<SearchResult[]>;
    delete(ids: string[]): Promise<void>;
    describeIndex(): Promise<IndexDescription>;
    createIndex(name: string, dimension: number, metric?: 'cosine' | 'euclidean' | 'dotproduct'): Promise<void>;
    deleteIndex(name: string): Promise<void>;
    listIndexes(): Promise<string[]>;
    upsertSingle(document: VectorDocument): Promise<string>;
    fetch(ids: string[]): Promise<VectorDocument[]>;
    update(id: string, embedding: number[], metadata?: Record<string, any>): Promise<void>;
    getStats(): Promise<{
        totalRecordCount: number;
        namespaceRecordCounts: Record<string, number>;
    }>;
}
//# sourceMappingURL=pinecone.d.ts.map