import Redis from 'ioredis';

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

export class RedisCache {
  private client: Redis | null = null;
  private config: CacheConfig;
  private keyPrefix: string;

  constructor(config: CacheConfig) {
    this.config = config;
    this.keyPrefix = config.keyPrefix || '';
  }

  async connect(): Promise<void> {
    const options: Redis.RedisOptions = {
      maxRetriesPerRequest: this.config.maxRetriesPerRequest ?? 3,
      enableReadyCheck: this.config.enableReadyCheck ?? true,
      lazyConnect: this.config.lazyConnect ?? false,
    };

    if (this.config.url) {
      options.url = this.config.url;
    } else {
      options.host = this.config.host || 'localhost';
      options.port = this.config.port || 6379;
      if (this.config.password) options.password = this.config.password;
      if (this.config.db !== undefined) options.db = this.config.db;
    }

    this.client = new Redis(options);
    await this.client.connect();
    console.log('Redis connected successfully');
  }

  async disconnect(): Promise<void> {
    if (this.client) {
      await this.client.quit();
      this.client = null;
    }
  }

  private prefixKey(key: string): string {
    return `${this.keyPrefix}${key}`;
  }

  async get<T>(key: string): Promise<T | null> {
    if (!this.client) throw new Error('Redis not connected');
    const value = await this.client.get(this.prefixKey(key));
    if (!value) return null;

    try {
      return JSON.parse(value) as T;
    } catch {
      return value as unknown as T;
    }
  }

  async set(key: string, value: any, options?: CacheOptions): Promise<void> {
    if (!this.client) throw new Error('Redis not connected');

    const serialized = typeof value === 'string' ? value : JSON.stringify(value);
    const prefixedKey = this.prefixKey(key);

    if (options?.ttl) {
      if (options.nx) {
        await this.client.set(prefixedKey, serialized, 'EX', options.ttl, 'NX');
      } else if (options.xx) {
        await this.client.set(prefixedKey, serialized, 'EX', options.ttl, 'XX');
      } else {
        await this.client.setex(prefixedKey, options.ttl, serialized);
      }
    } else {
      await this.client.set(prefixedKey, serialized);
    }
  }

  async delete(key: string): Promise<void> {
    if (!this.client) throw new Error('Redis not connected');
    await this.client.del(this.prefixKey(key));
  }

  async deletePattern(pattern: string): Promise<number> {
    if (!this.client) throw new Error('Redis not connected');
    const keys = await this.client.keys(this.prefixKey(pattern));
    if (keys.length === 0) return 0;
    return this.client.del(...keys);
  }

  async exists(key: string): Promise<boolean> {
    if (!this.client) throw new Error('Redis not connected');
    const result = await this.client.exists(this.prefixKey(key));
    return result === 1;
  }

  async expire(key: string, ttl: number): Promise<boolean> {
    if (!this.client) throw new Error('Redis not connected');
    const result = await this.client.expire(this.prefixKey(key), ttl);
    return result === 1;
  }

  async ttl(key: string): Promise<number> {
    if (!this.client) throw new Error('Redis not connected');
    return this.client.ttl(this.prefixKey(key));
  }

  async increment(key: string): Promise<number> {
    if (!this.client) throw new Error('Redis not connected');
    return this.client.incr(this.prefixKey(key));
  }

  async incrementBy(key: string, amount: number): Promise<number> {
    if (!this.client) throw new Error('Redis not connected');
    return this.client.incrby(this.prefixKey(key), amount);
  }

  async decrement(key: string): Promise<number> {
    if (!this.client) throw new Error('Redis not connected');
    return this.client.decr(this.prefixKey(key));
  }

  async hashGet<T>(key: string, field: string): Promise<T | null> {
    if (!this.client) throw new Error('Redis not connected');
    const value = await this.client.hget(this.prefixKey(key), field);
    if (!value) return null;

    try {
      return JSON.parse(value) as T;
    } catch {
      return value as unknown as T;
    }
  }

  async hashSet(key: string, field: string, value: any): Promise<void> {
    if (!this.client) throw new Error('Redis not connected');
    const serialized = typeof value === 'string' ? value : JSON.stringify(value);
    await this.client.hset(this.prefixKey(key), field, serialized);
  }

  async hashSetMany(key: string, data: Record<string, any>): Promise<void> {
    if (!this.client) throw new Error('Redis not connected');
    const entries = Object.entries(data).map(([field, value]) => [
      field,
      typeof value === 'string' ? value : JSON.stringify(value),
    ]);
    await this.client.hset(this.prefixKey(key), Object.fromEntries(entries));
  }

  async hashGetAll<T>(key: string): Promise<Record<string, T>> {
    if (!this.client) throw new Error('Redis not connected');
    const data = await this.client.hgetall(this.prefixKey(key));

    const result: Record<string, T> = {};
    for (const [field, value] of Object.entries(data)) {
      try {
        result[field] = JSON.parse(value) as T;
      } catch {
        result[field] = value as unknown as T;
      }
    }
    return result;
  }

  async hashDelete(key: string, field: string): Promise<boolean> {
    if (!this.client) throw new Error('Redis not connected');
    const result = await this.client.hdel(this.prefixKey(key), field);
    return result > 0;
  }

  async listPush(key: string, value: any): Promise<number> {
    if (!this.client) throw new Error('Redis not connected');
    const serialized = typeof value === 'string' ? value : JSON.stringify(value);
    return this.client.rpush(this.prefixKey(key), serialized);
  }

  async listRange(key: string, start: number, stop: number): Promise<string[]> {
    if (!this.client) throw new Error('Redis not connected');
    return this.client.lrange(this.prefixKey(key), start, stop);
  }

  async listLength(key: string): Promise<number> {
    if (!this.client) throw new Error('Redis not connected');
    return this.client.llen(this.prefixKey(key));
  }

  async setAdd(key: string, ...values: any[]): Promise<number> {
    if (!this.client) throw new Error('Redis not connected');
    const serialized = values.map((v) => (typeof v === 'string' ? v : JSON.stringify(v)));
    return this.client.sadd(this.prefixKey(key), ...serialized);
  }

  async setMembers(key: string): Promise<string[]> {
    if (!this.client) throw new Error('Redis not connected');
    return this.client.smembers(this.prefixKey(key));
  }

  async setIsMember(key: string, value: any): Promise<boolean> {
    if (!this.client) throw new Error('Redis not connected');
    const serialized = typeof value === 'string' ? value : JSON.stringify(value);
    return (await this.client.sismember(this.prefixKey(key), serialized)) === 1;
  }

  async sortedSetAdd(key: string, score: number, member: any): Promise<number> {
    if (!this.client) throw new Error('Redis not connected');
    const serialized = typeof member === 'string' ? member : JSON.stringify(member);
    return this.client.zadd(this.prefixKey(key), score, serialized);
  }

  async sortedSetRangeByScore<T>(
    key: string,
    min: number | string,
    max: number | string,
    options?: { withScores?: boolean; offset?: number; count?: number }
  ): Promise<T[]> {
    if (!this.client) throw new Error('Redis not connected');

    const args: (number | string)[] = [this.prefixKey(key), min, max];

    if (options?.withScores) {
      args.push('WITHSCORES');
    }

    if (options?.offset !== undefined && options?.count !== undefined) {
      args.push('LIMIT', options.offset, options.count);
    }

    const result = await this.client.zrangebyscore(...args);

    if (options?.withScores) {
      const parsed: T[] = [];
      for (let i = 0; i < result.length; i += 2) {
        try {
          parsed.push({
            member: JSON.parse(result[i]) as T,
            score: parseFloat(result[i + 1]),
          } as any);
        } catch {
          parsed.push({
            member: result[i] as unknown as T,
            score: parseFloat(result[i + 1]),
          } as any);
        }
      }
      return parsed;
    }

    return result.map((v) => {
      try {
        return JSON.parse(v) as T;
      } catch {
        return v as unknown as T;
      }
    });
  }

  async checkRateLimit(
    config: RateLimitConfig,
    identifier: string
  ): Promise<{
    allowed: boolean;
    remaining: number;
    resetTime: number;
  }> {
    if (!this.client) throw new Error('Redis not connected');

    const key = this.prefixKey(`${config.keyPrefix || 'ratelimit'}:${identifier}`);
    const now = Date.now();
    const windowStart = now - config.windowMs;

    const pipeline = this.client.pipeline();
    pipeline.zremrangebyscore(key, '-inf', windowStart);
    pipeline.zadd(key, now, `${now}:${Math.random()}`);
    pipeline.zcard(key);
    pipeline.expire(key, Math.ceil(config.windowMs / 1000));
    pipeline.ttl(key);

    const results = await pipeline.exec();
    const currentCount = (results?.[2]?.[1] as number) || 0;
    const ttl = (results?.[4]?.[1] as number) || config.windowMs / 1000;

    const allowed = currentCount <= config.maxRequests;
    const remaining = Math.max(0, config.maxRequests - currentCount);
    const resetTime = now + ttl * 1000;

    return { allowed, remaining, resetTime };
  }

  async publish(channel: string, message: any): Promise<number> {
    if (!this.client) throw new Error('Redis not connected');
    const serialized = typeof message === 'string' ? message : JSON.stringify(message);
    return this.client.publish(channel, serialized);
  }

  async subscribe(
    channel: string,
    callback: (message: any, channel: string) => void
  ): Promise<void> {
    if (!this.client) throw new Error('Redis not connected');

    const subscriber = this.client.duplicate();
    await subscriber.connect();

    subscriber.on('message', (ch, message) => {
      try {
        const parsed = JSON.parse(message);
        callback(parsed, ch);
      } catch {
        callback(message, ch);
      }
    });

    await subscriber.subscribe(channel);
  }

  async ping(): Promise<boolean> {
    try {
      if (!this.client) return false;
      const result = await this.client.ping();
      return result === 'PONG';
    } catch {
      return false;
    }
  }

  async getStats(): Promise<{
    usedMemory: string;
    connectedClients: number;
    uptime: number;
    keys: number;
  }> {
    if (!this.client) throw new Error('Redis not connected');

    const [usedMemory, clients, uptime, keyCount] = await Promise.all([
      this.client.info('memory'),
      this.client.info('clients'),
      this.client.info('server'),
      this.client.dbsize(),
    ]);

    const parseInfo = (info: string, key: string): string => {
      const match = info.match(new RegExp(`${key}:(\\S+)`));
      return match?.[1] || 'unknown';
    };

    return {
      usedMemory: parseInfo(usedMemory, 'used_memory_human'),
      connectedClients: parseInt(parseInfo(clients, 'connected_clients')) || 0,
      uptime: parseInt(parseInfo(uptime, 'uptime_in_seconds')) || 0,
      keys: keyCount,
    };
  }
}

export function createCacheService(config: CacheConfig): RedisCache {
  return new RedisCache(config);
}
