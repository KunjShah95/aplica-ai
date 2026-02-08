import Redis from 'ioredis';
import type { RedisOptions, ClusterNode } from 'ioredis';
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
    nodes: Array<{ host: string; port: number }>;
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

export class RedisStore extends EventEmitter {
  private client: InstanceType<typeof Redis> | InstanceType<typeof Redis.Cluster>;
  private keyPrefix: string;
  private defaultTTL: number;
  private isConnected: boolean = false;

  constructor(config: RedisConfig = {}) {
    super();
    this.keyPrefix = config.keyPrefix || 'sentinel:';
    this.defaultTTL = 86400;

    if (config.cluster) {
      this.client = new Redis.Cluster(config.cluster.nodes, {
        scaleReads: config.cluster.readWrite || 'slave',
        redisOptions: {
          password: config.password,
          db: config.db || 0,
        },
      });
    } else if (config.sentinel) {
      this.client = new Redis({
        sentinels: config.sentinel.nodes,
        name: config.sentinel.masterName,
        password: config.password,
        db: config.db || 0,
      });
    } else {
      this.client = new Redis({
        host: config.host || 'localhost',
        port: config.port || 6379,
        password: config.password || undefined,
        db: config.db || 0,
      });
    }

    this.setupEventHandlers();
  }

  private setupEventHandlers(): void {
    this.client.on('connect', () => {
      this.isConnected = true;
      console.log('Redis connected');
      this.emit('connected');
    });

    this.client.on('error', (error) => {
      console.error('Redis error:', error);
      this.emit('error', error);
    });

    this.client.on('close', () => {
      this.isConnected = false;
      console.log('Redis connection closed');
      this.emit('close');
    });
  }

  async isReady(): Promise<boolean> {
    try {
      await this.client.ping();
      return true;
    } catch {
      return false;
    }
  }

  private key(key: string): string {
    return `${this.keyPrefix}${key}`;
  }

  async get<T>(key: string): Promise<T | null> {
    try {
      const value = await this.client.get(this.key(key));
      if (!value) return null;

      const parsed = JSON.parse(value);
      if (parsed.expiresAt && Date.now() > parsed.expiresAt) {
        await this.delete(key);
        return null;
      }

      return parsed.value;
    } catch (error) {
      console.error('Redis get error:', error);
      return null;
    }
  }

  async set<T>(
    key: string,
    value: T,
    options?: { ttl?: number; expiresAt?: number }
  ): Promise<void> {
    try {
      const entry: CacheEntry<T> = {
        value,
        expiresAt: options?.expiresAt,
        createdAt: Date.now(),
      };

      const serialized = JSON.stringify(entry);
      const ttl = options?.ttl || this.defaultTTL;

      if (ttl > 0) {
        await this.client.setex(this.key(key), ttl, serialized);
      } else {
        await this.client.set(this.key(key), serialized);
      }
    } catch (error) {
      console.error('Redis set error:', error);
      throw error;
    }
  }

  async delete(key: string): Promise<void> {
    try {
      await this.client.del(this.key(key));
    } catch (error) {
      console.error('Redis delete error:', error);
      throw error;
    }
  }

  async exists(key: string): Promise<boolean> {
    try {
      return (await this.client.exists(this.key(key))) === 1;
    } catch (error) {
      console.error('Redis exists error:', error);
      return false;
    }
  }

  async expire(key: string, seconds: number): Promise<void> {
    try {
      await this.client.expire(this.key(key), seconds);
    } catch (error) {
      console.error('Redis expire error:', error);
      throw error;
    }
  }

  async ttl(key: string): Promise<number> {
    try {
      return await this.client.ttl(this.key(key));
    } catch (error) {
      console.error('Redis ttl error:', error);
      return -2;
    }
  }

  async keys(pattern: string): Promise<string[]> {
    try {
      const keys = await this.client.keys(this.key(pattern));
      return keys.map((k) => k.replace(this.keyPrefix, ''));
    } catch (error) {
      console.error('Redis keys error:', error);
      return [];
    }
  }

  async clear(pattern: string): Promise<number> {
    try {
      const keys = await this.keys(pattern);
      if (keys.length === 0) return 0;

      return await this.client.del(...keys.map((k) => this.key(k)));
    } catch (error) {
      console.error('Redis clear error:', error);
      return 0;
    }
  }

  async increment(key: string, amount?: number): Promise<number> {
    try {
      const inc = amount || 1;
      return await this.client.incrby(this.key(key), inc);
    } catch (error) {
      console.error('Redis increment error:', error);
      throw error;
    }
  }

  async getSet<T>(key: string, value: T): Promise<T | null> {
    try {
      const old = await this.get<T>(key);
      await this.set(key, value);
      return old;
    } catch (error) {
      console.error('Redis getSet error:', error);
      throw error;
    }
  }

  async hget<T>(key: string, field: string): Promise<T | null> {
    try {
      const value = await this.client.hget(this.key(key), field);
      if (!value) return null;
      return JSON.parse(value);
    } catch (error) {
      console.error('Redis hget error:', error);
      return null;
    }
  }

  async hset<T>(key: string, field: string, value: T): Promise<void> {
    try {
      await this.client.hset(this.key(key), field, JSON.stringify(value));
    } catch (error) {
      console.error('Redis hset error:', error);
      throw error;
    }
  }

  async hgetall<T>(key: string): Promise<Record<string, T>> {
    try {
      const result = await this.client.hgetall(this.key(key));
      const parsed: Record<string, T> = {};

      for (const [field, value] of Object.entries(result)) {
        parsed[field] = JSON.parse(value);
      }

      return parsed;
    } catch (error) {
      console.error('Redis hgetall error:', error);
      return {};
    }
  }

  async hdel(key: string, field: string): Promise<void> {
    try {
      await this.client.hdel(this.key(key), field);
    } catch (error) {
      console.error('Redis hdel error:', error);
      throw error;
    }
  }

  async zadd(key: string, score: number, member: string): Promise<void> {
    try {
      await this.client.zadd(this.key(key), score, member);
    } catch (error) {
      console.error('Redis zadd error:', error);
      throw error;
    }
  }

  async zrange(key: string, start: number, stop: number): Promise<string[]> {
    try {
      return await this.client.zrange(this.key(key), start, stop);
    } catch (error) {
      console.error('Redis zrange error:', error);
      return [];
    }
  }

  async lpush(key: string, ...values: string[]): Promise<number> {
    try {
      return await this.client.lpush(this.key(key), ...values);
    } catch (error) {
      console.error('Redis lpush error:', error);
      throw error;
    }
  }

  async lrange(key: string, start: number, stop: number): Promise<string[]> {
    try {
      return await this.client.lrange(this.key(key), start, stop);
    } catch (error) {
      console.error('Redis lrange error:', error);
      return [];
    }
  }

  async publish(channel: string, message: any): Promise<void> {
    try {
      await this.client.publish(channel, JSON.stringify(message));
    } catch (error) {
      console.error('Redis publish error:', error);
      throw error;
    }
  }

  subscribe(channel: string, callback: (message: any) => void): void {
    const subscriber = this.client.duplicate();

    subscriber.on('message', (ch, message) => {
      if (ch === channel) {
        try {
          callback(JSON.parse(message));
        } catch {
          callback(message);
        }
      }
    });

    subscriber.subscribe(channel);
  }

  async checkRateLimit(key: string, limit: number, windowSeconds: number): Promise<RateLimitInfo> {
    try {
      const now = Date.now();
      const windowStart = Math.floor(now / 1000 / windowSeconds) * windowSeconds;
      const rateKey = `${key}:${windowStart}`;

      const current = await this.increment(rateKey, 0);
      await this.expire(rateKey, windowSeconds);

      return {
        limit,
        remaining: Math.max(0, limit - current),
        resetTime: (windowStart + windowSeconds) * 1000,
      };
    } catch (error) {
      console.error('Redis rate limit error:', error);
      return {
        limit,
        remaining: limit,
        resetTime: Date.now() + windowSeconds * 1000,
      };
    }
  }

  async acquireLock(
    lockName: string,
    ttlMs: number,
    retryIntervalMs: number = 100,
    maxRetries: number = 10
  ): Promise<string | null> {
    const lockKey = `lock:${lockName}`;
    const lockValue = `${Date.now()}:${Math.random()}`;
    const lockTTL = Math.ceil(ttlMs / 1000);

    for (let i = 0; i < maxRetries; i++) {
      const acquired = await this.client.set(lockKey, lockValue, 'EX', lockTTL, 'NX');
      if (acquired === 'OK') {
        return lockValue;
      }
      await new Promise((resolve) => setTimeout(resolve, retryIntervalMs));
    }

    return null;
  }

  async releaseLock(lockName: string, lockValue: string): Promise<boolean> {
    const lockKey = `lock:${lockName}`;

    const script = `
      if redis.call("get", KEYS[1]) == ARGV[1] then
        return redis.call("del", KEYS[1])
      else
        return 0
      end
    `;

    try {
      const result = await this.client.eval(script, 1, lockKey, lockValue);
      return result === 1;
    } catch (error) {
      console.error('Redis release lock error:', error);
      return false;
    }
  }

  async close(): Promise<void> {
    await this.client.quit();
    this.isConnected = false;
    console.log('Redis connection closed');
  }
}
