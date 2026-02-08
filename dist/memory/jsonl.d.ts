export interface MemoryEntry {
    id: string;
    type: 'conversation' | 'note' | 'preference' | 'fact' | 'context';
    content: string;
    metadata: MemoryMetadata;
    timestamp: Date;
}
export interface MemoryMetadata {
    userId?: string;
    conversationId?: string;
    tags?: string[];
    importance?: number;
    source?: string;
    messageCount?: number;
    [key: string]: unknown;
}
export interface MemorySearchResult {
    id: string;
    score: number;
    entry: MemoryEntry;
}
export interface JSONLStoreOptions {
    directory: string;
    maxEntries?: number;
    maxFileSize?: number;
}
export declare class JSONLStore {
    private directory;
    private maxEntries;
    private maxFileSize;
    private writeStream;
    private currentFileSize;
    private fileIndex;
    constructor(options: JSONLStoreOptions);
    private initialize;
    private getFilePath;
    private rotateFileIfNeeded;
    add(entry: Omit<MemoryEntry, 'id' | 'timestamp'>): Promise<MemoryEntry>;
    get(id: string): Promise<MemoryEntry | null>;
    getAll(): Promise<MemoryEntry[]>;
    search(options: {
        query?: string;
        filter?: Partial<MemoryMetadata>;
        type?: MemoryEntry['type'];
        tags?: string[];
        limit?: number;
        offset?: number;
    }): Promise<MemorySearchResult[]>;
    delete(id: string): Promise<boolean>;
    clear(): Promise<void>;
    private pruneIfNeeded;
    getStats(): Promise<{
        totalEntries: number;
        fileCount: number;
        totalSize: number;
        oldestEntry?: Date;
        newestEntry?: Date;
    }>;
}
export declare const jsonlStore: JSONLStore;
//# sourceMappingURL=jsonl.d.ts.map