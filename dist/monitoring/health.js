export class HealthService {
    checks = new Map();
    version;
    startTime;
    constructor(version = '1.0.0') {
        this.version = version;
        this.startTime = new Date();
        this.registerDefaultChecks();
    }
    registerDefaultChecks() {
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
    register(check) {
        this.checks.set(check.name, check);
    }
    unregister(name) {
        this.checks.delete(name);
    }
    async check() {
        const results = {};
        let overallHealthy = true;
        let anyDegraded = false;
        for (const [name, healthCheck] of this.checks) {
            const start = Date.now();
            try {
                const result = await Promise.race([
                    healthCheck.check(),
                    new Promise((_, reject) => setTimeout(() => reject(new Error('Health check timeout')), 5000)),
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
            }
            catch (error) {
                results[name] = {
                    healthy: false,
                    message: error instanceof Error ? error.message : 'Check failed',
                    duration: Date.now() - start,
                };
                overallHealthy = false;
            }
        }
        let status = 'healthy';
        if (!overallHealthy) {
            status = 'unhealthy';
        }
        else if (anyDegraded) {
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
    async isHealthy() {
        const status = await this.check();
        return status.status === 'healthy';
    }
    async liveness() {
        return { alive: true };
    }
    async readiness() {
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
export const healthService = new HealthService(process.env.npm_package_version || '1.0.0');
export function registerDatabaseHealthCheck(checkFn) {
    healthService.register({
        name: 'database',
        check: async () => {
            try {
                const connected = await checkFn();
                return {
                    healthy: connected,
                    message: connected ? undefined : 'Database connection failed',
                };
            }
            catch (error) {
                return {
                    healthy: false,
                    message: error instanceof Error ? error.message : 'Database check failed',
                };
            }
        },
    });
}
export function registerRedisHealthCheck(checkFn) {
    healthService.register({
        name: 'redis',
        check: async () => {
            try {
                const connected = await checkFn();
                return {
                    healthy: connected,
                    message: connected ? undefined : 'Redis connection failed',
                };
            }
            catch (error) {
                return {
                    healthy: false,
                    message: error instanceof Error ? error.message : 'Redis check failed',
                };
            }
        },
    });
}
//# sourceMappingURL=health.js.map