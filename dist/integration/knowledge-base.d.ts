export interface CreateKnowledgeBaseInput {
    userId: string;
    workspaceId?: string;
    name: string;
    description?: string;
    settings?: {
        chunkSize?: number;
        chunkOverlap?: number;
        embeddingModel?: string;
    };
}
export interface AddDocumentInput {
    knowledgeBaseId: string;
    title: string;
    content: string;
    source?: string;
    sourceType?: 'TEXT' | 'FILE_UPLOAD' | 'URL' | 'API';
    metadata?: Record<string, unknown>;
}
export interface QueryKnowledgeBaseInput {
    knowledgeBaseId?: string;
    query: string;
    userId: string;
    maxResults?: number;
    minSimilarity?: number;
}
export interface DocumentChunk {
    id: string;
    content: string;
    metadata: Record<string, unknown>;
    embedding?: number[];
}
export declare class KnowledgeBaseService {
    private defaultChunkSize;
    private defaultChunkOverlap;
    create(input: CreateKnowledgeBaseInput): Promise<any>;
    getById(id: string): Promise<any>;
    listByUser(userId: string, workspaceId?: string): Promise<any[]>;
    delete(id: string): Promise<boolean>;
    addDocument(input: AddDocumentInput): Promise<any>;
    getDocument(documentId: string): Promise<any>;
    deleteDocument(documentId: string): Promise<boolean>;
    query(input: QueryKnowledgeBaseInput): Promise<{
        answer: string;
        sources: Array<{
            documentId: string;
            documentTitle: string;
            chunkContent: string;
            similarity: number;
        }>;
    }>;
    private chunkContent;
    getStats(knowledgeBaseId: string): Promise<{
        documentCount: number;
        chunkCount: number;
        indexedChunks: number;
        statusCounts: Record<string, number>;
    }>;
}
export declare const knowledgeBaseService: KnowledgeBaseService;
//# sourceMappingURL=knowledge-base.d.ts.map