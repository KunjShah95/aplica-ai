import { db } from '../../db/index.js';

export type AuditEventType =
  | 'USER_LOGIN'
  | 'USER_LOGOUT'
  | 'USER_LOGIN_FAILED'
  | 'USER_REGISTERED'
  | 'PASSWORD_CHANGED'
  | 'PASSWORD_RESET_REQUESTED'
  | 'API_KEY_CREATED'
  | 'API_KEY_REVOKED'
  | 'SESSION_CREATED'
  | 'SESSION_REVOKED'
  | 'CONVERSATION_CREATED'
  | 'CONVERSATION_DELETED'
  | 'MEMORY_CREATED'
  | 'MEMORY_DELETED'
  | 'TEAM_CREATED'
  | 'TEAM_DELETED'
  | 'MEMBER_INVITED'
  | 'MEMBER_REMOVED'
  | 'SECURITY_VIOLATION'
  | 'RATE_LIMIT_EXCEEDED'
  | 'PERMISSION_DENIED';

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

export class AuditLogger {
  async log(entry: AuditLogEntry): Promise<void> {
    try {
      await db.auditLog.create({
        data: {
          userId: entry.userId,
          action: entry.action,
          resource: entry.resource,
          resourceId: entry.resourceId,
          details: entry.details as any,
          ipAddress: entry.ipAddress,
          userAgent: entry.userAgent,
          status: entry.status || 'success',
          createdAt: entry.createdAt || new Date(),
        },
      });
    } catch (error) {
      console.error('[Audit] Failed to write audit log:', error);
    }
  }

  async logLogin(
    userId: string,
    ipAddress?: string,
    userAgent?: string,
    success = true
  ): Promise<void> {
    await this.log({
      userId,
      action: success ? 'USER_LOGIN' : 'USER_LOGIN_FAILED',
      resource: 'auth',
      ipAddress,
      userAgent,
      status: success ? 'success' : 'failed',
    });
  }

  async logLogout(userId: string, ipAddress?: string): Promise<void> {
    await this.log({
      userId,
      action: 'USER_LOGOUT',
      resource: 'auth',
      ipAddress,
    });
  }

  async logApiKeyAction(
    userId: string,
    keyAction: 'CREATED' | 'REVOKED',
    keyId: string,
    ipAddress?: string
  ): Promise<void> {
    await this.log({
      userId,
      action: keyAction === 'CREATED' ? 'API_KEY_CREATED' : 'API_KEY_REVOKED',
      resource: 'api_key',
      resourceId: keyId,
      ipAddress,
    });
  }

  async logSecurityViolation(
    userId: string | undefined,
    violationType: string,
    details: Record<string, unknown>,
    ipAddress?: string
  ): Promise<void> {
    await this.log({
      userId,
      action: 'SECURITY_VIOLATION',
      resource: violationType,
      details,
      ipAddress,
      status: 'failed',
    });
    console.warn(
      `[Security] ${violationType} - User: ${userId || 'anonymous'} - IP: ${ipAddress || 'unknown'}`
    );
  }

  async logRateLimitExceeded(ipAddress: string, endpoint: string): Promise<void> {
    await this.log({
      action: 'RATE_LIMIT_EXCEEDED',
      resource: endpoint,
      ipAddress,
      status: 'blocked',
    });
  }

  async getAuditLogs(filters: {
    userId?: string;
    action?: AuditEventType;
    resource?: string;
    startDate?: Date;
    endDate?: Date;
    limit?: number;
    offset?: number;
  }): Promise<AuditLogEntry[]> {
    const where: Record<string, unknown> = {};

    if (filters.userId) where.userId = filters.userId;
    if (filters.action) where.action = filters.action;
    if (filters.resource) where.resource = filters.resource;
    if (filters.startDate || filters.endDate) {
      where.createdAt = {};
      if (filters.startDate) (where.createdAt as Record<string, Date>).gte = filters.startDate;
      if (filters.endDate) (where.createdAt as Record<string, Date>).lte = filters.endDate;
    }

    const logs = await db.auditLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: filters.limit || 50,
      skip: filters.offset || 0,
    });

    return logs.map((log) => ({
      id: log.id,
      userId: log.userId || undefined,
      action: log.action as AuditEventType,
      resource: log.resource,
      resourceId: log.resourceId || undefined,
      details: log.details as Record<string, unknown> | undefined,
      ipAddress: log.ipAddress || undefined,
      userAgent: log.userAgent || undefined,
      status: log.status,
      createdAt: log.createdAt,
    }));
  }
}

export const auditLogger = new AuditLogger();
