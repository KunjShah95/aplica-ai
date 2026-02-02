import * as fs from 'fs';
import * as path from 'path';
import { randomUUID } from 'crypto';

export type AuditEventType =
  | 'authentication'
  | 'authorization'
  | 'command_execution'
  | 'file_access'
  | 'browser_action'
  | 'message_sent'
  | 'tool_call'
  | 'permission_change'
  | 'configuration_change'
  | 'agent_action'
  | 'error'
  | 'session_start'
  | 'session_end';

export interface AuditEvent {
  id: string;
  timestamp: Date;
  type: AuditEventType;
  severity: 'low' | 'medium' | 'high' | 'critical';
  userId: string;
  sessionId: string;
  source: string;
  action: string;
  resource?: string;
  parameters?: Record<string, unknown>;
  result: 'success' | 'failure' | 'partial';
  errorMessage?: string;
  ipAddress?: string;
  userAgent?: string;
  metadata?: Record<string, unknown>;
}

export interface AuditLogOptions {
  directory?: string;
  maxFileSize?: number;
  retentionDays?: number;
  enableEncryption?: boolean;
  sensitiveFields?: string[];
}

export interface AuditStats {
  totalEvents: number;
  byType: Record<AuditEventType, number>;
  bySeverity: Record<string, number>;
  byResult: Record<string, number>;
  recentCritical: AuditEvent[];
  timeRange: { start: Date; end: Date };
}

export class AuditLogger {
  private directory: string;
  private maxFileSize: number;
  private retentionDays: number;
  private enableEncryption: boolean;
  private sensitiveFields: Set<string>;
  private currentFile: string | null = null;
  private writeStream: fs.WriteStream | null = null;
  private eventBuffer: AuditEvent[] = [];
  private flushInterval: NodeJS.Timeout | null = null;

  constructor(options: AuditLogOptions = {}) {
    this.directory = options.directory || './logs/audit';
    this.maxFileSize = options.maxFileSize || 10 * 1024 * 1024;
    this.retentionDays = options.retentionDays || 90;
    this.enableEncryption = options.enableEncryption || false;
    this.sensitiveFields = new Set(
      options.sensitiveFields || ['password', 'token', 'api_key', 'secret', 'credential']
    );

    this.initialize();
  }

  private initialize(): void {
    if (!fs.existsSync(this.directory)) {
      fs.mkdirSync(this.directory, { recursive: true });
    }

    this.rotateFileIfNeeded();

    this.flushInterval = setInterval(() => {
      this.flushBuffer();
    }, 5000);
  }

  private getCurrentFile(): string {
    const date = new Date().toISOString().split('T')[0];
    return path.join(this.directory, `audit-${date}.jsonl`);
  }

  private rotateFileIfNeeded(): void {
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

  private getWriteStream(): fs.WriteStream {
    const filePath = this.getCurrentFile();

    if (this.currentFile !== filePath || !this.writeStream) {
      this.currentFile = filePath;
      this.writeStream = fs.createWriteStream(filePath, { flags: 'a' });
    }

    return this.writeStream;
  }

  log(event: Omit<AuditEvent, 'id' | 'timestamp'>): AuditEvent {
    const fullEvent: AuditEvent = {
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

  private flushBuffer(): void {
    if (this.eventBuffer.length === 0) return;

    const events = this.eventBuffer.splice(0, this.eventBuffer.length);
    const stream = this.getWriteStream();

    for (const event of events) {
      const sanitized = this.sanitizeEvent(event);
      stream.write(JSON.stringify(sanitized) + '\n');
    }

    this.rotateFileIfNeeded();
  }

  private sanitizeEvent(event: AuditEvent): AuditEvent {
    if (!this.enableEncryption) return event;

    const sanitized = { ...event };

    if (sanitized.parameters) {
      sanitized.parameters = this.sanitizeObject(sanitized.parameters);
    }

    if (sanitized.metadata) {
      sanitized.metadata = this.sanitizeObject(sanitized.metadata);
    }

    return sanitized;
  }

  private sanitizeObject(obj: Record<string, unknown>): Record<string, unknown> {
    const result: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(obj)) {
      if (this.sensitiveFields.has(key.toLowerCase())) {
        result[key] = '[REDACTED]';
      } else if (typeof value === 'object' && value !== null) {
        result[key] = this.sanitizeObject(value as Record<string, unknown>);
      } else {
        result[key] = value;
      }
    }

    return result;
  }

  async logCommandExecution(
    userId: string,
    sessionId: string,
    command: string,
    args: string[],
    result: 'success' | 'failure',
    output?: string
  ): Promise<AuditEvent> {
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

  async logFileAccess(
    userId: string,
    sessionId: string,
    filePath: string,
    operation: 'read' | 'write' | 'delete' | 'list',
    result: 'success' | 'failure'
  ): Promise<AuditEvent> {
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

  async logBrowserAction(
    userId: string,
    sessionId: string,
    url: string,
    action: string,
    result: 'success' | 'failure'
  ): Promise<AuditEvent> {
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

  async logAuthentication(
    userId: string,
    sessionId: string,
    method: string,
    result: 'success' | 'failure',
    ipAddress?: string
  ): Promise<AuditEvent> {
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

  async logAuthorization(
    userId: string,
    sessionId: string,
    resource: string,
    action: string,
    result: 'success' | 'failure'
  ): Promise<AuditEvent> {
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

  async logToolCall(
    userId: string,
    sessionId: string,
    toolName: string,
    parameters: Record<string, unknown>,
    result: 'success' | 'failure'
  ): Promise<AuditEvent> {
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

  async logError(
    userId: string,
    sessionId: string,
    error: Error,
    context?: Record<string, unknown>
  ): Promise<AuditEvent> {
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

  async search(query: {
    userId?: string;
    type?: AuditEventType;
    severity?: AuditEvent['severity'];
    result?: AuditEvent['result'];
    startDate?: Date;
    endDate?: Date;
    limit?: number;
  }): Promise<AuditEvent[]> {
    const results: AuditEvent[] = [];
    const files = this.getLogFiles();

    for (const file of files) {
      if (query.startDate || query.endDate) {
        const fileDate = this.getFileDate(file);
        if (query.startDate && fileDate < query.startDate) continue;
        if (query.endDate && fileDate > query.endDate) continue;
      }

      const content = fs.readFileSync(file, 'utf-8');
      const lines = content.split('\n').filter(Boolean);

      for (const line of lines) {
        try {
          const event = JSON.parse(line) as AuditEvent;

          if (query.userId && event.userId !== query.userId) continue;
          if (query.type && event.type !== query.type) continue;
          if (query.severity && event.severity !== query.severity) continue;
          if (query.result && event.result !== query.result) continue;

          results.push(event);
        } catch {
        }
      }
    }

    return results
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, query.limit || 100);
  }

  async getStats(): Promise<AuditStats> {
    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const events = await this.search({ startDate: sevenDaysAgo, limit: 10000 });

    const byType: Record<AuditEventType, number> = {} as Record<AuditEventType, number>;
    const bySeverity: Record<string, number> = {};
    const byResult: Record<string, number> = {};

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

  private getLogFiles(): string[] {
    if (!fs.existsSync(this.directory)) return [];

    return fs
      .readdirSync(this.directory)
      .filter((f) => f.startsWith('audit-') && f.endsWith('.jsonl'))
      .map((f) => path.join(this.directory, f))
      .sort((a, b) => b.localeCompare(a));
  }

  private getFileDate(filePath: string): Date {
    const match = path.basename(filePath).match(/audit-(\d{4}-\d{2}-\d{2})/);
    if (match) {
      return new Date(match[1]);
    }
    return new Date();
  }

  async cleanup(): Promise<void> {
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

  async export(
    format: 'json' | 'csv' = 'json',
    query?: Parameters<typeof this.search>[0]
  ): Promise<string> {
    const events = await this.search({ ...query, limit: 100000 });

    if (format === 'csv') {
      const headers = Object.keys(events[0] || {}).join(',');
      const rows = events.map((e) =>
        Object.values(e)
          .map((v) => (typeof v === 'string' && v.includes(',') ? `"${v}"` : v))
          .join(',')
      );
      return [headers, ...rows].join('\n');
    }

    return JSON.stringify(events, null, 2);
  }

  async close(): Promise<void> {
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
