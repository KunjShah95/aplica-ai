export interface RateLimitConfig {
    windowMs: number;
    maxRequests: number;
    keyGenerator?: (req: any) => string;
    skipSuccessfulRequests?: boolean;
    skipFailedRequests?: boolean;
    onLimitReached?: (key: string) => void;
}
export interface RateLimitInfo {
    limit: number;
    remaining: number;
    resetTime: Date;
}
export declare class RateLimiter {
    private store;
    private config;
    private cleanupInterval;
    constructor(config: RateLimitConfig);
    check(key: string): {
        allowed: boolean;
        info: RateLimitInfo;
    };
    reset(key: string): void;
    private cleanup;
    destroy(): void;
}
export declare function createRateLimitMiddleware(config: RateLimitConfig): (req: any, res: any, next: () => void) => void;
export declare const defaultRateLimiter: RateLimiter;
export declare const authRateLimiter: RateLimiter;
export declare const apiRateLimiter: (req: any, res: any, next: () => void) => void;
export declare const strictRateLimiter: (req: any, res: any, next: () => void) => void;
//# sourceMappingURL=rate-limit.d.ts.map