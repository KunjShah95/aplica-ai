export type AuditEventType = 'authentication' | 'authorization' | 'command_execution' | 'file_access' | 'browser_action' | 'message_sent' | 'tool_call' | 'permission_change' | 'configuration_change' | 'agent_action' | 'error' | 'session_start' | 'session_end';
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
    timeRange: {
        start: Date;
        end: Date;
    };
}
export declare class AuditLogger {
    private directory;
    private maxFileSize;
    private retentionDays;
    private enableEncryption;
    private sensitiveFields;
    private currentFile;
    private writeStream;
    private eventBuffer;
    private flushInterval;
    constructor(options?: AuditLogOptions);
    private initialize;
    private getCurrentFile;
    private rotateFileIfNeeded;
    private getWriteStream;
    log(event: Omit<AuditEvent, 'id' | 'timestamp'>): AuditEvent;
    private flushBuffer;
    private sanitizeEvent;
    private sanitizeObject;
    logCommandExecution(userId: string, sessionId: string, command: string, args: string[], result: 'success' | 'failure', output?: string): Promise<AuditEvent>;
    logFileAccess(userId: string, sessionId: string, filePath: string, operation: 'read' | 'write' | 'delete' | 'list', result: 'success' | 'failure'): Promise<AuditEvent>;
    logBrowserAction(userId: string, sessionId: string, url: string, action: string, result: 'success' | 'failure'): Promise<AuditEvent>;
    logAuthentication(userId: string, sessionId: string, method: string, result: 'success' | 'failure', ipAddress?: string): Promise<AuditEvent>;
    logAuthorization(userId: string, sessionId: string, resource: string, action: string, result: 'success' | 'failure'): Promise<AuditEvent>;
    logToolCall(userId: string, sessionId: string, toolName: string, parameters: Record<string, unknown>, result: 'success' | 'failure'): Promise<AuditEvent>;
    logError(userId: string, sessionId: string, error: Error, context?: Record<string, unknown>): Promise<AuditEvent>;
    search(query: {
        userId?: string;
        type?: AuditEventType;
        severity?: AuditEvent['severity'];
        result?: AuditEvent['result'];
        startDate?: Date;
        endDate?: Date;
        limit?: number;
    }): Promise<AuditEvent[]>;
    getStats(): Promise<AuditStats>;
    private getLogFiles;
    private getFileDate;
    cleanup(): Promise<void>;
    export(format?: 'json' | 'csv', query?: Parameters<typeof this.search>[0]): Promise<string>;
    close(): Promise<void>;
}
export declare const auditLogger: AuditLogger;
//# sourceMappingURL=audit.d.ts.map