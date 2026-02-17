import { randomUUID } from 'crypto';

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
  hybridWeights?: { semantic: number; keyword: number };
}

export class RAGEvaluator {
  private config: RAGEvaluationConfig;

  constructor(config?: Partial<RAGEvaluationConfig>) {
    this.config = {
      retrievalK: config?.retrievalK || 10,
      faithfulnessThreshold: config?.faithfulnessThreshold || 0.7,
      relevanceThreshold: config?.relevanceThreshold || 0.5,
      useGroundTruth: config?.useGroundTruth ?? false,
      hybridWeights: config?.hybridWeights || { semantic: 0.7, keyword: 0.3 },
    };
  }

  async evaluateRetrieval(
    query: string,
    expectedDocIds: string[],
    retrievedDocs: Array<{ id: string; content: string; score: number }>
  ): Promise<RetrievalMetric> {
    const retrievedDocIds = retrievedDocs.slice(0, this.config.retrievalK).map((d) => d.id);

    const truePositives = retrievedDocIds.filter((id) => expectedDocIds.includes(id)).length;
    const precision = retrievedDocIds.length > 0 ? truePositives / retrievedDocIds.length : 0;
    const recall = expectedDocIds.length > 0 ? truePositives / expectedDocIds.length : 0;
    const f1 = precision + recall > 0 ? (2 * (precision * recall)) / (precision + recall) : 0;

    const mrr = this.calculateMRR(expectedDocIds, retrievedDocIds);
    const ndcg = this.calculateNDCG(expectedDocIds, retrievedDocs);

    return {
      query,
      expectedDocIds,
      retrievedDocIds,
      scores: {
        precision: Math.round(precision * 100) / 100,
        recall: Math.round(recall * 100) / 100,
        f1: Math.round(f1 * 100) / 100,
        mrr: Math.round(mrr * 100) / 100,
        ndcg: Math.round(ndcg * 100) / 100,
      },
    };
  }

  private calculateMRR(expectedIds: string[], retrievedIds: string[]): number {
    for (let i = 0; i < retrievedIds.length; i++) {
      if (expectedIds.includes(retrievedIds[i])) {
        return 1 / (i + 1);
      }
    }
    return 0;
  }

  private calculateNDCG(
    expectedIds: string[],
    retrievedDocs: Array<{ id: string; score: number }>
  ): number {
    let dcg = 0;
    for (let i = 0; i < retrievedDocs.length; i++) {
      const rel = expectedIds.includes(retrievedDocs[i].id) ? 1 : 0;
      dcg += rel / Math.log2(i + 2);
    }

    let idcg = 0;
    const numRelevant = Math.min(expectedIds.length, retrievedDocs.length);
    for (let i = 0; i < numRelevant; i++) {
      idcg += 1 / Math.log2(i + 2);
    }

    return idcg > 0 ? dcg / idcg : 0;
  }

  async evaluateGeneration(
    query: string,
    response: string,
    context: string[],
    expectedAnswer?: string
  ): Promise<GenerationMetric> {
    const contextTexts = context.join(' ');

    const faithfulness = await this.calculateFaithfulness(response, contextTexts);
    const answerRelevance = await this.calculateAnswerRelevance(query, response);
    const contextPrecision = this.calculateContextPrecision(response, context);
    const groundedness = this.calculateGroundedness(response, context);

    const hallucinations = await this.detectHallucinations(response, contextTexts, query);

    return {
      query,
      response,
      context,
      expectedAnswer,
      scores: {
        faithfulness: Math.round(faithfulness * 100) / 100,
        answerRelevance: Math.round(answerRelevance * 100) / 100,
        contextPrecision: Math.round(contextPrecision * 100) / 100,
        groundedness: Math.round(groundedness * 100) / 100,
      },
      hallucinations,
    };
  }

  private async calculateFaithfulness(response: string, context: string): Promise<number> {
    const responseSentences = response.split(/[.!?]+/).filter((s) => s.trim().length > 10);
    let faithfulCount = 0;

    for (const sentence of responseSentences) {
      const isSupported = this.isSentenceSupported(sentence, context);
      if (isSupported) faithfulCount++;
    }

    return responseSentences.length > 0 ? faithfulCount / responseSentences.length : 1;
  }

  private isSentenceSupported(sentence: string, context: string): boolean {
    const sentenceLower = sentence.toLowerCase();
    const contextLower = context.toLowerCase();

    const keywords = sentenceLower.split(/\s+/).filter((w) => w.length > 4);
    const matchingKeywords = keywords.filter((k) => contextLower.includes(k));

    return matchingKeywords.length >= keywords.length * 0.5;
  }

  private async calculateAnswerRelevance(query: string, response: string): Promise<number> {
    const queryKeywords = new Set(
      query
        .toLowerCase()
        .split(/\s+/)
        .filter((w) => w.length > 3)
    );
    const responseKeywords = new Set(
      response
        .toLowerCase()
        .split(/\s+/)
        .filter((w) => w.length > 3)
    );

    let matches = 0;
    for (const keyword of queryKeywords) {
      if (responseKeywords.has(keyword)) matches++;
    }

    return queryKeywords.size > 0 ? matches / queryKeywords.size : 1;
  }

  private calculateContextPrecision(response: string, context: string[]): number {
    const responseLower = response.toLowerCase();
    let referencedContexts = 0;

    for (const ctx of context) {
      const ctxKeywords = ctx.split(/\s+/).filter((w) => w.length > 5);
      const matches = ctxKeywords.filter((k) => responseLower.includes(k.toLowerCase()));
      if (matches.length >= 3) referencedContexts++;
    }

    return context.length > 0 ? referencedContexts / context.length : 0;
  }

  private calculateGroundedness(response: string, context: string[]): number {
    const responseLower = response.toLowerCase();
    const allContext = context.join(' ').toLowerCase();

    const entities = this.extractEntities(responseLower);
    let groundedEntities = 0;

    for (const entity of entities) {
      if (allContext.includes(entity)) groundedEntities++;
    }

    return entities.length > 0 ? groundedEntities / entities.length : 1;
  }

  private extractEntities(text: string): string[] {
    const entities: string[] = [];
    const patterns = [
      /\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)+\b/g,
      /\b\d+(?:\.\d+)?\s*(?:percent|%|years?|days?|months?)\b/gi,
      /\b(?:https?:\/\/|www\.)\S+/g,
    ];

    for (const pattern of patterns) {
      const matches = text.match(pattern);
      if (matches) entities.push(...matches);
    }

    return entities;
  }

  private async detectHallucinations(
    response: string,
    context: string,
    query: string
  ): Promise<HallucinationResult[]> {
    const hallucinations: HallucinationResult[] = [];
    const responseLower = response.toLowerCase();
    const contextLower = context.toLowerCase();

    const numericPatterns = [
      /(\d+(?:\.\d+)?)\s*(percent|%|years?|days?|months?|hours?|minutes?)/gi,
      /(\d+)\s+times/gi,
      /(\$\d+(?:,\d{3})*(?:\.\d{2})?)/g,
    ];

    for (const pattern of numericPatterns) {
      const matches = [...response.matchAll(pattern)];
      for (const match of matches) {
        const value = match[0];
        if (!contextLower.includes(value.toLowerCase()) && !contextLower.includes(match[1])) {
          hallucinations.push({
            segment: value,
            type: 'fabrication',
            severity: 'high',
            evidence: 'not found in context',
          });
        }
      }
    }

    const quotePattern = /"([^"]+)"/g;
    let quoteMatch;
    while ((quoteMatch = quotePattern.exec(response)) !== null) {
      const quote = quoteMatch[1];
      if (!contextLower.includes(quote.toLowerCase())) {
        hallucinations.push({
          segment: quote,
          type: 'attribution',
          severity: 'high',
          evidence: 'Quoted text not found in context',
        });
      }
    }

    const entityPatterns = [
      /(?:CEO|CTO|CFO|president|director|founder)\s+of\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/g,
      /(?:based in|located in|headquartered in)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/g,
    ];

    for (const pattern of entityPatterns) {
      let match;
      while ((match = pattern.exec(response)) !== null) {
        const entity = match[1];
        if (!contextLower.includes(entity.toLowerCase())) {
          hallucinations.push({
            segment: match[0],
            type: 'attribution',
            severity: 'medium',
            evidence: `Entity "${entity}" not found in context`,
          });
        }
      }
    }

    return hallucinations;
  }

  async fullEvaluation(
    query: string,
    expectedDocIds: string[],
    retrievedDocs: Array<{ id: string; content: string; score: number }>,
    response: string,
    context: string[],
    expectedAnswer?: string
  ): Promise<RAGEvaluationResult> {
    const retrieval = await this.evaluateRetrieval(query, expectedDocIds, retrievedDocs);
    const generation = await this.evaluateGeneration(query, response, context, expectedAnswer);

    const weights = {
      retrieval: 0.4,
      generation: 0.6,
    };

    const retrievalScore =
      retrieval.scores.precision * 0.3 +
      retrieval.scores.recall * 0.3 +
      retrieval.scores.ndcg * 0.2 +
      retrieval.scores.mrr * 0.2;

    const generationScore =
      generation.scores.faithfulness * 0.4 +
      generation.scores.answerRelevance * 0.2 +
      generation.scores.contextPrecision * 0.2 +
      generation.scores.groundedness * 0.2;

    const ragScore = retrievalScore * weights.retrieval + generationScore * weights.generation;

    const highSeverityHallucinations = generation.hallucinations.filter(
      (h) => h.severity === 'high'
    );
    const hasMajorIssues =
      retrievalScore < 0.5 || generationScore < 0.5 || highSeverityHallucinations.length > 0;

    let qualityGrade: 'excellent' | 'good' | 'fair' | 'poor';
    if (ragScore >= 0.85 && !hasMajorIssues) {
      qualityGrade = 'excellent';
    } else if (ragScore >= 0.7) {
      qualityGrade = 'good';
    } else if (ragScore >= 0.5) {
      qualityGrade = 'fair';
    } else {
      qualityGrade = 'poor';
    }

    const recommendations: string[] = [];
    if (retrieval.scores.precision < 0.6) {
      recommendations.push('Improve retrieval precision - reduce irrelevant document retrieval');
    }
    if (retrieval.scores.recall < 0.6) {
      recommendations.push('Improve retrieval recall - add more relevant documents to index');
    }
    if (generation.scores.faithfulness < 0.7) {
      recommendations.push('Improve faithfulness - ensure response is grounded in context');
    }
    if (generation.hallucinations.length > 0) {
      recommendations.push(`Address ${generation.hallucinations.length} hallucination(s) detected`);
    }

    return {
      retrieval,
      generation,
      overall: {
        ragScore: Math.round(ragScore * 100) / 100,
        qualityGrade,
        recommendations,
      },
    };
  }

  getThresholds(): { faithfulness: number; relevance: number; precision: number } {
    return {
      faithfulness: this.config.faithfulnessThreshold,
      relevance: this.config.relevanceThreshold,
      precision: 0.6,
    };
  }

  setThresholds(config: Partial<RAGEvaluationConfig>): void {
    if (config.faithfulnessThreshold)
      this.config.faithfulnessThreshold = config.faithfulnessThreshold;
    if (config.relevanceThreshold) this.config.relevanceThreshold = config.relevanceThreshold;
    if (config.retrievalK) this.config.retrievalK = config.retrievalK;
  }
}

export class RAGBenchmark {
  private evaluator: RAGEvaluator;
  private benchmarkQueries: Array<{
    query: string;
    expectedDocIds: string[];
    expectedAnswer?: string;
  }> = [];

  constructor(config?: Partial<RAGEvaluationConfig>) {
    this.evaluator = new RAGEvaluator(config);
  }

  addBenchmarkCase(query: string, expectedDocIds: string[], expectedAnswer?: string): void {
    this.benchmarkQueries.push({ query, expectedDocIds, expectedAnswer });
  }

  async runBenchmark(
    retrievalFn: (query: string) => Promise<Array<{ id: string; content: string; score: number }>>,
    generationFn: (query: string, context: string[]) => Promise<string>
  ): Promise<{
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
  }> {
    const results: RAGEvaluationResult[] = [];

    for (const benchmarkCase of this.benchmarkQueries) {
      const retrievedDocs = await retrievalFn(benchmarkCase.query);
      const context = retrievedDocs.map((d) => d.content);
      const response = await generationFn(benchmarkCase.query, context);

      const result = await this.evaluator.fullEvaluation(
        benchmarkCase.query,
        benchmarkCase.expectedDocIds,
        retrievedDocs,
        response,
        context,
        benchmarkCase.expectedAnswer
      );

      results.push(result);
    }

    const avgPrecision =
      results.reduce((sum, r) => sum + r.retrieval.scores.precision, 0) / results.length;
    const avgRecall =
      results.reduce((sum, r) => sum + r.retrieval.scores.recall, 0) / results.length;
    const avgNDCG = results.reduce((sum, r) => sum + r.retrieval.scores.ndcg, 0) / results.length;
    const avgFaithfulness =
      results.reduce((sum, r) => sum + r.generation.scores.faithfulness, 0) / results.length;
    const avgRelevance =
      results.reduce((sum, r) => sum + r.generation.scores.answerRelevance, 0) / results.length;
    const hallucinationCount = results.reduce(
      (sum, r) => sum + r.generation.hallucinations.length,
      0
    );

    return {
      totalTests: this.benchmarkQueries.length,
      averageScore: results.reduce((sum, r) => sum + r.overall.ragScore, 0) / results.length,
      retrievalMetrics: {
        avgPrecision: Math.round(avgPrecision * 100) / 100,
        avgRecall: Math.round(avgRecall * 100) / 100,
        avgNDCG: Math.round(avgNDCG * 100) / 100,
      },
      generationMetrics: {
        avgFaithfulness: Math.round(avgFaithfulness * 100) / 100,
        avgRelevance: Math.round(avgRelevance * 100) / 100,
      },
      hallucinationCount,
      results,
    };
  }
}

export const ragEvaluator = new RAGEvaluator();
