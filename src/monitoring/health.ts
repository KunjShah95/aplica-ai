export interface HealthCheck {
    name: string;
    check: () => Promise<{ healthy: boolean; message?: string; details?: unknown }>;
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

export class HealthService {
    private checks: Map<string, HealthCheck> = new Map();
    private version: string;
    private startTime: Date;

    constructor(version: string = '1.0.0') {
        this.version = version;
        this.startTime = new Date();
        this.registerDefaultChecks();
    }

    private registerDefaultChecks(): void {
        this.register({
            name: 'memory',
            check: async () => {
                const used = process.memoryUsage();
                const heapUsedPercent = (used.heapUsed / used.heapTotal) * 100;

                return {
                    healthy: heapUsedPercent < 90,
                    message: heapUsedPercent >= 90 ? 'High memory usage' : undefined,
                    details: {
                        heapUsed: Math.round(used.heapUsed / 1024 / 1024),
                        heapTotal: Math.round(used.heapTotal / 1024 / 1024),
                        external: Math.round(used.external / 1024 / 1024),
                        rss: Math.round(used.rss / 1024 / 1024),
                    },
                };
            },
        });

        this.register({
            name: 'eventLoop',
            check: async () => {
                return new Promise((resolve) => {
                    const start = Date.now();
                    setImmediate(() => {
                        const lag = Date.now() - start;
                        resolve({
                            healthy: lag < 100,
                            message: lag >= 100 ? `Event loop lag: ${lag}ms` : undefined,
                            details: { lag },
                        });
                    });
                });
            },
        });
    }

    register(check: HealthCheck): void {
        this.checks.set(check.name, check);
    }

    unregister(name: string): void {
        this.checks.delete(name);
    }

    async check(): Promise<HealthStatus> {
        const results: HealthStatus['checks'] = {};
        let overallHealthy = true;
        let anyDegraded = false;

        for (const [name, healthCheck] of this.checks) {
            const start = Date.now();

            try {
                const result = await Promise.race([
                    healthCheck.check(),
                    new Promise<{ healthy: boolean; message: string; details?: unknown }>((_, reject) =>
                        setTimeout(() => reject(new Error('Health check timeout')), 5000)
                    ),
                ]);

                results[name] = {
                    healthy: result.healthy,
                    message: result.message,
                    duration: Date.now() - start,
                    details: result.details,
                };

                if (!result.healthy) {
                    anyDegraded = true;
                }
            } catch (error) {
                results[name] = {
                    healthy: false,
                    message: error instanceof Error ? error.message : 'Check failed',
                    duration: Date.now() - start,
                };
                overallHealthy = false;
            }
        }

        let status: HealthStatus['status'] = 'healthy';
        if (!overallHealthy) {
            status = 'unhealthy';
        } else if (anyDegraded) {
            status = 'degraded';
        }

        return {
            status,
            timestamp: new Date().toISOString(),
            version: this.version,
            uptime: (Date.now() - this.startTime.getTime()) / 1000,
            checks: results,
        };
    }

    async isHealthy(): Promise<boolean> {
        const status = await this.check();
        return status.status === 'healthy';
    }

    async liveness(): Promise<{ alive: boolean }> {
        return { alive: true };
    }

    async readiness(): Promise<{ ready: boolean; checks: string[] }> {
        const status = await this.check();
        const failedChecks = Object.entries(status.checks)
            .filter(([_, v]) => !v.healthy)
            .map(([k]) => k);

        return {
            ready: status.status !== 'unhealthy',
            checks: failedChecks,
        };
    }
}

export const healthService = new HealthService(
    process.env.npm_package_version || '1.0.0'
);

export function registerDatabaseHealthCheck(checkFn: () => Promise<boolean>): void {
    healthService.register({
        name: 'database',
        check: async () => {
            try {
                const connected = await checkFn();
                return {
                    healthy: connected,
                    message: connected ? undefined : 'Database connection failed',
                };
            } catch (error) {
                return {
                    healthy: false,
                    message: error instanceof Error ? error.message : 'Database check failed',
                };
            }
        },
    });
}

export function registerRedisHealthCheck(checkFn: () => Promise<boolean>): void {
    healthService.register({
        name: 'redis',
        check: async () => {
            try {
                const connected = await checkFn();
                return {
                    healthy: connected,
                    message: connected ? undefined : 'Redis connection failed',
                };
            } catch (error) {
                return {
                    healthy: false,
                    message: error instanceof Error ? error.message : 'Redis check failed',
                };
            }
        },
    });
}
