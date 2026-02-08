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
export declare class RateLimiter {
    private config;
    private store;
    private cleanupInterval;
    constructor(config: RateLimitConfig);
    check(identifier: string): RateLimitResult;
    consume(identifier: string, tokens?: number): RateLimitResult;
    reset(identifier: string): void;
    getStatus(identifier: string): RateLimitResult;
    private cleanup;
    destroy(): void;
}
export declare class SlidingWindowRateLimiter {
    private config;
    private store;
    private cleanupInterval;
    constructor(config: RateLimitConfig);
    check(identifier: string): RateLimitResult;
    private cleanup;
    destroy(): void;
}
export declare class TokenBucketRateLimiter {
    private buckets;
    private maxTokens;
    private refillRate;
    private refillInterval;
    constructor(maxTokens: number, refillRate: number, refillIntervalMs?: number);
    consume(identifier: string, tokens?: number): RateLimitResult;
}
export declare const defaultRateLimiter: RateLimiter;
export declare const apiRateLimiter: RateLimiter;
export declare const authRateLimiter: RateLimiter;
//# sourceMappingURL=rate-limit.d.ts.map