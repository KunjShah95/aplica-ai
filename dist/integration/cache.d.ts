export interface CacheConfig {
    url?: string;
    host?: string;
    port?: number;
    password?: string;
    db?: number;
    keyPrefix?: string;
    maxRetriesPerRequest?: number;
    enableReadyCheck?: boolean;
    lazyConnect?: boolean;
}
export interface CacheOptions {
    ttl?: number;
    nx?: boolean;
    xx?: boolean;
}
export interface RateLimitConfig {
    windowMs: number;
    maxRequests: number;
    keyPrefix?: string;
}
export declare class RedisCache {
    private client;
    private config;
    private keyPrefix;
    constructor(config: CacheConfig);
    connect(): Promise<void>;
    disconnect(): Promise<void>;
    private prefixKey;
    get<T>(key: string): Promise<T | null>;
    set(key: string, value: any, options?: CacheOptions): Promise<void>;
    delete(key: string): Promise<void>;
    deletePattern(pattern: string): Promise<number>;
    exists(key: string): Promise<boolean>;
    expire(key: string, ttl: number): Promise<boolean>;
    ttl(key: string): Promise<number>;
    increment(key: string): Promise<number>;
    incrementBy(key: string, amount: number): Promise<number>;
    decrement(key: string): Promise<number>;
    hashGet<T>(key: string, field: string): Promise<T | null>;
    hashSet(key: string, field: string, value: any): Promise<void>;
    hashSetMany(key: string, data: Record<string, any>): Promise<void>;
    hashGetAll<T>(key: string): Promise<Record<string, T>>;
    hashDelete(key: string, field: string): Promise<boolean>;
    listPush(key: string, value: any): Promise<number>;
    listRange(key: string, start: number, stop: number): Promise<string[]>;
    listLength(key: string): Promise<number>;
    setAdd(key: string, ...values: any[]): Promise<number>;
    setMembers(key: string): Promise<string[]>;
    setIsMember(key: string, value: any): Promise<boolean>;
    sortedSetAdd(key: string, score: number, member: any): Promise<number>;
    sortedSetRangeByScore<T>(key: string, min: number | string, max: number | string, options?: {
        withScores?: boolean;
        offset?: number;
        count?: number;
    }): Promise<T[]>;
    checkRateLimit(config: RateLimitConfig, identifier: string): Promise<{
        allowed: boolean;
        remaining: number;
        resetTime: number;
    }>;
    publish(channel: string, message: any): Promise<number>;
    subscribe(channel: string, callback: (message: any, channel: string) => void): Promise<void>;
    ping(): Promise<boolean>;
    getStats(): Promise<{
        usedMemory: string;
        connectedClients: number;
        uptime: number;
        keys: number;
    }>;
}
export declare function createCacheService(config: CacheConfig): RedisCache;
//# sourceMappingURL=cache.d.ts.map