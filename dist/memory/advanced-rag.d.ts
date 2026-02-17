export interface DocumentSource {
    type: 'text' | 'url' | 'file' | 'api' | 'database';
    uri: string;
    metadata?: Record<string, unknown>;
}
export interface ChunkConfig {
    chunkSize: number;
    chunkOverlap: number;
    separator?: string;
}
export interface RAGConfig {
    maxChunks: number;
    similarityThreshold: number;
    rerank: boolean;
    hybridSearch: boolean;
}
export interface RetrievedContext {
    content: string;
    source: string;
    sourceType: string;
    score: number;
    metadata: Record<string, unknown>;
}
export interface MultiSourceRAGOptions {
    sources: DocumentSource[];
    query: string;
    userId: string;
    config?: Partial<RAGConfig>;
}
export declare class AdvancedRAG {
    private embeddingModel;
    private rerankerModel;
    private config;
    constructor(config?: Partial<RAGConfig>);
    initialize(): Promise<void>;
    addDocument(knowledgeBaseId: string, source: DocumentSource, config?: ChunkConfig): Promise<string>;
    private chunkText;
    private splitLongText;
    search(knowledgeBaseId: string, query: string, options?: Partial<RAGConfig>): Promise<RetrievedContext[]>;
    multiSourceSearch(options: MultiSourceRAGOptions): Promise<Map<string, RetrievedContext[]>>;
    globalSearch(userId: string, query: string, options?: Partial<RAGConfig>): Promise<RetrievedContext[]>;
    private vectorSearch;
    private keywordSearch;
    private mergeResults;
    private rerankResults;
    private mergeAndDeduplicate;
    private generateEmbeddings;
    private generateQueryEmbedding;
    private fetchUrl;
    private extractTextFromHtml;
    private readFile;
    getRelevantContext(userId: string, query: string, options?: Partial<RAGConfig>): Promise<string>;
}
export declare const advancedRAG: AdvancedRAG;
//# sourceMappingURL=advanced-rag.d.ts.map