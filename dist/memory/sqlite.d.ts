export interface SQLiteMemoryOptions {
    filePath?: string;
    maxEntries?: number;
}
export interface VectorEntry {
    id: string;
    content: string;
    metadata: string;
    embedding?: number[];
    createdAt: string;
    type: string;
}
export interface SearchOptions {
    query: string;
    limit?: number;
    type?: string;
    tags?: string[];
    minScore?: number;
}
export interface SearchResult {
    id: string;
    content: string;
    metadata: Record<string, unknown>;
    score: number;
    type: string;
    createdAt: string;
}
export declare class SQLiteMemory {
    private db;
    private filePath;
    private maxEntries;
    constructor(options?: SQLiteMemoryOptions);
    private initialize;
    add(entry: Omit<VectorEntry, 'createdAt'>): Promise<VectorEntry>;
    get(id: string): Promise<VectorEntry | null>;
    search(options: SearchOptions): Promise<SearchResult[]>;
    searchBySimilarity(embedding: number[], limit?: number): Promise<SearchResult[]>;
    delete(id: string): Promise<boolean>;
    clear(): Promise<void>;
    count(): Promise<number>;
    private parseSearchQuery;
    private parseMetadata;
    private pruneIfNeeded;
    getStats(): Promise<{
        totalEntries: number;
        byType: Record<string, number>;
        tagsCount: number;
        databaseSize: number;
    }>;
    close(): void;
}
export declare const sqliteMemory: SQLiteMemory;
//# sourceMappingURL=sqlite.d.ts.map