export class RateLimiter {
    store = new Map();
    config;
    cleanupInterval;
    constructor(config) {
        this.config = {
            windowMs: config.windowMs,
            maxRequests: config.maxRequests,
            keyGenerator: config.keyGenerator || ((req) => req.ip || 'unknown'),
            skipSuccessfulRequests: config.skipSuccessfulRequests || false,
            skipFailedRequests: config.skipFailedRequests || false,
            onLimitReached: config.onLimitReached || (() => { }),
        };
        this.cleanupInterval = setInterval(() => this.cleanup(), 60000);
    }
    check(key) {
        const now = Date.now();
        const entry = this.store.get(key);
        if (!entry || entry.resetAt <= now) {
            const newEntry = {
                count: 1,
                resetAt: now + this.config.windowMs,
            };
            this.store.set(key, newEntry);
            return {
                allowed: true,
                info: {
                    limit: this.config.maxRequests,
                    remaining: this.config.maxRequests - 1,
                    resetTime: new Date(newEntry.resetAt),
                },
            };
        }
        const remaining = this.config.maxRequests - entry.count;
        const allowed = entry.count < this.config.maxRequests;
        if (allowed) {
            entry.count++;
        }
        else {
            this.config.onLimitReached(key);
        }
        return {
            allowed,
            info: {
                limit: this.config.maxRequests,
                remaining: Math.max(0, remaining - (allowed ? 1 : 0)),
                resetTime: new Date(entry.resetAt),
            },
        };
    }
    reset(key) {
        this.store.delete(key);
    }
    cleanup() {
        const now = Date.now();
        for (const [key, entry] of this.store) {
            if (entry.resetAt <= now) {
                this.store.delete(key);
            }
        }
    }
    destroy() {
        clearInterval(this.cleanupInterval);
        this.store.clear();
    }
}
export function createRateLimitMiddleware(config) {
    const limiter = new RateLimiter(config);
    return (req, res, next) => {
        const key = config.keyGenerator?.(req) || req.ip || 'unknown';
        const { allowed, info } = limiter.check(key);
        res.setHeader('X-RateLimit-Limit', info.limit);
        res.setHeader('X-RateLimit-Remaining', info.remaining);
        res.setHeader('X-RateLimit-Reset', Math.ceil(info.resetTime.getTime() / 1000));
        if (!allowed) {
            res.status(429).json({
                error: 'Too many requests',
                retryAfter: Math.ceil((info.resetTime.getTime() - Date.now()) / 1000),
            });
            return;
        }
        next();
    };
}
export const defaultRateLimiter = new RateLimiter({
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW || '60000'),
    maxRequests: parseInt(process.env.RATE_LIMIT_MAX || '100'),
});
export const authRateLimiter = new RateLimiter({
    windowMs: parseInt(process.env.AUTH_RATE_LIMIT_WINDOW || '900000'),
    maxRequests: parseInt(process.env.AUTH_RATE_LIMIT_MAX || '5'),
});
export const apiRateLimiter = createRateLimitMiddleware({
    windowMs: 60000,
    maxRequests: 100,
    keyGenerator: (req) => {
        return req.user?.id || req.headers['x-api-key'] || req.ip || 'unknown';
    },
});
export const strictRateLimiter = createRateLimitMiddleware({
    windowMs: 900000,
    maxRequests: 10,
    keyGenerator: (req) => req.ip || 'unknown',
});
//# sourceMappingURL=rate-limit.js.map