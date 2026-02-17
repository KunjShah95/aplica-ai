import { db } from '../../db/index.js';
export class AuditLogger {
    async log(entry) {
        try {
            await db.auditLog.create({
                data: {
                    userId: entry.userId,
                    action: entry.action,
                    resource: entry.resource,
                    resourceId: entry.resourceId,
                    details: entry.details,
                    ipAddress: entry.ipAddress,
                    userAgent: entry.userAgent,
                    status: entry.status || 'success',
                    createdAt: entry.createdAt || new Date(),
                },
            });
        }
        catch (error) {
            console.error('[Audit] Failed to write audit log:', error);
        }
    }
    async logLogin(userId, ipAddress, userAgent, success = true) {
        await this.log({
            userId,
            action: success ? 'USER_LOGIN' : 'USER_LOGIN_FAILED',
            resource: 'auth',
            ipAddress,
            userAgent,
            status: success ? 'success' : 'failed',
        });
    }
    async logLogout(userId, ipAddress) {
        await this.log({
            userId,
            action: 'USER_LOGOUT',
            resource: 'auth',
            ipAddress,
        });
    }
    async logApiKeyAction(userId, keyAction, keyId, ipAddress) {
        await this.log({
            userId,
            action: keyAction === 'CREATED' ? 'API_KEY_CREATED' : 'API_KEY_REVOKED',
            resource: 'api_key',
            resourceId: keyId,
            ipAddress,
        });
    }
    async logSecurityViolation(userId, violationType, details, ipAddress) {
        await this.log({
            userId,
            action: 'SECURITY_VIOLATION',
            resource: violationType,
            details,
            ipAddress,
            status: 'failed',
        });
        console.warn(`[Security] ${violationType} - User: ${userId || 'anonymous'} - IP: ${ipAddress || 'unknown'}`);
    }
    async logRateLimitExceeded(ipAddress, endpoint) {
        await this.log({
            action: 'RATE_LIMIT_EXCEEDED',
            resource: endpoint,
            ipAddress,
            status: 'blocked',
        });
    }
    async getAuditLogs(filters) {
        const where = {};
        if (filters.userId)
            where.userId = filters.userId;
        if (filters.action)
            where.action = filters.action;
        if (filters.resource)
            where.resource = filters.resource;
        if (filters.startDate || filters.endDate) {
            where.createdAt = {};
            if (filters.startDate)
                where.createdAt.gte = filters.startDate;
            if (filters.endDate)
                where.createdAt.lte = filters.endDate;
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
            action: log.action,
            resource: log.resource,
            resourceId: log.resourceId || undefined,
            details: log.details,
            ipAddress: log.ipAddress || undefined,
            userAgent: log.userAgent || undefined,
            status: log.status,
            createdAt: log.createdAt,
        }));
    }
}
export const auditLogger = new AuditLogger();
//# sourceMappingURL=audit.js.map