import { Agent } from '../../core/agent.js';
import { AgentOptions } from '../../core/agent.js';
/**
 * Data Analyst Agent - Data analysis, visualization, and narrative generation
 */
export declare class AnalystAgent extends Agent {
    private analysisHistory;
    constructor(options: AgentOptions);
    /**
     * Analyze a dataset
     */
    analyzeData(data: any[], options?: {
        columns?: string[];
        description?: string;
    }): Promise<AnalysisReport>;
    /**
     * Parse and validate data
     */
    private parseData;
    /**
     * Normalize a value for analysis
     */
    private normalizeValue;
    /**
     * Calculate statistics for each column
     */
    private calculateStatistics;
    /**
     * Calculate median
     */
    private median;
    /**
     * Calculate standard deviation
     */
    private stdDev;
    /**
     * Calculate distribution buckets
     */
    private calculateDistribution;
    /**
     * Get top values for categorical column
     */
    private getTopValues;
    /**
     * Generate insights from statistics
     */
    private generateInsights;
    /**
     * Create visualizations
     */
    private createVisualizations;
    /**
     * Generate narrative summary
     */
    private generateNarrative;
    /**
     * Generate summary
     */
    private generateSummary;
    /**
     * Run pandas-style analysis
     */
    runPandasStyleAnalysis(csvData: string, options?: {
        header?: boolean;
        separator?: string;
    }): Promise<AnalysisReport>;
    /**
     * Get analysis history
     */
    getHistory(): AnalysisRecord[];
    /**
     * Get statistics
     */
    getStats(): {
        totalAnalyses: number;
        avgInsightsPerAnalysis: number;
        avgDuration: number;
    };
}
export interface ColumnStatistics {
    type: 'numeric' | 'categorical' | 'empty';
    count: number;
    min?: number;
    max?: number;
    mean?: number;
    median?: number;
    stdDev?: number;
    distribution?: DistributionBucket[];
    uniqueCount?: number;
    topValues?: {
        value: string;
        count: number;
    }[];
}
export interface DistributionBucket {
    range: string;
    count: number;
    percentage: number;
}
export interface Insight {
    id: string;
    column: string;
    type: string;
    title: string;
    description: string;
    implication: string;
}
export interface Visualization {
    id: string;
    type: 'histogram' | 'heatmap' | 'scatter' | 'bar';
    title: string;
    description: string;
    columns?: string[];
    data: any;
}
export interface DatasetInfo {
    rows: number;
    columns: number;
    columnNames: string[];
}
export interface AnalysisReport {
    id: string;
    timestamp: Date;
    description: string;
    datasetInfo: DatasetInfo;
    statistics: Record<string, ColumnStatistics>;
    insights: Insight[];
    visualizations: Visualization[];
    narrative: string;
    summary: string;
    duration: number;
}
export interface AnalysisRecord {
    report: AnalysisReport;
    analyzer: string;
    timestamp: Date;
}
/**
 * Factory function to create an analyst agent
 */
export declare function createAnalystAgent(options: AgentOptions): AnalystAgent;
//# sourceMappingURL=analyst-agent.d.ts.map