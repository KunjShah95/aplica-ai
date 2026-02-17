export interface RetrievalMetric {
    query: string;
    expectedDocIds: string[];
    retrievedDocIds: string[];
    scores: {
        precision: number;
        recall: number;
        f1: number;
        mrr: number;
        ndcg: number;
    };
}
export interface GenerationMetric {
    query: string;
    response: string;
    context: string[];
    expectedAnswer?: string;
    scores: {
        faithfulness: number;
        answerRelevance: number;
        contextPrecision: number;
        groundedness: number;
    };
    hallucinations: HallucinationResult[];
}
export interface HallucinationResult {
    segment: string;
    type: 'fabrication' | 'attribution' | 'reasoning' | 'context_mismatch';
    severity: 'low' | 'medium' | 'high';
    evidence?: string;
}
export interface RAGEvaluationResult {
    retrieval: RetrievalMetric;
    generation: GenerationMetric;
    overall: {
        ragScore: number;
        qualityGrade: 'excellent' | 'good' | 'fair' | 'poor';
        recommendations: string[];
    };
}
export interface RAGEvaluationConfig {
    retrievalK: number;
    faithfulnessThreshold: number;
    relevanceThreshold: number;
    useGroundTruth: boolean;
    hybridWeights?: {
        semantic: number;
        keyword: number;
    };
}
export declare class RAGEvaluator {
    private config;
    constructor(config?: Partial<RAGEvaluationConfig>);
    evaluateRetrieval(query: string, expectedDocIds: string[], retrievedDocs: Array<{
        id: string;
        content: string;
        score: number;
    }>): Promise<RetrievalMetric>;
    private calculateMRR;
    private calculateNDCG;
    evaluateGeneration(query: string, response: string, context: string[], expectedAnswer?: string): Promise<GenerationMetric>;
    private calculateFaithfulness;
    private isSentenceSupported;
    private calculateAnswerRelevance;
    private calculateContextPrecision;
    private calculateGroundedness;
    private extractEntities;
    private detectHallucinations;
    fullEvaluation(query: string, expectedDocIds: string[], retrievedDocs: Array<{
        id: string;
        content: string;
        score: number;
    }>, response: string, context: string[], expectedAnswer?: string): Promise<RAGEvaluationResult>;
    getThresholds(): {
        faithfulness: number;
        relevance: number;
        precision: number;
    };
    setThresholds(config: Partial<RAGEvaluationConfig>): void;
}
export declare class RAGBenchmark {
    private evaluator;
    private benchmarkQueries;
    constructor(config?: Partial<RAGEvaluationConfig>);
    addBenchmarkCase(query: string, expectedDocIds: string[], expectedAnswer?: string): void;
    runBenchmark(retrievalFn: (query: string) => Promise<Array<{
        id: string;
        content: string;
        score: number;
    }>>, generationFn: (query: string, context: string[]) => Promise<string>): Promise<{
        totalTests: number;
        averageScore: number;
        retrievalMetrics: {
            avgPrecision: number;
            avgRecall: number;
            avgNDCG: number;
        };
        generationMetrics: {
            avgFaithfulness: number;
            avgRelevance: number;
        };
        hallucinationCount: number;
        results: RAGEvaluationResult[];
    }>;
}
export declare const ragEvaluator: RAGEvaluator;
//# sourceMappingURL=rag.d.ts.map