export interface RateLimitConfig {
    windowMs: number;
    maxRequests: number;
    keyGenerator?: (identifier: string) => string;
}

export interface RateLimitResult {
    allowed: boolean;
    remaining: number;
    resetAt: Date;
    retryAfter?: number;
}

interface RateLimitEntry {
    count: number;
    resetAt: number;
}

export class RateLimiter {
    private config: RateLimitConfig;
    private store: Map<string, RateLimitEntry> = new Map();
    private cleanupInterval: ReturnType<typeof setInterval>;

    constructor(config: RateLimitConfig) {
        this.config = {
            windowMs: config.windowMs || 60000,
            maxRequests: config.maxRequests || 100,
            keyGenerator: config.keyGenerator || ((id) => id),
        };

        this.cleanupInterval = setInterval(() => this.cleanup(), this.config.windowMs);
    }

    check(identifier: string): RateLimitResult {
        const key = this.config.keyGenerator!(identifier);
        const now = Date.now();
        const entry = this.store.get(key);

        if (!entry || entry.resetAt <= now) {
            this.store.set(key, {
                count: 1,
                resetAt: now + this.config.windowMs,
            });

            return {
                allowed: true,
                remaining: this.config.maxRequests - 1,
                resetAt: new Date(now + this.config.windowMs),
            };
        }

        if (entry.count >= this.config.maxRequests) {
            const retryAfter = Math.ceil((entry.resetAt - now) / 1000);

            return {
                allowed: false,
                remaining: 0,
                resetAt: new Date(entry.resetAt),
                retryAfter,
            };
        }

        entry.count++;
        this.store.set(key, entry);

        return {
            allowed: true,
            remaining: this.config.maxRequests - entry.count,
            resetAt: new Date(entry.resetAt),
        };
    }

    consume(identifier: string, tokens: number = 1): RateLimitResult {
        const key = this.config.keyGenerator!(identifier);
        const now = Date.now();
        const entry = this.store.get(key);

        if (!entry || entry.resetAt <= now) {
            this.store.set(key, {
                count: tokens,
                resetAt: now + this.config.windowMs,
            });

            return {
                allowed: true,
                remaining: this.config.maxRequests - tokens,
                resetAt: new Date(now + this.config.windowMs),
            };
        }

        if (entry.count + tokens > this.config.maxRequests) {
            return {
                allowed: false,
                remaining: this.config.maxRequests - entry.count,
                resetAt: new Date(entry.resetAt),
                retryAfter: Math.ceil((entry.resetAt - now) / 1000),
            };
        }

        entry.count += tokens;
        this.store.set(key, entry);

        return {
            allowed: true,
            remaining: this.config.maxRequests - entry.count,
            resetAt: new Date(entry.resetAt),
        };
    }

    reset(identifier: string): void {
        const key = this.config.keyGenerator!(identifier);
        this.store.delete(key);
    }

    getStatus(identifier: string): RateLimitResult {
        const key = this.config.keyGenerator!(identifier);
        const now = Date.now();
        const entry = this.store.get(key);

        if (!entry || entry.resetAt <= now) {
            return {
                allowed: true,
                remaining: this.config.maxRequests,
                resetAt: new Date(now + this.config.windowMs),
            };
        }

        return {
            allowed: entry.count < this.config.maxRequests,
            remaining: Math.max(0, this.config.maxRequests - entry.count),
            resetAt: new Date(entry.resetAt),
        };
    }

    private cleanup(): void {
        const now = Date.now();
        for (const [key, entry] of this.store.entries()) {
            if (entry.resetAt <= now) {
                this.store.delete(key);
            }
        }
    }

    destroy(): void {
        clearInterval(this.cleanupInterval);
        this.store.clear();
    }
}

export class SlidingWindowRateLimiter {
    private config: RateLimitConfig;
    private store: Map<string, number[]> = new Map();
    private cleanupInterval: ReturnType<typeof setInterval>;

    constructor(config: RateLimitConfig) {
        this.config = config;
        this.cleanupInterval = setInterval(() => this.cleanup(), config.windowMs);
    }

    check(identifier: string): RateLimitResult {
        const key = this.config.keyGenerator?.(identifier) || identifier;
        const now = Date.now();
        const windowStart = now - this.config.windowMs;

        let timestamps = this.store.get(key) || [];
        timestamps = timestamps.filter(t => t > windowStart);

        if (timestamps.length >= this.config.maxRequests) {
            const oldestInWindow = timestamps[0];
            const retryAfter = Math.ceil((oldestInWindow + this.config.windowMs - now) / 1000);

            return {
                allowed: false,
                remaining: 0,
                resetAt: new Date(oldestInWindow + this.config.windowMs),
                retryAfter,
            };
        }

        timestamps.push(now);
        this.store.set(key, timestamps);

        return {
            allowed: true,
            remaining: this.config.maxRequests - timestamps.length,
            resetAt: new Date(now + this.config.windowMs),
        };
    }

    private cleanup(): void {
        const cutoff = Date.now() - this.config.windowMs;
        for (const [key, timestamps] of this.store.entries()) {
            const filtered = timestamps.filter(t => t > cutoff);
            if (filtered.length === 0) {
                this.store.delete(key);
            } else {
                this.store.set(key, filtered);
            }
        }
    }

    destroy(): void {
        clearInterval(this.cleanupInterval);
        this.store.clear();
    }
}

export class TokenBucketRateLimiter {
    private buckets: Map<string, { tokens: number; lastRefill: number }> = new Map();
    private maxTokens: number;
    private refillRate: number;
    private refillInterval: number;

    constructor(maxTokens: number, refillRate: number, refillIntervalMs: number = 1000) {
        this.maxTokens = maxTokens;
        this.refillRate = refillRate;
        this.refillInterval = refillIntervalMs;
    }

    consume(identifier: string, tokens: number = 1): RateLimitResult {
        const now = Date.now();
        let bucket = this.buckets.get(identifier);

        if (!bucket) {
            bucket = { tokens: this.maxTokens, lastRefill: now };
        } else {
            const elapsed = now - bucket.lastRefill;
            const refills = Math.floor(elapsed / this.refillInterval);
            bucket.tokens = Math.min(this.maxTokens, bucket.tokens + refills * this.refillRate);
            bucket.lastRefill = now;
        }

        if (bucket.tokens < tokens) {
            const tokensNeeded = tokens - bucket.tokens;
            const refillsNeeded = Math.ceil(tokensNeeded / this.refillRate);
            const retryAfter = Math.ceil(refillsNeeded * this.refillInterval / 1000);

            this.buckets.set(identifier, bucket);

            return {
                allowed: false,
                remaining: bucket.tokens,
                resetAt: new Date(now + retryAfter * 1000),
                retryAfter,
            };
        }

        bucket.tokens -= tokens;
        this.buckets.set(identifier, bucket);

        return {
            allowed: true,
            remaining: bucket.tokens,
            resetAt: new Date(now + this.refillInterval),
        };
    }
}

export const defaultRateLimiter = new RateLimiter({
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW || '60000'),
    maxRequests: parseInt(process.env.RATE_LIMIT_MAX || '100'),
});

export const apiRateLimiter = new RateLimiter({
    windowMs: 60000,
    maxRequests: 60,
    keyGenerator: (id) => `api:${id}`,
});

export const authRateLimiter = new RateLimiter({
    windowMs: 900000,
    maxRequests: 5,
    keyGenerator: (id) => `auth:${id}`,
});
