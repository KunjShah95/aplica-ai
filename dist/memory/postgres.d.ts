import { MemoryType } from '@prisma/client';
export interface EmbeddingProvider {
    embed(text: string): Promise<number[]>;
    embedBatch(texts: string[]): Promise<number[][]>;
}
export interface MemoryInput {
    userId: string;
    type: MemoryType;
    content: string;
    metadata?: Record<string, unknown>;
    tags?: string[];
    importance?: number;
    expiresAt?: Date;
}
export interface MemorySearchOptions {
    userId: string;
    query?: string;
    embedding?: number[];
    type?: MemoryType;
    tags?: string[];
    limit?: number;
    minSimilarity?: number;
}
export interface MemoryResult {
    id: string;
    type: MemoryType;
    content: string;
    metadata: Record<string, unknown>;
    tags: string[];
    importance: number;
    similarity?: number;
    createdAt: Date;
}
export declare class PostgresMemory {
    private embeddingProvider?;
    constructor(embeddingProvider?: EmbeddingProvider);
    setEmbeddingProvider(provider: EmbeddingProvider): void;
    add(input: MemoryInput): Promise<MemoryResult>;
    search(options: MemorySearchOptions): Promise<MemoryResult[]>;
    get(id: string): Promise<MemoryResult | null>;
    update(id: string, data: Partial<{
        content: string;
        metadata: Record<string, unknown>;
        tags: string[];
        importance: number;
    }>): Promise<MemoryResult | null>;
    delete(id: string): Promise<boolean>;
    deleteByUser(userId: string): Promise<number>;
    clear(): Promise<void>;
    recordAccess(id: string): Promise<void>;
    decay(userId: string, decayFactor?: number): Promise<void>;
    prune(userId: string, minImportance?: number): Promise<number>;
    getStats(userId: string): Promise<{
        total: number;
        byType: Record<string, number>;
        avgImportance: number;
    }>;
}
export declare const postgresMemory: PostgresMemory;
//# sourceMappingURL=postgres.d.ts.map