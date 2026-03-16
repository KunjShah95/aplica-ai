import { Agent } from '../../core/agent.js';
import { AgentOptions } from '../../core/agent.js';
import { ObservabilityData } from '../types.js';
/**
 * Observability Agent - Prometheus, Grafana, Jaeger, anomaly detection
 */
export declare class ObservabilityAgent extends Agent {
    private metrics;
    private alerts;
    private baselines;
    constructor(options: AgentOptions);
    /**
     * Query Prometheus metrics
     */
    queryMetrics(query: string, range?: {
        start: Date;
        end: Date;
        step?: string;
    }): Promise<MetricResult[]>;
    /**
     * Generate sample time series data
     */
    private generateSampleTimeSeries;
    /**
     * Get Grafana dashboard state
     */
    getDashboardState(dashboardId: string): Promise<DashboardState>;
    /**
     * Query Jaeger traces
     */
    queryTraces(service: string, options?: {
        start?: Date;
        end?: Date;
        limit?: number;
        tags?: Record<string, string>;
    }): Promise<Trace[]>;
    /**
     * Detect anomalies in metrics
     */
    detectAnomalies(metricName: string, windowMs?: number): Promise<Anomaly[]>;
    /**
     * Set baseline for anomaly detection
     */
    setBaseline(metricName: string, baseline: Baseline): void;
    /**
     * Get observability data summary
     */
    getObservabilityData(): Promise<ObservabilityData>;
    /**
     * Generate alert
     */
    generateAlert(alert: Alert): void;
    /**
     * Get active alerts
     */
    getAlerts(): Alert[];
    /**
     * Clear alerts
     */
    clearAlerts(): void;
    /**
     * Store metric data
     */
    recordMetric(metricName: string, value: number): void;
}
export interface MetricResult {
    metric: string;
    values: {
        value: number;
        timestamp: Date;
    }[];
    timestamp: Date;
}
export interface DashboardState {
    id: string;
    title: string;
    panels: {
        id: string;
        title: string;
        type: string;
        value: number;
    }[];
    refresh: string;
    lastUpdated: Date;
}
export interface Trace {
    traceId: string;
    spanId: string;
    service: string;
    operation: string;
    startTime: Date;
    duration: number;
    tags: Record<string, string>;
    logs: {
        timestamp: Date;
        message: string;
    }[];
}
export interface Anomaly {
    id: string;
    metric: string;
    value: number;
    expected: number;
    deviation: number;
    timestamp: Date;
    severity: 'high' | 'low';
    type: 'statistical' | 'moderate';
}
export interface Baseline {
    mean: number;
    stdDev: number;
    min: number;
    max: number;
}
export interface Alert {
    id: string;
    type: string;
    metric: string;
    value: number;
    severity: 'high' | 'medium' | 'low';
    message: string;
    timestamp: Date;
}
/**
 * Factory function to create an observability agent
 */
export declare function createObservabilityAgent(options: AgentOptions): ObservabilityAgent;
//# sourceMappingURL=observability-agent.d.ts.map