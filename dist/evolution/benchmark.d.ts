export interface BenchmarkPrompt {
    id: string;
    input: string;
    expectedKeywords: string[];
    minLength?: number;
    maxLength?: number;
    prohibitedKeywords?: string[];
    evalFn?: (output: string) => number;
}
export interface BenchmarkSuite {
    id: string;
    name: string;
    description: string;
    prompts: BenchmarkPrompt[];
    createdAt: Date;
}
export interface BenchmarkResult {
    promptId: string;
    output: string;
    score: number;
    details: {
        keywordMatches: string[];
        keywordMisses: string[];
        prohibitedHits: string[];
        lengthPenalty: number;
        customScore: number;
    };
}
export interface VariantScore {
    variantId: string;
    totalScore: number;
    results: BenchmarkResult[];
}
export declare class GoldenBenchmark {
    private suites;
    private defaultSuite;
    constructor();
    private initializeDefaultSuite;
    registerSuite(suite: BenchmarkSuite): void;
    getSuite(id: string): BenchmarkSuite | undefined;
    getDefaultSuite(): BenchmarkSuite | null;
    evaluateVariant(variantId: string, prompt: string, executor: (input: string) => Promise<string>): Promise<VariantScore>;
    private evaluateOutput;
    runFullEvaluation(variants: {
        id: string;
        prompt: string;
    }[], executor: (input: string) => Promise<string>): Promise<Map<string, number>>;
    getAllSuites(): BenchmarkSuite[];
}
export declare const goldenBenchmark: GoldenBenchmark;
//# sourceMappingURL=benchmark.d.ts.map