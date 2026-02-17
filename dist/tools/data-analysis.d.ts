export interface DataAnalysisResult {
    success: boolean;
    stats?: {
        count?: number;
        sum?: number;
        mean?: number;
        median?: number;
        mode?: number | number[];
        min?: number;
        max?: number;
        range?: number;
        variance?: number;
        stdDev?: number;
        quartiles?: {
            q1: number;
            q2: number;
            q3: number;
        };
        outliers?: number[];
    };
    distribution?: Record<number, number>;
    correlations?: Record<string, number>;
    error?: string;
}
export declare class DataAnalysisTool {
    analyzeNumeric(data: number[]): DataAnalysisResult;
    analyzeCategorical(data: string[]): {
        success: boolean;
        counts?: Record<string, number>;
        percentages?: Record<string, number>;
        unique?: number;
        mostCommon?: {
            value: string;
            count: number;
        };
        error?: string;
    };
    calculateCorrelation(x: number[], y: number[]): number;
    calculatePercentile(data: number[], percentile: number): number;
    private calculateMode;
    detectPatterns(data: number[]): {
        success: boolean;
        trend?: 'increasing' | 'decreasing' | 'stable' | 'volatile';
        seasonality?: number;
        anomalyScore?: number;
        error?: string;
    };
    private calculateVolatility;
    private calculateAnomalyScore;
}
export declare const dataAnalysisTool: DataAnalysisTool;
export default dataAnalysisTool;
//# sourceMappingURL=data-analysis.d.ts.map