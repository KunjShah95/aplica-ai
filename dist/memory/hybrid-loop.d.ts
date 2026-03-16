export interface MemoryQuery {
    query: string;
    userId: string;
    conversationId?: string;
    limit?: number;
    minSimilarity?: number;
}
export interface RetrievedMemory {
    id: string;
    content: string;
    importance: number;
    source: 'retrieve' | 'extract';
    similarity?: number;
    metadata: Record<string, unknown>;
}
export interface ExtractionResult {
    facts: ExtractedFact[];
    entities: ExtractedEntity[];
    patterns: string[];
}
export interface ExtractedFact {
    statement: string;
    confidence: number;
    category: 'preference' | 'fact' | 'context' | 'relationship';
}
export interface ExtractedEntity {
    name: string;
    type: string;
    mentions: number;
    attributes: Record<string, unknown>;
}
export declare class HybridMemoryLoop {
    private retrieveThreshold;
    private extractEnabled;
    private extractionConfidenceThreshold;
    retrieve(options: MemoryQuery): Promise<RetrievedMemory[]>;
    extract(userId: string, content: string): Promise<ExtractionResult>;
    storeExtracted(userId: string, extraction: ExtractionResult): Promise<void>;
    processMessage(userId: string, message: string, conversationId?: string): Promise<{
        retrieved: RetrievedMemory[];
        extraction: ExtractionResult | null;
    }>;
    private calculateRelevance;
    summarizeConversation(userId: string, conversationId: string, messages: string[]): Promise<string>;
}
export declare const hybridMemoryLoop: HybridMemoryLoop;
export declare class MemoryAgent {
    private memoryLoop;
    private contextWindow;
    private maxContextLength;
    constructor(memoryLoop?: HybridMemoryLoop);
    think(userId: string, message: string): Promise<{
        context: string;
        shouldExtract: boolean;
        keyMemories: RetrievedMemory[];
    }>;
    remember(userId: string, query: string): Promise<RetrievedMemory[]>;
}
export declare const memoryAgent: MemoryAgent;
//# sourceMappingURL=hybrid-loop.d.ts.map