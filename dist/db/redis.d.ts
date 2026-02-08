import type { ClusterNode } from 'ioredis';
import { EventEmitter } from 'events';
export interface RedisConfig {
    host?: string;
    port?: number;
    password?: string;
    db?: number;
    keyPrefix?: string;
    cluster?: {
        nodes: ClusterNode[];
        readWrite?: 'slave' | 'master';
    };
    sentinel?: {
        masterName: string;
        nodes: Array<{
            host: string;
            port: number;
        }>;
    };
}
export interface CacheEntry<T> {
    value: T;
    expiresAt?: number;
    createdAt: number;
}
export interface SessionData {
    id: string;
    userId: string;
    messages: Array<{
        role: string;
        content: string;
        timestamp: number;
    }>;
    workingMemory: Map<string, any>;
    createdAt: number;
    lastAccessed: number;
}
export interface RateLimitInfo {
    limit: number;
    remaining: number;
    resetTime: number;
}
export declare class RedisStore extends EventEmitter {
    private client;
    private keyPrefix;
    private defaultTTL;
    private isConnected;
    constructor(config?: RedisConfig);
    private setupEventHandlers;
    isReady(): Promise<boolean>;
    private key;
    get<T>(key: string): Promise<T | null>;
    set<T>(key: string, value: T, options?: {
        ttl?: number;
        expiresAt?: number;
    }): Promise<void>;
    delete(key: string): Promise<void>;
    exists(key: string): Promise<boolean>;
    expire(key: string, seconds: number): Promise<void>;
    ttl(key: string): Promise<number>;
    keys(pattern: string): Promise<string[]>;
    clear(pattern: string): Promise<number>;
    increment(key: string, amount?: number): Promise<number>;
    getSet<T>(key: string, value: T): Promise<T | null>;
    hget<T>(key: string, field: string): Promise<T | null>;
    hset<T>(key: string, field: string, value: T): Promise<void>;
    hgetall<T>(key: string): Promise<Record<string, T>>;
    hdel(key: string, field: string): Promise<void>;
    zadd(key: string, score: number, member: string): Promise<void>;
    zrange(key: string, start: number, stop: number): Promise<string[]>;
    lpush(key: string, ...values: string[]): Promise<number>;
    lrange(key: string, start: number, stop: number): Promise<string[]>;
    publish(channel: string, message: any): Promise<void>;
    subscribe(channel: string, callback: (message: any) => void): void;
    checkRateLimit(key: string, limit: number, windowSeconds: number): Promise<RateLimitInfo>;
    acquireLock(lockName: string, ttlMs: number, retryIntervalMs?: number, maxRetries?: number): Promise<string | null>;
    releaseLock(lockName: string, lockValue: string): Promise<boolean>;
    close(): Promise<void>;
}
//# sourceMappingURL=redis.d.ts.map