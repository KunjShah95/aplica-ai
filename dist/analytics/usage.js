import { randomUUID } from 'crypto';
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';
export class UsageTracker {
    storagePath;
    sessions = new Map();
    currentSession;
    alerts = new Map();
    limits = [];
    constructor(storagePath = './data/usage') {
        this.storagePath = storagePath;
        this.ensureStorageExists();
        this.loadSessions();
    }
    ensureStorageExists() {
        if (!existsSync(this.storagePath)) {
            mkdirSync(this.storagePath, { recursive: true });
        }
    }
    loadSessions() {
        const sessionsPath = join(this.storagePath, 'sessions.json');
        if (existsSync(sessionsPath)) {
            try {
                const data = JSON.parse(readFileSync(sessionsPath, 'utf-8'));
                for (const session of data) {
                    session.startTime = new Date(session.startTime);
                    if (session.endTime)
                        session.endTime = new Date(session.endTime);
                    this.sessions.set(session.id, session);
                }
            }
            catch (error) {
                console.error('Failed to load usage sessions:', error);
            }
        }
    }
    saveSessions() {
        const sessionsPath = join(this.storagePath, 'sessions.json');
        const data = Array.from(this.sessions.values()).map((s) => ({
            ...s,
            startTime: s.startTime.toISOString(),
            endTime: s.endTime?.toISOString(),
        }));
        writeFileSync(sessionsPath, JSON.stringify(data, null, 2));
    }
    startSession(userId) {
        this.endSession();
        const session = {
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
    endSession() {
        if (!this.currentSession)
            return undefined;
        this.currentSession.endTime = new Date();
        this.saveSessions();
        const session = this.currentSession;
        this.currentSession = undefined;
        return session;
    }
    async record(type, data) {
        const session = this.currentSession || this.startSession(data.userId);
        const record = {
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
    async recordLLM(model, promptTokens, completionTokens, cost, options) {
        return this.record('llm_request', {
            tokens: { prompt: promptTokens, completion: completionTokens },
            cost,
            model,
            userId: options?.userId,
            conversationId: options?.conversationId,
            metadata: options?.metadata,
        });
    }
    async recordAPICall(apiName, cost = 0, options) {
        return this.record('api_call', {
            cost,
            userId: options?.userId,
            metadata: { api: apiName, ...options?.metadata },
        });
    }
    async recordStorage(bytes, operation, options) {
        const cost = bytes * 0.0001;
        return this.record('storage', {
            cost,
            userId: options?.userId,
            metadata: { bytes, operation },
        });
    }
    async recordVoice(seconds, type, options) {
        const cost = type === 'synthesis' ? seconds * 0.01 : seconds * 0.005;
        return this.record(type === 'synthesis' ? 'voice_synthesis' : 'voice_recognition', {
            cost,
            userId: options?.userId,
            metadata: { seconds, type },
        });
    }
    async checkLimits(record) {
        for (const limit of this.limits) {
            if (limit.type !== record.type)
                continue;
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
    getWindowStart(period) {
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
    getUsageInWindow(type, windowStart) {
        let tokens = 0, cost = 0, calls = 0;
        for (const session of this.sessions.values()) {
            for (const record of session.records) {
                if (record.type === type && record.timestamp >= windowStart) {
                    tokens += record.tokens.total;
                    cost += record.cost;
                    if (type === 'llm_request' || type === 'api_call')
                        calls++;
                }
            }
        }
        return { tokens, cost, calls };
    }
    setLimit(limit) {
        this.limits.push(limit);
    }
    clearLimits() {
        this.limits = [];
    }
    createAlert(threshold, percentage) {
        const alert = {
            id: randomUUID(),
            threshold,
            percentage,
            triggered: false,
        };
        this.alerts.set(alert.id, alert);
        return alert;
    }
    async checkAlerts(currentCost) {
        for (const alert of this.alerts.values()) {
            if (currentCost >= alert.threshold && !alert.triggered) {
                alert.triggered = true;
                alert.lastTriggered = new Date();
                console.warn(`Usage alert triggered: ${alert.threshold} cost reached`);
            }
            else if (currentCost < alert.threshold * 0.8) {
                alert.triggered = false;
            }
        }
    }
    getSession(sessionId) {
        if (sessionId) {
            return this.sessions.get(sessionId);
        }
        return this.currentSession;
    }
    getAllSessions() {
        return Array.from(this.sessions.values());
    }
    getSessionStats(sessionId) {
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
    getStats(period) {
        const stats = {
            totalTokens: 0,
            totalCost: 0,
            totalApiCalls: 0,
            byType: {},
        };
        for (const session of this.sessions.values()) {
            for (const record of session.records) {
                if (period && (record.timestamp < period.start || record.timestamp > period.end))
                    continue;
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
    exportCSV(period) {
        const records = [
            'id,type,model,tokens_prompt,tokens_completion,tokens_total,cost,timestamp,userId,conversationId',
        ];
        for (const session of this.sessions.values()) {
            for (const record of session.records) {
                if (period && (record.timestamp < period.start || record.timestamp > period.end))
                    continue;
                records.push(`${record.id},${record.type},${record.model || ''},${record.tokens.prompt},${record.tokens.completion},${record.tokens.total},${record.cost},${record.timestamp.toISOString()},${record.userId || ''},${record.conversationId || ''}`);
            }
        }
        return records.join('\n');
    }
    prune(maxAge = 30 * 24 * 60 * 60 * 1000) {
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
    async usage_get_stats() {
        return usageTracker.getStats();
    },
    async usage_get_session_stats() {
        return usageTracker.getSessionStats();
    },
    async usage_record(data) {
        return usageTracker.record(data.type, {
            tokens: data.tokens ? { total: data.tokens } : undefined,
            cost: data.cost,
            model: data.model,
        });
    },
    async usage_export_csv() {
        return usageTracker.exportCSV();
    },
};
//# sourceMappingURL=usage.js.map