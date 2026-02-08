import { randomUUID } from 'crypto';
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';

export interface UsageRecord {
  id: string;
  type: UsageType;
  userId?: string;
  conversationId?: string;
  model?: string;
  tokens: {
    prompt: number;
    completion: number;
    total: number;
  };
  cost: number;
  timestamp: Date;
  metadata?: Record<string, unknown>;
}

export type UsageType =
  | 'llm_request'
  | 'api_call'
  | 'function_call'
  | 'storage'
  | 'bandwidth'
  | 'compute'
  | 'voice_synthesis'
  | 'voice_recognition'
  | 'image_generation';

export interface UsageSession {
  id: string;
  userId?: string;
  startTime: Date;
  endTime?: Date;
  records: UsageRecord[];
  totals: {
    tokens: number;
    cost: number;
    apiCalls: number;
  };
}

export interface UsageLimit {
  type: UsageType;
  maxTokens?: number;
  maxCost?: number;
  maxCalls?: number;
  period: 'minute' | 'hour' | 'day' | 'week' | 'month';
}

export interface UsageAlert {
  id: string;
  threshold: number;
  percentage: number;
  triggered: boolean;
  lastTriggered?: Date;
}

export class UsageTracker {
  private storagePath: string;
  private sessions: Map<string, UsageSession> = new Map();
  private currentSession?: UsageSession;
  private alerts: Map<string, UsageAlert> = new Map();
  private limits: UsageLimit[] = [];

  constructor(storagePath: string = './data/usage') {
    this.storagePath = storagePath;
    this.ensureStorageExists();
    this.loadSessions();
  }

  private ensureStorageExists(): void {
    if (!existsSync(this.storagePath)) {
      mkdirSync(this.storagePath, { recursive: true });
    }
  }

  private loadSessions(): void {
    const sessionsPath = join(this.storagePath, 'sessions.json');
    if (existsSync(sessionsPath)) {
      try {
        const data = JSON.parse(readFileSync(sessionsPath, 'utf-8'));
        for (const session of data) {
          session.startTime = new Date(session.startTime);
          if (session.endTime) session.endTime = new Date(session.endTime);
          this.sessions.set(session.id, session);
        }
      } catch (error) {
        console.error('Failed to load usage sessions:', error);
      }
    }
  }

  private saveSessions(): void {
    const sessionsPath = join(this.storagePath, 'sessions.json');
    const data = Array.from(this.sessions.values()).map((s) => ({
      ...s,
      startTime: s.startTime.toISOString(),
      endTime: s.endTime?.toISOString(),
    }));
    writeFileSync(sessionsPath, JSON.stringify(data, null, 2));
  }

  startSession(userId?: string): UsageSession {
    this.endSession();

    const session: UsageSession = {
      id: randomUUID(),
      userId,
      startTime: new Date(),
      records: [],
      totals: {
        tokens: 0,
        cost: 0,
        apiCalls: 0,
      },
    };

    this.sessions.set(session.id, session);
    this.currentSession = session;
    this.saveSessions();

    return session;
  }

  endSession(): UsageSession | undefined {
    if (!this.currentSession) return undefined;

    this.currentSession.endTime = new Date();
    this.saveSessions();

    const session = this.currentSession;
    this.currentSession = undefined;
    return session;
  }

  async record(
    type: UsageType,
    data: {
      tokens?: { prompt?: number; completion?: number; total?: number };
      cost?: number;
      model?: string;
      userId?: string;
      conversationId?: string;
      metadata?: Record<string, unknown>;
    }
  ): Promise<UsageRecord> {
    const session = this.currentSession || this.startSession(data.userId);

    const record: UsageRecord = {
      id: randomUUID(),
      type,
      userId: data.userId,
      conversationId: data.conversationId,
      model: data.model,
      tokens: {
        prompt: data.tokens?.prompt || 0,
        completion: data.tokens?.completion || 0,
        total: data.tokens?.total || (data.tokens?.prompt || 0) + (data.tokens?.completion || 0),
      },
      cost: data.cost || 0,
      timestamp: new Date(),
      metadata: data.metadata,
    };

    session.records.push(record);
    session.totals.tokens += record.tokens.total;
    session.totals.cost += record.cost;
    if (type === 'llm_request' || type === 'api_call') {
      session.totals.apiCalls++;
    }

    this.saveSessions();
    await this.checkLimits(record);
    await this.checkAlerts(session.totals.cost);

    return record;
  }

  async recordLLM(
    model: string,
    promptTokens: number,
    completionTokens: number,
    cost: number,
    options?: { userId?: string; conversationId?: string; metadata?: Record<string, unknown> }
  ): Promise<UsageRecord> {
    return this.record('llm_request', {
      tokens: { prompt: promptTokens, completion: completionTokens },
      cost,
      model,
      userId: options?.userId,
      conversationId: options?.conversationId,
      metadata: options?.metadata,
    });
  }

  async recordAPICall(
    apiName: string,
    cost: number = 0,
    options?: { userId?: string; metadata?: Record<string, unknown> }
  ): Promise<UsageRecord> {
    return this.record('api_call', {
      cost,
      userId: options?.userId,
      metadata: { api: apiName, ...options?.metadata },
    });
  }

  async recordStorage(
    bytes: number,
    operation: 'read' | 'write' | 'delete',
    options?: { userId?: string }
  ): Promise<UsageRecord> {
    const cost = bytes * 0.0001;
    return this.record('storage', {
      cost,
      userId: options?.userId,
      metadata: { bytes, operation },
    });
  }

  async recordVoice(
    seconds: number,
    type: 'synthesis' | 'recognition',
    options?: { userId?: string }
  ): Promise<UsageRecord> {
    const cost = type === 'synthesis' ? seconds * 0.01 : seconds * 0.005;
    return this.record(type === 'synthesis' ? 'voice_synthesis' : 'voice_recognition', {
      cost,
      userId: options?.userId,
      metadata: { seconds, type },
    });
  }

  private async checkLimits(record: UsageRecord): Promise<void> {
    for (const limit of this.limits) {
      if (limit.type !== record.type) continue;

      const windowStart = this.getWindowStart(limit.period);
      const usage = this.getUsageInWindow(limit.type, windowStart);

      if (limit.maxTokens && usage.tokens + record.tokens.total > limit.maxTokens) {
        throw new Error(`Token limit exceeded for ${limit.type}`);
      }
      if (limit.maxCost && usage.cost + record.cost > limit.maxCost) {
        throw new Error(`Cost limit exceeded for ${limit.type}`);
      }
      if (limit.maxCalls && usage.calls + 1 > limit.maxCalls) {
        throw new Error(`API call limit exceeded for ${limit.type}`);
      }
    }
  }

  private getWindowStart(period: UsageLimit['period']): Date {
    const now = new Date();
    switch (period) {
      case 'minute':
        return new Date(now.getTime() - 60000);
      case 'hour':
        return new Date(now.getTime() - 3600000);
      case 'day':
        return new Date(now.setHours(0, 0, 0, 0));
      case 'week':
        return new Date(now.setDate(now.getDate() - 7));
      case 'month':
        return new Date(now.setMonth(now.getMonth() - 1));
      default:
        return new Date(0);
    }
  }

  private getUsageInWindow(
    type: UsageType,
    windowStart: Date
  ): { tokens: number; cost: number; calls: number } {
    let tokens = 0,
      cost = 0,
      calls = 0;

    for (const session of this.sessions.values()) {
      for (const record of session.records) {
        if (record.type === type && record.timestamp >= windowStart) {
          tokens += record.tokens.total;
          cost += record.cost;
          if (type === 'llm_request' || type === 'api_call') calls++;
        }
      }
    }

    return { tokens, cost, calls };
  }

  setLimit(limit: UsageLimit): void {
    this.limits.push(limit);
  }

  clearLimits(): void {
    this.limits = [];
  }

  createAlert(threshold: number, percentage: number): UsageAlert {
    const alert: UsageAlert = {
      id: randomUUID(),
      threshold,
      percentage,
      triggered: false,
    };
    this.alerts.set(alert.id, alert);
    return alert;
  }

  private async checkAlerts(currentCost: number): Promise<void> {
    for (const alert of this.alerts.values()) {
      if (currentCost >= alert.threshold && !alert.triggered) {
        alert.triggered = true;
        alert.lastTriggered = new Date();
        console.warn(`Usage alert triggered: ${alert.threshold} cost reached`);
      } else if (currentCost < alert.threshold * 0.8) {
        alert.triggered = false;
      }
    }
  }

  getSession(sessionId?: string): UsageSession | undefined {
    if (sessionId) {
      return this.sessions.get(sessionId);
    }
    return this.currentSession;
  }

  getAllSessions(): UsageSession[] {
    return Array.from(this.sessions.values());
  }

  getSessionStats(sessionId?: string): {
    tokens: number;
    cost: number;
    apiCalls: number;
    duration: number;
    records: number;
  } {
    const session = sessionId ? this.sessions.get(sessionId) : this.currentSession;
    if (!session) {
      return { tokens: 0, cost: 0, apiCalls: 0, duration: 0, records: 0 };
    }

    const duration = session.endTime
      ? session.endTime.getTime() - session.startTime.getTime()
      : Date.now() - session.startTime.getTime();

    return {
      tokens: session.totals.tokens,
      cost: session.totals.cost,
      apiCalls: session.totals.apiCalls,
      duration,
      records: session.records.length,
    };
  }

  getStats(period?: { start: Date; end: Date }): {
    totalTokens: number;
    totalCost: number;
    totalApiCalls: number;
    byType: Record<UsageType, { tokens: number; cost: number; calls: number }>;
  } {
    const stats = {
      totalTokens: 0,
      totalCost: 0,
      totalApiCalls: 0,
      byType: {} as Record<UsageType, { tokens: number; cost: number; calls: number }>,
    };

    for (const session of this.sessions.values()) {
      for (const record of session.records) {
        if (period && (record.timestamp < period.start || record.timestamp > period.end)) continue;

        stats.totalTokens += record.tokens.total;
        stats.totalCost += record.cost;
        if (record.type === 'llm_request' || record.type === 'api_call') {
          stats.totalApiCalls++;
        }

        if (!stats.byType[record.type]) {
          stats.byType[record.type] = { tokens: 0, cost: 0, calls: 0 };
        }
        stats.byType[record.type].tokens += record.tokens.total;
        stats.byType[record.type].cost += record.cost;
        if (record.type === 'llm_request' || record.type === 'api_call') {
          stats.byType[record.type].calls++;
        }
      }
    }

    return stats;
  }

  exportCSV(period?: { start: Date; end: Date }): string {
    const records: string[] = [
      'id,type,model,tokens_prompt,tokens_completion,tokens_total,cost,timestamp,userId,conversationId',
    ];

    for (const session of this.sessions.values()) {
      for (const record of session.records) {
        if (period && (record.timestamp < period.start || record.timestamp > period.end)) continue;

        records.push(
          `${record.id},${record.type},${record.model || ''},${record.tokens.prompt},${record.tokens.completion},${record.tokens.total},${record.cost},${record.timestamp.toISOString()},${record.userId || ''},${record.conversationId || ''}`
        );
      }
    }

    return records.join('\n');
  }

  prune(maxAge: number = 30 * 24 * 60 * 60 * 1000): number {
    const cutoff = new Date(Date.now() - maxAge);
    let removed = 0;

    for (const [sessionId, session] of this.sessions.entries()) {
      if (session.endTime && session.endTime < cutoff) {
        this.sessions.delete(sessionId);
        removed++;
      }
    }

    this.saveSessions();
    return removed;
  }
}

export const usageTracker = new UsageTracker();

export const usageTools = {
  async usage_get_stats(): Promise<ReturnType<typeof usageTracker.getStats>> {
    return usageTracker.getStats();
  },

  async usage_get_session_stats(): Promise<ReturnType<typeof usageTracker.getSessionStats>> {
    return usageTracker.getSessionStats();
  },

  async usage_record(data: {
    type: string;
    tokens?: number;
    cost?: number;
    model?: string;
  }): Promise<UsageRecord> {
    return usageTracker.record(data.type as UsageType, {
      tokens: data.tokens ? { total: data.tokens } : undefined,
      cost: data.cost,
      model: data.model,
    });
  },

  async usage_export_csv(): Promise<string> {
    return usageTracker.exportCSV();
  },
};
