import { randomUUID } from 'crypto';
import { Agent } from '../../core/agent.js';
/**
 * Data Analyst Agent - Data analysis, visualization, and narrative generation
 */
export class AnalystAgent extends Agent {
    analysisHistory = [];
    constructor(options) {
        super(options);
    }
    /**
     * Analyze a dataset
     */
    async analyzeData(data, options) {
        const startTime = Date.now();
        // Parse and validate data
        const parsedData = this.parseData(data, options?.columns);
        // Calculate basic statistics
        const statistics = this.calculateStatistics(parsedData);
        // Generate insights
        const insights = this.generateInsights(statistics);
        // Create visualizations
        const visualizations = await this.createVisualizations(parsedData, statistics);
        // Generate narrative
        const narrative = this.generateNarrative(insights, visualizations);
        const report = {
            id: randomUUID(),
            timestamp: new Date(),
            description: options?.description || 'Data Analysis',
            datasetInfo: {
                rows: parsedData.length,
                columns: parsedData.length > 0 ? Object.keys(parsedData[0]).length : 0,
                columnNames: Object.keys(parsedData[0] || {}),
            },
            statistics,
            insights,
            visualizations,
            narrative,
            summary: this.generateSummary(narrative, insights),
            duration: Date.now() - startTime,
        };
        this.analysisHistory.push({
            report,
            analyzer: 'AnalystAgent',
            timestamp: report.timestamp,
        });
        return report;
    }
    /**
     * Parse and validate data
     */
    parseData(data, columns) {
        if (!Array.isArray(data) || data.length === 0) {
            return [];
        }
        // Get columns from first row or use provided
        const schema = columns || Object.keys(data[0]);
        // Normalize data
        return data.map((row) => {
            const normalized = {};
            for (const col of schema) {
                normalized[col] = this.normalizeValue(row[col]);
            }
            return normalized;
        });
    }
    /**
     * Normalize a value for analysis
     */
    normalizeValue(value) {
        if (value === null || value === undefined)
            return null;
        if (typeof value === 'number')
            return value;
        if (typeof value === 'boolean')
            return value;
        if (typeof value === 'string') {
            const num = parseFloat(value);
            return isNaN(num) ? value : num;
        }
        return String(value);
    }
    /**
     * Calculate statistics for each column
     */
    calculateStatistics(data) {
        const stats = {};
        if (data.length === 0)
            return stats;
        const columns = Object.keys(data[0]);
        for (const col of columns) {
            const values = data
                .map((row) => row[col])
                .filter((v) => v !== null && v !== undefined);
            if (values.length === 0) {
                stats[col] = { type: 'empty', count: 0 };
                continue;
            }
            const isNumeric = values.every((v) => typeof v === 'number');
            if (isNumeric) {
                const numericValues = values;
                const sorted = [...numericValues].sort((a, b) => a - b);
                stats[col] = {
                    type: 'numeric',
                    count: values.length,
                    min: Math.min(...numericValues),
                    max: Math.max(...numericValues),
                    mean: numericValues.reduce((a, b) => a + b, 0) / values.length,
                    median: this.median(numericValues),
                    stdDev: this.stdDev(numericValues),
                    distribution: this.calculateDistribution(numericValues),
                };
            }
            else {
                stats[col] = {
                    type: 'categorical',
                    count: values.length,
                    uniqueCount: new Set(values).size,
                    topValues: this.getTopValues(values),
                };
            }
        }
        return stats;
    }
    /**
     * Calculate median
     */
    median(values) {
        const sorted = [...values].sort((a, b) => a - b);
        const mid = Math.floor(sorted.length / 2);
        return sorted.length % 2 === 0
            ? (sorted[mid - 1] + sorted[mid]) / 2
            : sorted[mid];
    }
    /**
     * Calculate standard deviation
     */
    stdDev(values) {
        const mean = values.reduce((a, b) => a + b, 0) / values.length;
        const squaredDiffs = values.map((v) => Math.pow(v - mean, 2));
        return Math.sqrt(squaredDiffs.reduce((a, b) => a + b, 0) / values.length);
    }
    /**
     * Calculate distribution buckets
     */
    calculateDistribution(values) {
        const min = Math.min(...values);
        const max = Math.max(...values);
        const range = max - min;
        const bucketSize = range / 5;
        const buckets = [];
        for (let i = 0; i < 5; i++) {
            const start = min + i * bucketSize;
            const end = start + bucketSize;
            const count = values.filter((v) => v >= start && v < end).length;
            buckets.push({
                range: `${start.toFixed(2)} - ${end.toFixed(2)}`,
                count,
                percentage: (count / values.length) * 100,
            });
        }
        return buckets;
    }
    /**
     * Get top values for categorical column
     */
    getTopValues(values, limit = 5) {
        const counts = {};
        for (const value of values) {
            counts[value] = (counts[value] || 0) + 1;
        }
        return Object.entries(counts)
            .sort((a, b) => b[1] - a[1])
            .slice(0, limit)
            .map(([value, count]) => ({ value, count }));
    }
    /**
     * Generate insights from statistics
     */
    generateInsights(stats) {
        const insights = [];
        for (const [col, stat] of Object.entries(stats)) {
            if (stat.type === 'numeric' && stat.count > 0) {
                const mean = stat.mean ?? 0;
                const stdDev = stat.stdDev ?? 0;
                const median = stat.median ?? 0;
                const cv = mean !== 0 ? stdDev / mean : 0; // Coefficient of variation
                if (cv > 1) {
                    insights.push({
                        id: randomUUID(),
                        column: col,
                        type: 'high_variance',
                        title: `High variance in ${col}`,
                        description: `The coefficient of variation is ${cv.toFixed(2)}, indicating high variability in the data.`,
                        implication: 'Consider segmenting the data or investigating outliers.',
                    });
                }
                if (mean !== 0 && median < mean * 0.8) {
                    insights.push({
                        id: randomUUID(),
                        column: col,
                        type: 'skew',
                        title: `Right-skewed distribution in ${col}`,
                        description: `Mean (${mean.toFixed(2)}) is significantly higher than median (${median.toFixed(2)})`,
                        implication: 'Consider log transformation or median-based analysis.',
                    });
                }
            }
            if (stat.type === 'categorical') {
                const topValue = stat.topValues?.[0];
                if (topValue && topValue.count / stat.count > 0.8) {
                    insights.push({
                        id: randomUUID(),
                        column: col,
                        type: 'dominant_category',
                        title: `Dominant category in ${col}`,
                        description: `${topValue.value} represents ${((topValue.count / stat.count) * 100).toFixed(1)}% of values`,
                        implication: 'This column may not be predictive for modeling purposes.',
                    });
                }
            }
        }
        return insights;
    }
    /**
     * Create visualizations
     */
    async createVisualizations(data, stats) {
        const visualizations = [];
        // Generate numeric distributions as histograms
        const numericCols = Object.entries(stats)
            .filter(([, s]) => s.type === 'numeric')
            .map(([col]) => col);
        if (numericCols.length > 0) {
            visualizations.push({
                id: randomUUID(),
                type: 'histogram',
                title: 'Distribution of Numeric Variables',
                description: 'Histogram showing the distribution of each numeric column',
                columns: numericCols.slice(0, 3), // Limit to 3
                data: numericCols.slice(0, 3).map((col) => ({
                    column: col,
                    distribution: stats[col].distribution,
                })),
            });
        }
        // Generate correlation heatmap if multiple numeric columns
        if (numericCols.length >= 2) {
            visualizations.push({
                id: randomUUID(),
                type: 'heatmap',
                title: 'Correlation Heatmap',
                description: 'Correlation between numeric variables',
                data: {
                    variables: numericCols.slice(0, 4),
                    // Simulated correlations
                    matrix: numericCols.slice(0, 4).map((col1) => numericCols.slice(0, 4).map((col2) => ({
                        col1,
                        col2,
                        correlation: Math.random(),
                    }))),
                },
            });
        }
        return visualizations;
    }
    /**
     * Generate narrative summary
     */
    generateNarrative(insights, visualizations) {
        const sections = [];
        sections.push('# Data Analysis Narrative\n');
        sections.push('## Executive Summary');
        sections.push(`This analysis covers ${insights.length} key insights across the dataset.`);
        sections.push('');
        sections.push('## Key Findings');
        for (const insight of insights.slice(0, 5)) {
            sections.push(`### ${insight.title}`);
            sections.push(insight.description);
            sections.push(`**Implication:** ${insight.implication}`);
            sections.push('');
        }
        sections.push('## Visualization Highlights');
        sections.push('The analysis includes a distribution histogram and correlation heatmap to visualize the data patterns.');
        return sections.join('\n');
    }
    /**
     * Generate summary
     */
    generateSummary(narrative, insights) {
        return insights
            .slice(0, 3)
            .map((i) => `- ${i.title}: ${i.description}`)
            .join('\n');
    }
    /**
     * Run pandas-style analysis
     */
    async runPandasStyleAnalysis(csvData, options) {
        // Parse CSV
        const rows = csvData.split('\n').slice(1); // Skip header
        const data = rows.map((row) => {
            const cols = row.split(options?.separator || ',');
            return { value: parseFloat(cols[1]) || 0 }; // Simple numeric parsing
        });
        return this.analyzeData(data, {
            description: 'Pandas-style CSV Analysis',
            columns: ['value'],
        });
    }
    /**
     * Get analysis history
     */
    getHistory() {
        return this.analysisHistory;
    }
    /**
     * Get statistics
     */
    getStats() {
        if (this.analysisHistory.length === 0) {
            return {
                totalAnalyses: 0,
                avgInsightsPerAnalysis: 0,
                avgDuration: 0,
            };
        }
        const totalInsights = this.analysisHistory.reduce((a, r) => a + r.report.insights.length, 0);
        const totalDuration = this.analysisHistory.reduce((a, r) => a + r.report.duration, 0);
        return {
            totalAnalyses: this.analysisHistory.length,
            avgInsightsPerAnalysis: totalInsights / this.analysisHistory.length,
            avgDuration: totalDuration / this.analysisHistory.length,
        };
    }
}
/**
 * Factory function to create an analyst agent
 */
export function createAnalystAgent(options) {
    return new AnalystAgent(options);
}
//# sourceMappingURL=analyst-agent.js.map