import { db } from '../db/index.js';
import { Prisma } from '@prisma/client';

export interface RecordUsageInput {
    userId?: string;
    apiKeyId?: string;
    endpoint: string;
    method: string;
    statusCode: number;
    tokenCount?: number;
    cost?: number;
    duration: number;
    metadata?: Record<string, unknown>;
}

export interface UsageStats {
    totalRequests: number;
    totalTokens: number;
    totalCost: number;
    avgDuration: number;
    byEndpoint: Record<string, number>;
    byStatus: Record<string, number>;
}

export interface TimeSeriesData {
    date: string;
    requests: number;
    tokens: number;
    cost: number;
}

export class AnalyticsService {
    async recordUsage(input: RecordUsageInput): Promise<void> {
        await db.usageRecord.create({
            data: {
                userId: input.userId,
                apiKeyId: input.apiKeyId,
                endpoint: input.endpoint,
                method: input.method,
                statusCode: input.statusCode,
                tokenCount: input.tokenCount,
                cost: input.cost,
                duration: input.duration,
                metadata: input.metadata as any || {},
            },
        });
    }

    async getUsageStats(
        userId: string,
        startDate: Date,
        endDate: Date
    ): Promise<UsageStats> {
        const [aggregate, byEndpoint, byStatus] = await Promise.all([
            db.usageRecord.aggregate({
                where: {
                    userId,
                    createdAt: { gte: startDate, lte: endDate },
                },
                _count: true,
                _sum: {
                    tokenCount: true,
                    cost: true,
                },
                _avg: {
                    duration: true,
                },
            }),
            db.usageRecord.groupBy({
                by: ['endpoint'],
                where: {
                    userId,
                    createdAt: { gte: startDate, lte: endDate },
                },
                _count: true,
            }),
            db.usageRecord.groupBy({
                by: ['statusCode'],
                where: {
                    userId,
                    createdAt: { gte: startDate, lte: endDate },
                },
                _count: true,
            }),
        ]);

        return {
            totalRequests: aggregate._count,
            totalTokens: aggregate._sum.tokenCount || 0,
            totalCost: aggregate._sum.cost || 0,
            avgDuration: aggregate._avg.duration || 0,
            byEndpoint: Object.fromEntries(byEndpoint.map((e: any) => [e.endpoint, e._count])),
            byStatus: Object.fromEntries(byStatus.map((s: any) => [s.statusCode.toString(), s._count])),
        };
    }

    async getTimeSeries(
        userId: string,
        startDate: Date,
        endDate: Date,
        granularity: 'hour' | 'day' | 'week' = 'day'
    ): Promise<TimeSeriesData[]> {
        const interval = granularity === 'hour' ? '1 hour' : granularity === 'week' ? '1 week' : '1 day';

        const results = await db.$queryRaw<any[]>`
      SELECT 
        date_trunc(${granularity}, "createdAt") as date,
        COUNT(*)::int as requests,
        COALESCE(SUM("tokenCount"), 0)::int as tokens,
        COALESCE(SUM(cost), 0)::float as cost
      FROM "UsageRecord"
      WHERE "userId" = ${userId}
        AND "createdAt" >= ${startDate}
        AND "createdAt" <= ${endDate}
      GROUP BY date_trunc(${granularity}, "createdAt")
      ORDER BY date
    `;

        return results.map((r: any) => ({
            date: r.date.toISOString(),
            requests: r.requests,
            tokens: r.tokens,
            cost: r.cost,
        }));
    }

    async getTopEndpoints(
        userId: string,
        startDate: Date,
        endDate: Date,
        limit: number = 10
    ) {
        const results = await db.usageRecord.groupBy({
            by: ['endpoint'],
            where: {
                userId,
                createdAt: { gte: startDate, lte: endDate },
            },
            _count: true,
            _avg: { duration: true },
            _sum: { tokenCount: true },
            orderBy: { _count: { endpoint: 'desc' } },
            take: limit,
        });

        return results.map((r: any) => ({
            endpoint: r.endpoint,
            requests: r._count,
            avgDuration: r._avg.duration || 0,
            totalTokens: r._sum.tokenCount || 0,
        }));
    }

    async getErrorRate(
        userId: string,
        startDate: Date,
        endDate: Date
    ): Promise<{ total: number; errors: number; rate: number }> {
        const [total, errors] = await Promise.all([
            db.usageRecord.count({
                where: {
                    userId,
                    createdAt: { gte: startDate, lte: endDate },
                },
            }),
            db.usageRecord.count({
                where: {
                    userId,
                    createdAt: { gte: startDate, lte: endDate },
                    statusCode: { gte: 400 },
                },
            }),
        ]);

        return {
            total,
            errors,
            rate: total > 0 ? errors / total : 0,
        };
    }

    async logAudit(data: {
        userId?: string;
        action: string;
        resource: string;
        resourceId?: string;
        details?: Record<string, unknown>;
        ipAddress?: string;
        userAgent?: string;
        status?: string;
    }): Promise<void> {
        await db.auditLog.create({
            data: {
                userId: data.userId,
                action: data.action,
                resource: data.resource,
                resourceId: data.resourceId,
                details: data.details as any || {},
                ipAddress: data.ipAddress,
                userAgent: data.userAgent,
                status: data.status || 'success',
            },
        });
    }

    async getAuditLogs(options: {
        userId?: string;
        action?: string;
        resource?: string;
        startDate?: Date;
        endDate?: Date;
        limit?: number;
        offset?: number;
    }) {
        const { limit = 50, offset = 0, ...filters } = options;

        return db.auditLog.findMany({
            where: {
                userId: filters.userId,
                action: filters.action,
                resource: filters.resource,
                createdAt: {
                    gte: filters.startDate,
                    lte: filters.endDate,
                },
            },
            orderBy: { createdAt: 'desc' },
            take: limit,
            skip: offset,
            include: {
                user: {
                    select: { id: true, username: true, displayName: true },
                },
            },
        });
    }

    async getDashboardStats(userId: string) {
        const now = new Date();
        const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const startOfWeek = new Date(startOfDay);
        startOfWeek.setDate(startOfWeek.getDate() - 7);
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

        const [today, week, month, conversations, memories] = await Promise.all([
            this.getUsageStats(userId, startOfDay, now),
            this.getUsageStats(userId, startOfWeek, now),
            this.getUsageStats(userId, startOfMonth, now),
            db.conversation.count({ where: { userId, isArchived: false } }),
            db.memory.count({ where: { userId } }),
        ]);

        return {
            today,
            week,
            month,
            conversationCount: conversations,
            memoryCount: memories,
        };
    }
}

export const analyticsService = new AnalyticsService();
