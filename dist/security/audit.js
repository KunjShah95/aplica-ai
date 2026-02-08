import * as fs from 'fs';
import * as path from 'path';
import { randomUUID } from 'crypto';
export class AuditLogger {
    directory;
    maxFileSize;
    retentionDays;
    enableEncryption;
    sensitiveFields;
    currentFile = null;
    writeStream = null;
    eventBuffer = [];
    flushInterval = null;
    constructor(options = {}) {
        this.directory = options.directory || './logs/audit';
        this.maxFileSize = options.maxFileSize || 10 * 1024 * 1024;
        this.retentionDays = options.retentionDays || 90;
        this.enableEncryption = options.enableEncryption || false;
        this.sensitiveFields = new Set(options.sensitiveFields || [
            'password',
            'token',
            'api_key',
            'secret',
            'credential',
            'email',
            'phone',
            'address',
            'credit_card',
            'card_number',
            'ssn',
        ]);
        this.initialize();
    }
    initialize() {
        if (!fs.existsSync(this.directory)) {
            fs.mkdirSync(this.directory, { recursive: true });
        }
        this.rotateFileIfNeeded();
        this.flushInterval = setInterval(() => {
            this.flushBuffer();
        }, 5000);
    }
    getCurrentFile() {
        const date = new Date().toISOString().split('T')[0];
        return path.join(this.directory, `audit-${date}.jsonl`);
    }
    rotateFileIfNeeded() {
        const filePath = this.getCurrentFile();
        if (this.currentFile === filePath && this.writeStream) {
            const stats = fs.statSync(filePath);
            if (stats.size >= this.maxFileSize) {
                this.writeStream.end();
                const timestamp = Date.now();
                fs.renameSync(filePath, filePath.replace('.jsonl', `-${timestamp}.jsonl.gz`));
                this.writeStream = null;
                this.currentFile = null;
            }
        }
    }
    getWriteStream() {
        const filePath = this.getCurrentFile();
        if (this.currentFile !== filePath || !this.writeStream) {
            this.currentFile = filePath;
            this.writeStream = fs.createWriteStream(filePath, { flags: 'a' });
        }
        return this.writeStream;
    }
    log(event) {
        const fullEvent = {
            ...event,
            id: randomUUID(),
            timestamp: new Date(),
        };
        this.eventBuffer.push(fullEvent);
        if (this.eventBuffer.length >= 100) {
            this.flushBuffer();
        }
        return fullEvent;
    }
    flushBuffer() {
        if (this.eventBuffer.length === 0)
            return;
        const events = this.eventBuffer.splice(0, this.eventBuffer.length);
        const stream = this.getWriteStream();
        for (const event of events) {
            const sanitized = this.sanitizeEvent(event);
            stream.write(JSON.stringify(sanitized) + '\n');
        }
        this.rotateFileIfNeeded();
    }
    sanitizeEvent(event) {
        if (!this.enableEncryption)
            return event;
        const sanitized = { ...event };
        if (sanitized.parameters) {
            sanitized.parameters = this.sanitizeObject(sanitized.parameters);
        }
        if (sanitized.metadata) {
            sanitized.metadata = this.sanitizeObject(sanitized.metadata);
        }
        return sanitized;
    }
    sanitizeObject(obj) {
        const result = {};
        for (const [key, value] of Object.entries(obj)) {
            if (this.sensitiveFields.has(key.toLowerCase())) {
                result[key] = '[REDACTED]';
            }
            else if (typeof value === 'object' && value !== null) {
                result[key] = this.sanitizeObject(value);
            }
            else {
                result[key] = value;
            }
        }
        return result;
    }
    async logCommandExecution(userId, sessionId, command, args, result, output) {
        return this.log({
            type: 'command_execution',
            severity: result === 'failure' ? 'high' : 'medium',
            userId,
            sessionId,
            source: 'shell',
            action: 'execute_command',
            resource: command,
            parameters: { args, outputLength: output?.length },
            result,
        });
    }
    async logFileAccess(userId, sessionId, filePath, operation, result) {
        return this.log({
            type: 'file_access',
            severity: operation === 'delete' ? 'high' : 'medium',
            userId,
            sessionId,
            source: 'filesystem',
            action: `${operation}_file`,
            resource: filePath,
            result,
        });
    }
    async logBrowserAction(userId, sessionId, url, action, result) {
        return this.log({
            type: 'browser_action',
            severity: 'low',
            userId,
            sessionId,
            source: 'browser',
            action,
            resource: url,
            result,
        });
    }
    async logAuthentication(userId, sessionId, method, result, ipAddress) {
        return this.log({
            type: 'authentication',
            severity: result === 'failure' ? 'high' : 'low',
            userId,
            sessionId,
            source: 'auth',
            action: `authenticate_${method}`,
            result,
            ipAddress,
            metadata: { method },
        });
    }
    async logAuthorization(userId, sessionId, resource, action, result) {
        return this.log({
            type: 'authorization',
            severity: result === 'failure' ? 'high' : 'low',
            userId,
            sessionId,
            source: 'auth',
            action,
            resource,
            result,
        });
    }
    async logToolCall(userId, sessionId, toolName, parameters, result) {
        return this.log({
            type: 'tool_call',
            severity: 'medium',
            userId,
            sessionId,
            source: 'skills',
            action: `call_tool_${toolName}`,
            parameters,
            result,
        });
    }
    async logError(userId, sessionId, error, context) {
        return this.log({
            type: 'error',
            severity: 'high',
            userId,
            sessionId,
            source: 'system',
            action: 'error_occurred',
            parameters: context,
            result: 'failure',
            errorMessage: error.message,
        });
    }
    async search(query) {
        const results = [];
        const files = this.getLogFiles();
        for (const file of files) {
            if (query.startDate || query.endDate) {
                const fileDate = this.getFileDate(file);
                if (query.startDate && fileDate < query.startDate)
                    continue;
                if (query.endDate && fileDate > query.endDate)
                    continue;
            }
            const content = fs.readFileSync(file, 'utf-8');
            const lines = content.split('\n').filter(Boolean);
            for (const line of lines) {
                try {
                    const event = JSON.parse(line);
                    if (query.userId && event.userId !== query.userId)
                        continue;
                    if (query.type && event.type !== query.type)
                        continue;
                    if (query.severity && event.severity !== query.severity)
                        continue;
                    if (query.result && event.result !== query.result)
                        continue;
                    results.push(event);
                }
                catch {
                }
            }
        }
        return results
            .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
            .slice(0, query.limit || 100);
    }
    async getStats() {
        const now = new Date();
        const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        const events = await this.search({ startDate: sevenDaysAgo, limit: 10000 });
        const byType = {};
        const bySeverity = {};
        const byResult = {};
        for (const event of events) {
            byType[event.type] = (byType[event.type] || 0) + 1;
            bySeverity[event.severity] = (bySeverity[event.severity] || 0) + 1;
            byResult[event.result] = (byResult[event.result] || 0) + 1;
        }
        const recentCritical = events.filter((e) => e.severity === 'critical').slice(0, 10);
        return {
            totalEvents: events.length,
            byType,
            bySeverity,
            byResult,
            recentCritical,
            timeRange: { start: sevenDaysAgo, end: now },
        };
    }
    getLogFiles() {
        if (!fs.existsSync(this.directory))
            return [];
        return fs
            .readdirSync(this.directory)
            .filter((f) => f.startsWith('audit-') && f.endsWith('.jsonl'))
            .map((f) => path.join(this.directory, f))
            .sort((a, b) => b.localeCompare(a));
    }
    getFileDate(filePath) {
        const match = path.basename(filePath).match(/audit-(\d{4}-\d{2}-\d{2})/);
        if (match) {
            return new Date(match[1]);
        }
        return new Date();
    }
    async cleanup() {
        const cutoff = new Date(Date.now() - this.retentionDays * 24 * 60 * 60 * 1000);
        const files = this.getLogFiles();
        for (const file of files) {
            const fileDate = this.getFileDate(file);
            if (fileDate < cutoff) {
                fs.unlinkSync(file);
                console.log(`Cleaned up old audit log: ${path.basename(file)}`);
            }
        }
    }
    async export(format = 'json', query) {
        const events = await this.search({ ...query, limit: 100000 });
        if (format === 'csv') {
            const headers = Object.keys(events[0] || {}).join(',');
            const rows = events.map((e) => Object.values(e)
                .map((v) => (typeof v === 'string' && v.includes(',') ? `"${v}"` : v))
                .join(','));
            return [headers, ...rows].join('\n');
        }
        return JSON.stringify(events, null, 2);
    }
    async close() {
        if (this.flushInterval) {
            clearInterval(this.flushInterval);
        }
        this.flushBuffer();
        if (this.writeStream) {
            this.writeStream.end();
        }
    }
}
export const auditLogger = new AuditLogger();
//# sourceMappingURL=audit.js.map