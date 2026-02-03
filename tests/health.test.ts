import { describe, it, expect, beforeEach, vi } from 'vitest';
import { HealthService } from '../src/monitoring/health.js';

describe('HealthService', () => {
    let healthService: HealthService;

    beforeEach(() => {
        healthService = new HealthService('1.0.0');
    });

    describe('check', () => {
        it('should return healthy status by default', async () => {
            const status = await healthService.check();

            expect(status.status).toBe('healthy');
            expect(status.version).toBe('1.0.0');
            expect(status.uptime).toBeGreaterThan(0);
            expect(status.timestamp).toBeDefined();
        });

        it('should include default memory check', async () => {
            const status = await healthService.check();

            expect(status.checks.memory).toBeDefined();
            expect(status.checks.memory.healthy).toBe(true);
            expect(status.checks.memory.details).toHaveProperty('heapUsed');
        });

        it('should include default eventLoop check', async () => {
            const status = await healthService.check();

            expect(status.checks.eventLoop).toBeDefined();
            expect(status.checks.eventLoop.healthy).toBe(true);
        });
    });

    describe('register', () => {
        it('should register custom health checks', async () => {
            healthService.register({
                name: 'custom',
                check: async () => ({
                    healthy: true,
                    message: 'Custom check passed',
                }),
            });

            const status = await healthService.check();

            expect(status.checks.custom).toBeDefined();
            expect(status.checks.custom.healthy).toBe(true);
            expect(status.checks.custom.message).toBe('Custom check passed');
        });

        it('should handle failing health checks', async () => {
            healthService.register({
                name: 'failing',
                check: async () => ({
                    healthy: false,
                    message: 'Service unavailable',
                }),
            });

            const status = await healthService.check();

            expect(status.status).toBe('degraded');
            expect(status.checks.failing.healthy).toBe(false);
        });

        it('should handle throwing health checks', async () => {
            healthService.register({
                name: 'error',
                check: async () => {
                    throw new Error('Check failed');
                },
            });

            const status = await healthService.check();

            expect(status.status).toBe('unhealthy');
            expect(status.checks.error.healthy).toBe(false);
            expect(status.checks.error.message).toBe('Check failed');
        });
    });

    describe('unregister', () => {
        it('should remove registered health checks', async () => {
            healthService.register({
                name: 'temporary',
                check: async () => ({ healthy: true }),
            });

            let status = await healthService.check();
            expect(status.checks.temporary).toBeDefined();

            healthService.unregister('temporary');

            status = await healthService.check();
            expect(status.checks.temporary).toBeUndefined();
        });
    });

    describe('isHealthy', () => {
        it('should return true when all checks pass', async () => {
            const result = await healthService.isHealthy();
            expect(result).toBe(true);
        });

        it('should return false when checks fail', async () => {
            healthService.register({
                name: 'failing',
                check: async () => {
                    throw new Error('Failed');
                },
            });

            const result = await healthService.isHealthy();
            expect(result).toBe(false);
        });
    });

    describe('liveness', () => {
        it('should always return alive', async () => {
            const result = await healthService.liveness();
            expect(result.alive).toBe(true);
        });
    });

    describe('readiness', () => {
        it('should report ready when healthy', async () => {
            const result = await healthService.readiness();

            expect(result.ready).toBe(true);
            expect(result.checks).toHaveLength(0);
        });

        it('should report failed checks', async () => {
            healthService.register({
                name: 'database',
                check: async () => ({ healthy: false }),
            });

            const result = await healthService.readiness();

            expect(result.ready).toBe(true);
            expect(result.checks).toContain('database');
        });
    });
});
