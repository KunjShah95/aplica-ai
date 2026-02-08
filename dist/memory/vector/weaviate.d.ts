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
    query(vector?: number[], nearText?: {
        concepts: string[];
    }, where?: Record<string, unknown>, limit?: number): Promise<WeaviateSearchResult[]>;
    getClassSchema(): Promise<unknown>;
}
export interface SearchOptions {
    limit?: number;
    offset?: number;
    where?: Record<string, unknown>;
    sort?: string[];
    includeVector?: boolean;
}
export declare class WeaviateVectorStore implements WeaviateStore {
    private client;
    private className;
    constructor(config: WeaviateConfig);
    initialize(): Promise<void>;
    add(documents: WeaviateDocument[]): Promise<string[]>;
    search(query: string | number[], options?: SearchOptions): Promise<WeaviateSearchResult[]>;
    query(vector?: number[], nearText?: {
        concepts: string[];
    }, where?: Record<string, unknown>, limit?: number): Promise<WeaviateSearchResult[]>;
    delete(ids: string[]): Promise<void>;
    getClassSchema(): Promise<unknown>;
    private createClass;
    batchAdd(documents: WeaviateDocument[]): Promise<string[]>;
    fetchById(id: string): Promise<WeaviateSearchResult | null>;
    update(id: string, content: string, metadata?: Record<string, unknown>): Promise<void>;
    getStats(): Promise<{
        totalCount: number;
    }>;
    createBackup(backupId: string): Promise<void>;
}
//# sourceMappingURL=weaviate.d.ts.map