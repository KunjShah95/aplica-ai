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
export declare class AnalyticsService {
    recordUsage(input: RecordUsageInput): Promise<void>;
    getUsageStats(userId: string, startDate: Date, endDate: Date): Promise<UsageStats>;
    getTimeSeries(userId: string, startDate: Date, endDate: Date, granularity?: 'hour' | 'day' | 'week'): Promise<TimeSeriesData[]>;
    getTopEndpoints(userId: string, startDate: Date, endDate: Date, limit?: number): Promise<{
        endpoint: any;
        requests: any;
        avgDuration: any;
        totalTokens: any;
    }[]>;
    getErrorRate(userId: string, startDate: Date, endDate: Date): Promise<{
        total: number;
        errors: number;
        rate: number;
    }>;
    logAudit(data: {
        userId?: string;
        action: string;
        resource: string;
        resourceId?: string;
        details?: Record<string, unknown>;
        ipAddress?: string;
        userAgent?: string;
        status?: string;
    }): Promise<void>;
    getAuditLogs(options: {
        userId?: string;
        action?: string;
        resource?: string;
        startDate?: Date;
        endDate?: Date;
        limit?: number;
        offset?: number;
    }): Promise<({
        user: {
            displayName: string | null;
            username: string;
            id: string;
        } | null;
    } & {
        id: string;
        userId: string | null;
        status: string;
        createdAt: Date;
        details: Prisma.JsonValue;
        ipAddress: string | null;
        action: string;
        resource: string;
        resourceId: string | null;
        userAgent: string | null;
    })[]>;
    getDashboardStats(userId: string): Promise<{
        today: UsageStats;
        week: UsageStats;
        month: UsageStats;
        conversationCount: number;
        memoryCount: number;
    }>;
}
export declare const analyticsService: AnalyticsService;
//# sourceMappingURL=service.d.ts.map