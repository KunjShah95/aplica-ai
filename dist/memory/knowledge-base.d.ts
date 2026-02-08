import { Prisma } from '@prisma/client';
import { DocumentSourceType } from '../types/prisma-types.js';
import { EmbeddingProvider } from './embeddings.js';
export interface CreateKnowledgeBaseInput {
    workspaceId: string;
    name: string;
    description?: string;
    settings?: Record<string, unknown>;
}
export interface AddDocumentInput {
    knowledgeBaseId: string;
    title: string;
    content: string;
    source?: string;
    sourceType: DocumentSourceType;
    metadata?: Record<string, unknown>;
}
export interface KnowledgeSearchResult {
    documentId: string;
    chunkId: string;
    title: string;
    content: string;
    similarity: number;
    metadata: Record<string, unknown>;
}
export declare class KnowledgeBaseService {
    private embeddingProvider?;
    constructor(embeddingProvider?: EmbeddingProvider);
    setEmbeddingProvider(provider: EmbeddingProvider): void;
    create(input: CreateKnowledgeBaseInput): Promise<{
        name: string;
        description: string | null;
        id: string;
        createdAt: Date;
        settings: Prisma.JsonValue;
        updatedAt: Date;
        workspaceId: string;
    }>;
    list(workspaceId: string): Promise<({
        _count: {
            documents: number;
        };
    } & {
        name: string;
        description: string | null;
        id: string;
        createdAt: Date;
        settings: Prisma.JsonValue;
        updatedAt: Date;
        workspaceId: string;
    })[]>;
    addDocument(input: AddDocumentInput): Promise<{
        id: string;
        content: string;
        source: string | null;
        status: import(".prisma/client").$Enums.DocumentStatus;
        createdAt: Date;
        title: string;
        updatedAt: Date;
        metadata: Prisma.JsonValue;
        sourceType: import(".prisma/client").$Enums.DocumentSourceType;
        errorMessage: string | null;
        knowledgeBaseId: string;
    }>;
    private processDocument;
    private chunkText;
    search(knowledgeBaseId: string, query: string, limit?: number): Promise<KnowledgeSearchResult[]>;
    searchMultiple(knowledgeBaseIds: string[], query: string, limit?: number): Promise<KnowledgeSearchResult[]>;
    deleteDocument(documentId: string): Promise<void>;
    deleteKnowledgeBase(id: string): Promise<void>;
    getStats(knowledgeBaseId: string): Promise<{
        knowledgeBase: {
            name: string;
            description: string | null;
            id: string;
            createdAt: Date;
            settings: Prisma.JsonValue;
            updatedAt: Date;
            workspaceId: string;
        } | null;
        documentCount: number;
        chunkCount: number;
        statusCounts: any;
    }>;
}
export declare const knowledgeBaseService: KnowledgeBaseService;
//# sourceMappingURL=knowledge-base.d.ts.map