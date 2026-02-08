export interface HealthCheck {
    name: string;
    check: () => Promise<{
        healthy: boolean;
        message?: string;
        details?: unknown;
    }>;
}
export interface HealthStatus {
    status: 'healthy' | 'degraded' | 'unhealthy';
    timestamp: string;
    version: string;
    uptime: number;
    checks: Record<string, {
        healthy: boolean;
        message?: string;
        duration: number;
        details?: unknown;
    }>;
}
export declare class HealthService {
    private checks;
    private version;
    private startTime;
    constructor(version?: string);
    private registerDefaultChecks;
    register(check: HealthCheck): void;
    unregister(name: string): void;
    check(): Promise<HealthStatus>;
    isHealthy(): Promise<boolean>;
    liveness(): Promise<{
        alive: boolean;
    }>;
    readiness(): Promise<{
        ready: boolean;
        checks: string[];
    }>;
}
export declare const healthService: HealthService;
export declare function registerDatabaseHealthCheck(checkFn: () => Promise<boolean>): void;
export declare function registerRedisHealthCheck(checkFn: () => Promise<boolean>): void;
//# sourceMappingURL=health.d.ts.map