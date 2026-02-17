export type AuditEventType = 'USER_LOGIN' | 'USER_LOGOUT' | 'USER_LOGIN_FAILED' | 'USER_REGISTERED' | 'PASSWORD_CHANGED' | 'PASSWORD_RESET_REQUESTED' | 'API_KEY_CREATED' | 'API_KEY_REVOKED' | 'SESSION_CREATED' | 'SESSION_REVOKED' | 'CONVERSATION_CREATED' | 'CONVERSATION_DELETED' | 'MEMORY_CREATED' | 'MEMORY_DELETED' | 'TEAM_CREATED' | 'TEAM_DELETED' | 'MEMBER_INVITED' | 'MEMBER_REMOVED' | 'SECURITY_VIOLATION' | 'RATE_LIMIT_EXCEEDED' | 'PERMISSION_DENIED';
export interface AuditLogEntry {
    id?: string;
    userId?: string;
    action: AuditEventType;
    resource: string;
    resourceId?: string;
    details?: Record<string, unknown>;
    ipAddress?: string;
    userAgent?: string;
    status?: string;
    createdAt?: Date;
}
export declare class AuditLogger {
    log(entry: AuditLogEntry): Promise<void>;
    logLogin(userId: string, ipAddress?: string, userAgent?: string, success?: boolean): Promise<void>;
    logLogout(userId: string, ipAddress?: string): Promise<void>;
    logApiKeyAction(userId: string, keyAction: 'CREATED' | 'REVOKED', keyId: string, ipAddress?: string): Promise<void>;
    logSecurityViolation(userId: string | undefined, violationType: string, details: Record<string, unknown>, ipAddress?: string): Promise<void>;
    logRateLimitExceeded(ipAddress: string, endpoint: string): Promise<void>;
    getAuditLogs(filters: {
        userId?: string;
        action?: AuditEventType;
        resource?: string;
        startDate?: Date;
        endDate?: Date;
        limit?: number;
        offset?: number;
    }): Promise<AuditLogEntry[]>;
}
export declare const auditLogger: AuditLogger;
//# sourceMappingURL=audit.d.ts.map