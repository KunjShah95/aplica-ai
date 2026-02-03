import { describe, it, expect, beforeEach } from 'vitest';
import { RateLimiter } from '../src/middleware/rate-limit.js';

describe('RateLimiter', () => {
    let limiter: RateLimiter;

    beforeEach(() => {
        limiter = new RateLimiter({
            windowMs: 1000,
            maxRequests: 3,
        });
    });

    it('should allow requests within limit', () => {
        const result1 = limiter.check('test-key');
        expect(result1.allowed).toBe(true);
        expect(result1.info.remaining).toBe(2);

        const result2 = limiter.check('test-key');
        expect(result2.allowed).toBe(true);
        expect(result2.info.remaining).toBe(1);

        const result3 = limiter.check('test-key');
        expect(result3.allowed).toBe(true);
        expect(result3.info.remaining).toBe(0);
    });

    it('should block requests over limit', () => {
        limiter.check('test-key');
        limiter.check('test-key');
        limiter.check('test-key');

        const result = limiter.check('test-key');
        expect(result.allowed).toBe(false);
        expect(result.info.remaining).toBe(0);
    });

    it('should track separate keys independently', () => {
        limiter.check('key-1');
        limiter.check('key-1');
        limiter.check('key-1');

        const result1 = limiter.check('key-1');
        expect(result1.allowed).toBe(false);

        const result2 = limiter.check('key-2');
        expect(result2.allowed).toBe(true);
        expect(result2.info.remaining).toBe(2);
    });

    it('should reset after window expires', async () => {
        limiter.check('test-key');
        limiter.check('test-key');
        limiter.check('test-key');

        const blocked = limiter.check('test-key');
        expect(blocked.allowed).toBe(false);

        await new Promise((resolve) => setTimeout(resolve, 1100));

        const allowed = limiter.check('test-key');
        expect(allowed.allowed).toBe(true);
        expect(allowed.info.remaining).toBe(2);
    });

    it('should call onLimitReached when limit exceeded', () => {
        let calledWith: string | null = null;

        const limiterWithCallback = new RateLimiter({
            windowMs: 1000,
            maxRequests: 1,
            onLimitReached: (key) => {
                calledWith = key;
            },
        });

        limiterWithCallback.check('callback-test');
        limiterWithCallback.check('callback-test');

        expect(calledWith).toBe('callback-test');
    });

    it('should reset specific key', () => {
        limiter.check('reset-test');
        limiter.check('reset-test');
        limiter.check('reset-test');

        const beforeReset = limiter.check('reset-test');
        expect(beforeReset.allowed).toBe(false);

        limiter.reset('reset-test');

        const afterReset = limiter.check('reset-test');
        expect(afterReset.allowed).toBe(true);
        expect(afterReset.info.remaining).toBe(2);
    });
});
