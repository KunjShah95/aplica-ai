export class DataAnalysisTool {
    analyzeNumeric(data) {
        try {
            if (data.length === 0) {
                return { success: false, error: 'Empty data array' };
            }
            const sorted = [...data].sort((a, b) => a - b);
            const n = sorted.length;
            const sum = data.reduce((a, b) => a + b, 0);
            const mean = sum / n;
            const variance = data.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0) / n;
            const stdDev = Math.sqrt(variance);
            const median = n % 2 === 0 ? (sorted[n / 2 - 1] + sorted[n / 2]) / 2 : sorted[Math.floor(n / 2)];
            const mode = this.calculateMode(data);
            const q1Index = Math.floor(n * 0.25);
            const q2Index = Math.floor(n * 0.5);
            const q3Index = Math.floor(n * 0.75);
            const q1 = sorted[q1Index];
            const q2 = sorted[q2Index];
            const q3 = sorted[q3Index];
            const iqr = q3 - q1;
            const lowerBound = q1 - 1.5 * iqr;
            const upperBound = q3 + 1.5 * iqr;
            const outliers = data.filter((x) => x < lowerBound || x > upperBound);
            return {
                success: true,
                stats: {
                    count: n,
                    sum,
                    mean,
                    median,
                    mode,
                    min: sorted[0],
                    max: sorted[n - 1],
                    range: sorted[n - 1] - sorted[0],
                    variance,
                    stdDev,
                    quartiles: { q1, q2, q3 },
                    outliers: outliers.length > 0 ? outliers : undefined,
                },
            };
        }
        catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : String(error),
            };
        }
    }
    analyzeCategorical(data) {
        try {
            const counts = {};
            for (const item of data) {
                counts[item] = (counts[item] || 0) + 1;
            }
            const total = data.length;
            const percentages = {};
            for (const key of Object.keys(counts)) {
                percentages[key] = (counts[key] / total) * 100;
            }
            const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
            return {
                success: true,
                counts,
                percentages,
                unique: Object.keys(counts).length,
                mostCommon: sorted[0] ? { value: sorted[0][0], count: sorted[0][1] } : undefined,
            };
        }
        catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : String(error),
            };
        }
    }
    calculateCorrelation(x, y) {
        if (x.length !== y.length || x.length === 0) {
            return 0;
        }
        const n = x.length;
        const sumX = x.reduce((a, b) => a + b, 0);
        const sumY = y.reduce((a, b) => a + b, 0);
        const sumXY = x.reduce((acc, xi, i) => acc + xi * y[i], 0);
        const sumX2 = x.reduce((acc, xi) => acc + xi * xi, 0);
        const sumY2 = y.reduce((acc, yi) => acc + yi * yi, 0);
        const numerator = n * sumXY - sumX * sumY;
        const denominator = Math.sqrt((n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY));
        return denominator === 0 ? 0 : numerator / denominator;
    }
    calculatePercentile(data, percentile) {
        const sorted = [...data].sort((a, b) => a - b);
        const index = (percentile / 100) * (sorted.length - 1);
        const lower = Math.floor(index);
        const upper = Math.ceil(index);
        const weight = index - lower;
        if (upper >= sorted.length)
            return sorted[sorted.length - 1];
        return sorted[lower] * (1 - weight) + sorted[upper] * weight;
    }
    calculateMode(data) {
        const counts = {};
        for (const num of data) {
            counts[num] = (counts[num] || 0) + 1;
        }
        const maxCount = Math.max(...Object.values(counts));
        const modes = Object.keys(counts)
            .filter((key) => counts[Number(key)] === maxCount)
            .map(Number);
        return modes.length === data.length ? [] : modes;
    }
    detectPatterns(data) {
        try {
            const n = data.length;
            if (n < 3) {
                return { success: false, error: 'Need at least 3 data points' };
            }
            let trendSlope = 0;
            const xMean = (n - 1) / 2;
            const yMean = data.reduce((a, b) => a + b, 0) / n;
            let numerator = 0;
            let denominator = 0;
            for (let i = 0; i < n; i++) {
                numerator += (i - xMean) * (data[i] - yMean);
                denominator += Math.pow(i - xMean, 2);
            }
            trendSlope = denominator === 0 ? 0 : numerator / denominator;
            let trend;
            if (Math.abs(trendSlope) < 0.1) {
                trend = 'stable';
            }
            else if (trendSlope > 0) {
                trend = 'increasing';
            }
            else {
                trend = 'decreasing';
            }
            const volatility = this.calculateVolatility(data);
            if (volatility > 0.5) {
                trend = 'volatile';
            }
            const anomalyScore = this.calculateAnomalyScore(data);
            return {
                success: true,
                trend,
                anomalyScore,
            };
        }
        catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : String(error),
            };
        }
    }
    calculateVolatility(data) {
        const returns = [];
        for (let i = 1; i < data.length; i++) {
            if (data[i - 1] !== 0) {
                returns.push(Math.abs((data[i] - data[i - 1]) / data[i - 1]));
            }
        }
        return returns.length > 0 ? returns.reduce((a, b) => a + b, 0) / returns.length : 0;
    }
    calculateAnomalyScore(data) {
        const mean = data.reduce((a, b) => a + b, 0) / data.length;
        const stdDev = Math.sqrt(data.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0) / data.length);
        const zScores = data.map((val) => Math.abs((val - mean) / (stdDev || 1)));
        return zScores.length > 0 ? Math.max(...zScores) : 0;
    }
}
export const dataAnalysisTool = new DataAnalysisTool();
export default dataAnalysisTool;
//# sourceMappingURL=data-analysis.js.map