import { randomUUID } from 'crypto';
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

export class SLATracker extends EventEmitter {
  private config: SLAConfig;
  private metrics: SLAMetric[] = [];
  private incidents: Incident[] = [];
  private components: Map<string, ComponentStatus> = new Map();
  private alertThresholds = {
    responseTime: 1000,
    errorRate: 0.05,
    uptime: 0.99,
  };

  constructor(config?: Partial<SLAConfig>) {
    super();
    this.config = {
      uptimeTarget: config?.uptimeTarget || 0.999,
      responseTimeTarget: config?.responseTimeTarget || 500,
      errorRateTarget: config?.errorRateTarget || 0.01,
      dataRetentionDays: config?.dataRetentionDays || 90,
    };

    this.initializeComponents();
  }

  private initializeComponents(): void {
    const defaultComponents = [
      'API Server',
      'Gateway',
      'Database',
      'Memory Service',
      'LLM Provider',
      'All Messaging Platforms',
    ];

    for (const name of defaultComponents) {
      this.components.set(name, {
        name,
        status: 'operational',
        uptime24h: 100,
        uptime7d: 100,
        uptime30d: 100,
      });
    }
  }

  recordRequest(durationMs: number, success: boolean): void {
    const now = new Date();

    let currentMetric = this.metrics.find(
      (m) => m.timestamp.getTime() === this.getHourBucket(now).getTime()
    );

    if (!currentMetric) {
      currentMetric = {
        timestamp: this.getHourBucket(now),
        uptime: 100,
        avgResponseTime: 0,
        errorRate: 0,
        requestsTotal: 0,
        requestsSuccess: 0,
        requestsFailed: 0,
      };
      this.metrics.push(currentMetric);
    }

    currentMetric.requestsTotal++;
    if (success) {
      currentMetric.requestsSuccess++;
    } else {
      currentMetric.requestsFailed++;
    }

    currentMetric.errorRate = currentMetric.requestsFailed / currentMetric.requestsTotal;

    const totalDuration = currentMetric.avgResponseTime * (currentMetric.requestsTotal - 1);
    currentMetric.avgResponseTime = (totalDuration + durationMs) / currentMetric.requestsTotal;

    this.checkAlerts(durationMs, success);
    this.cleanupOldMetrics();
  }

  private getHourBucket(date: Date): Date {
    const d = new Date(date);
    d.setMinutes(0, 0, 0);
    return d;
  }

  private checkAlerts(durationMs: number, success: boolean): void {
    if (durationMs > this.alertThresholds.responseTime) {
      this.emit('alert', {
        type: 'response_time',
        message: `Response time (${durationMs}ms) exceeds threshold (${this.alertThresholds.responseTime}ms)`,
        severity: durationMs > this.alertThresholds.responseTime * 2 ? 'high' : 'medium',
      });
    }

    if (!success) {
      this.emit('alert', {
        type: 'error',
        message: 'Request failed',
        severity: 'low',
      });
    }
  }

  private cleanupOldMetrics(): void {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - this.config.dataRetentionDays);
    this.metrics = this.metrics.filter((m) => m.timestamp >= cutoff);
  }

  getCurrentStatus(): {
    uptime: number;
    avgResponseTime: number;
    errorRate: number;
    components: ComponentStatus[];
  } {
    const last24h = this.getMetrics24h();

    const totalRequests = last24h.reduce((sum, m) => sum + m.requestsTotal, 0);
    const successfulRequests = last24h.reduce((sum, m) => sum + m.requestsSuccess, 0);
    const uptime = totalRequests > 0 ? successfulRequests / totalRequests : 1;

    const avgResponseTime =
      last24h.length > 0
        ? last24h.reduce((sum, m) => sum + m.avgResponseTime, 0) / last24h.length
        : 0;

    return {
      uptime: Math.round(uptime * 10000) / 100,
      avgResponseTime: Math.round(avgResponseTime),
      errorRate: Math.round((1 - uptime) * 10000) / 100,
      components: Array.from(this.components.values()),
    };
  }

  private getMetrics24h(): SLAMetric[] {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 1);
    return this.metrics.filter((m) => m.timestamp >= cutoff);
  }

  createIncident(data: {
    title: string;
    description: string;
    severity: Incident['severity'];
    impact: string;
    affectedComponents: string[];
  }): Incident {
    const incident: Incident = {
      id: randomUUID(),
      ...data,
      status: 'open',
      startedAt: new Date(),
      timeline: [
        {
          timestamp: new Date(),
          message: 'Incident created',
          author: 'System',
        },
      ],
    };

    this.incidents.push(incident);

    for (const component of data.affectedComponents) {
      const comp = this.components.get(component);
      if (comp) {
        if (data.severity === 'critical' || data.severity === 'high') {
          comp.status = 'major_outage';
        } else {
          comp.status = 'degraded';
        }
      }
    }

    this.emit('incident:created', incident);
    return incident;
  }

  updateIncidentStatus(
    incidentId: string,
    status: Incident['status'],
    message: string,
    author: string = 'System'
  ): void {
    const incident = this.incidents.find((i) => i.id === incidentId);
    if (!incident) return;

    incident.status = status;
    incident.timeline.push({
      timestamp: new Date(),
      message,
      author,
    });

    if (status === 'resolved') {
      incident.resolvedAt = new Date();

      for (const component of incident.affectedComponents) {
        const comp = this.components.get(component);
        if (comp) {
          comp.status = 'operational';
        }
      }
    }

    this.emit('incident:updated', incident);
  }

  getIncidents(status?: Incident['status']): Incident[] {
    if (status) {
      return this.incidents.filter((i) => i.status === status);
    }
    return this.incidents;
  }

  getComponentStatus(componentName: string): ComponentStatus | undefined {
    return this.components.get(componentName);
  }

  getUptimeReport(): {
    uptime24h: number;
    uptime7d: number;
    uptime30d: number;
    mttr: number;
    incidentCount7d: number;
  } {
    const now = new Date();

    const h24 = this.calculateUptime(1);
    const d7 = this.calculateUptime(7);
    const d30 = this.calculateUptime(30);

    const weekAgo = new Date(now);
    weekAgo.setDate(weekAgo.getDate() - 7);
    const recentIncidents = this.incidents.filter(
      (i) => i.startedAt >= weekAgo && i.status !== 'resolved'
    );

    const resolvedIncidents = this.incidents.filter((i) => i.resolvedAt);
    const totalDowntime = resolvedIncidents.reduce((sum, i) => {
      const duration = i.resolvedAt!.getTime() - i.startedAt.getTime();
      return sum + duration;
    }, 0);
    const mttr =
      resolvedIncidents.length > 0 ? totalDowntime / resolvedIncidents.length / 1000 / 60 : 0;

    return {
      uptime24h: Math.round(h24 * 10000) / 100,
      uptime7d: Math.round(d7 * 10000) / 100,
      uptime30d: Math.round(d30 * 10000) / 100,
      mttr: Math.round(mttr),
      incidentCount7d: recentIncidents.length,
    };
  }

  private calculateUptime(days: number): number {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);

    const relevantMetrics = this.metrics.filter((m) => m.timestamp >= cutoff);

    if (relevantMetrics.length === 0) return 1;

    const totalRequests = relevantMetrics.reduce((sum, m) => sum + m.requestsTotal, 0);
    const successfulRequests = relevantMetrics.reduce((sum, m) => sum + m.requestsSuccess, 0);

    return totalRequests > 0 ? successfulRequests / totalRequests : 1;
  }

  setAlertThresholds(thresholds: {
    responseTime?: number;
    errorRate?: number;
    uptime?: number;
  }): void {
    if (thresholds.responseTime) this.alertThresholds.responseTime = thresholds.responseTime;
    if (thresholds.errorRate) this.alertThresholds.errorRate = thresholds.errorRate;
    if (thresholds.uptime) this.alertThresholds.uptime = thresholds.uptime;
  }

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
  } {
    const current = this.getCurrentStatus();
    const meetingTarget =
      current.uptime >= this.config.uptimeTarget * 100 &&
      current.avgResponseTime <= this.config.responseTimeTarget &&
      current.errorRate <= this.config.errorRateTarget * 100;

    return {
      meetingTarget,
      metrics: {
        uptime: current.uptime,
        responseTime: current.avgResponseTime,
        errorRate: current.errorRate,
      },
      target: {
        uptime: this.config.uptimeTarget * 100,
        responseTime: this.config.responseTimeTarget,
        errorRate: this.config.errorRateTarget * 100,
      },
    };
  }
}

export const slaTracker = new SLATracker();
