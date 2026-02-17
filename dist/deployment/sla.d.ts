import { EventEmitter } from 'events';
export interface SLAConfig {
    uptimeTarget: number;
    responseTimeTarget: number;
    errorRateTarget: number;
    dataRetentionDays: number;
}
export interface SLAMetric {
    timestamp: Date;
    uptime: number;
    avgResponseTime: number;
    errorRate: number;
    requestsTotal: number;
    requestsSuccess: number;
    requestsFailed: number;
}
export interface Incident {
    id: string;
    title: string;
    description: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    status: 'open' | 'investigating' | 'identified' | 'monitoring' | 'resolved';
    startedAt: Date;
    resolvedAt?: Date;
    impact: string;
    affectedComponents: string[];
    timeline: Array<{
        timestamp: Date;
        message: string;
        author: string;
    }>;
}
export interface ComponentStatus {
    name: string;
    status: 'operational' | 'degraded' | 'partial_outage' | 'major_outage';
    uptime24h: number;
    uptime7d: number;
    uptime30d: number;
}
export declare class SLATracker extends EventEmitter {
    private config;
    private metrics;
    private incidents;
    private components;
    private alertThresholds;
    constructor(config?: Partial<SLAConfig>);
    private initializeComponents;
    recordRequest(durationMs: number, success: boolean): void;
    private getHourBucket;
    private checkAlerts;
    private cleanupOldMetrics;
    getCurrentStatus(): {
        uptime: number;
        avgResponseTime: number;
        errorRate: number;
        components: ComponentStatus[];
    };
    private getMetrics24h;
    createIncident(data: {
        title: string;
        description: string;
        severity: Incident['severity'];
        impact: string;
        affectedComponents: string[];
    }): Incident;
    updateIncidentStatus(incidentId: string, status: Incident['status'], message: string, author?: string): void;
    getIncidents(status?: Incident['status']): Incident[];
    getComponentStatus(componentName: string): ComponentStatus | undefined;
    getUptimeReport(): {
        uptime24h: number;
        uptime7d: number;
        uptime30d: number;
        mttr: number;
        incidentCount7d: number;
    };
    private calculateUptime;
    setAlertThresholds(thresholds: {
        responseTime?: number;
        errorRate?: number;
        uptime?: number;
    }): void;
    getSLAStatus(): {
        meetingTarget: boolean;
        metrics: {
            uptime: number;
            responseTime: number;
            errorRate: number;
        };
        target: {
            uptime: number;
            responseTime: number;
            errorRate: number;
        };
    };
}
export declare const slaTracker: SLATracker;
//# sourceMappingURL=sla.d.ts.map