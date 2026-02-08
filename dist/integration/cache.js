import Redis from 'ioredis';
export class RedisCache {
    client = null;
    config;
    keyPrefix;
    constructor(config) {
        this.config = config;
        this.keyPrefix = config.keyPrefix || '';
    }
    async connect() {
        const options = {
            maxRetriesPerRequest: this.config.maxRetriesPerRequest ?? 3,
            enableReadyCheck: this.config.enableReadyCheck ?? true,
            lazyConnect: this.config.lazyConnect ?? false,
        };
        if (this.config.url) {
            options.url = this.config.url;
        }
        else {
            options.host = this.config.host || 'localhost';
            options.port = this.config.port || 6379;
            if (this.config.password)
                options.password = this.config.password;
            if (this.config.db !== undefined)
                options.db = this.config.db;
        }
        this.client = new Redis(options);
        // ioredis auto-connects unless lazyConnect is true
        // Wait for ready event to confirm connection
        await new Promise((resolve, reject) => {
            this.client.once('ready', () => resolve());
            this.client.once('error', (err) => reject(err));
        });
        console.log('Redis connected successfully');
    }
    async disconnect() {
        if (this.client) {
            await this.client.quit();
            this.client = null;
        }
    }
    prefixKey(key) {
        return `${this.keyPrefix}${key}`;
    }
    async get(key) {
        if (!this.client)
            throw new Error('Redis not connected');
        const value = await this.client.get(this.prefixKey(key));
        if (!value)
            return null;
        try {
            return JSON.parse(value);
        }
        catch {
            return value;
        }
    }
    async set(key, value, options) {
        if (!this.client)
            throw new Error('Redis not connected');
        const serialized = typeof value === 'string' ? value : JSON.stringify(value);
        const prefixedKey = this.prefixKey(key);
        if (options?.ttl) {
            if (options.nx) {
                await this.client.set(prefixedKey, serialized, 'EX', options.ttl, 'NX');
            }
            else if (options.xx) {
                await this.client.set(prefixedKey, serialized, 'EX', options.ttl, 'XX');
            }
            else {
                await this.client.setex(prefixedKey, options.ttl, serialized);
            }
        }
        else {
            await this.client.set(prefixedKey, serialized);
        }
    }
    async delete(key) {
        if (!this.client)
            throw new Error('Redis not connected');
        await this.client.del(this.prefixKey(key));
    }
    async deletePattern(pattern) {
        if (!this.client)
            throw new Error('Redis not connected');
        const keys = await this.client.keys(this.prefixKey(pattern));
        if (keys.length === 0)
            return 0;
        return this.client.del(...keys);
    }
    async exists(key) {
        if (!this.client)
            throw new Error('Redis not connected');
        const result = await this.client.exists(this.prefixKey(key));
        return result === 1;
    }
    async expire(key, ttl) {
        if (!this.client)
            throw new Error('Redis not connected');
        const result = await this.client.expire(this.prefixKey(key), ttl);
        return result === 1;
    }
    async ttl(key) {
        if (!this.client)
            throw new Error('Redis not connected');
        return this.client.ttl(this.prefixKey(key));
    }
    async increment(key) {
        if (!this.client)
            throw new Error('Redis not connected');
        return this.client.incr(this.prefixKey(key));
    }
    async incrementBy(key, amount) {
        if (!this.client)
            throw new Error('Redis not connected');
        return this.client.incrby(this.prefixKey(key), amount);
    }
    async decrement(key) {
        if (!this.client)
            throw new Error('Redis not connected');
        return this.client.decr(this.prefixKey(key));
    }
    async hashGet(key, field) {
        if (!this.client)
            throw new Error('Redis not connected');
        const value = await this.client.hget(this.prefixKey(key), field);
        if (!value)
            return null;
        try {
            return JSON.parse(value);
        }
        catch {
            return value;
        }
    }
    async hashSet(key, field, value) {
        if (!this.client)
            throw new Error('Redis not connected');
        const serialized = typeof value === 'string' ? value : JSON.stringify(value);
        await this.client.hset(this.prefixKey(key), field, serialized);
    }
    async hashSetMany(key, data) {
        if (!this.client)
            throw new Error('Redis not connected');
        const entries = Object.entries(data).map(([field, value]) => [
            field,
            typeof value === 'string' ? value : JSON.stringify(value),
        ]);
        await this.client.hset(this.prefixKey(key), Object.fromEntries(entries));
    }
    async hashGetAll(key) {
        if (!this.client)
            throw new Error('Redis not connected');
        const data = await this.client.hgetall(this.prefixKey(key));
        const result = {};
        for (const [field, value] of Object.entries(data)) {
            try {
                result[field] = JSON.parse(value);
            }
            catch {
                result[field] = value;
            }
        }
        return result;
    }
    async hashDelete(key, field) {
        if (!this.client)
            throw new Error('Redis not connected');
        const result = await this.client.hdel(this.prefixKey(key), field);
        return result > 0;
    }
    async listPush(key, value) {
        if (!this.client)
            throw new Error('Redis not connected');
        const serialized = typeof value === 'string' ? value : JSON.stringify(value);
        return this.client.rpush(this.prefixKey(key), serialized);
    }
    async listRange(key, start, stop) {
        if (!this.client)
            throw new Error('Redis not connected');
        return this.client.lrange(this.prefixKey(key), start, stop);
    }
    async listLength(key) {
        if (!this.client)
            throw new Error('Redis not connected');
        return this.client.llen(this.prefixKey(key));
    }
    async setAdd(key, ...values) {
        if (!this.client)
            throw new Error('Redis not connected');
        const serialized = values.map((v) => (typeof v === 'string' ? v : JSON.stringify(v)));
        return this.client.sadd(this.prefixKey(key), ...serialized);
    }
    async setMembers(key) {
        if (!this.client)
            throw new Error('Redis not connected');
        return this.client.smembers(this.prefixKey(key));
    }
    async setIsMember(key, value) {
        if (!this.client)
            throw new Error('Redis not connected');
        const serialized = typeof value === 'string' ? value : JSON.stringify(value);
        return (await this.client.sismember(this.prefixKey(key), serialized)) === 1;
    }
    async sortedSetAdd(key, score, member) {
        if (!this.client)
            throw new Error('Redis not connected');
        const serialized = typeof member === 'string' ? member : JSON.stringify(member);
        return this.client.zadd(this.prefixKey(key), score, serialized);
    }
    async sortedSetRangeByScore(key, min, max, options) {
        if (!this.client)
            throw new Error('Redis not connected');
        const args = [this.prefixKey(key), min, max];
        if (options?.withScores) {
            args.push('WITHSCORES');
        }
        if (options?.offset !== undefined && options?.count !== undefined) {
            args.push('LIMIT', options.offset, options.count);
        }
        const result = await this.client.zrangebyscore(...args);
        if (options?.withScores) {
            const parsed = [];
            for (let i = 0; i < result.length; i += 2) {
                try {
                    parsed.push({
                        member: JSON.parse(result[i]),
                        score: parseFloat(result[i + 1]),
                    });
                }
                catch {
                    parsed.push({
                        member: result[i],
                        score: parseFloat(result[i + 1]),
                    });
                }
            }
            return parsed;
        }
        return result.map((v) => {
            try {
                return JSON.parse(v);
            }
            catch {
                return v;
            }
        });
    }
    async checkRateLimit(config, identifier) {
        if (!this.client)
            throw new Error('Redis not connected');
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
        const currentCount = results?.[2]?.[1] || 0;
        const ttl = results?.[4]?.[1] || config.windowMs / 1000;
        const allowed = currentCount <= config.maxRequests;
        const remaining = Math.max(0, config.maxRequests - currentCount);
        const resetTime = now + ttl * 1000;
        return { allowed, remaining, resetTime };
    }
    async publish(channel, message) {
        if (!this.client)
            throw new Error('Redis not connected');
        const serialized = typeof message === 'string' ? message : JSON.stringify(message);
        return this.client.publish(channel, serialized);
    }
    async subscribe(channel, callback) {
        if (!this.client)
            throw new Error('Redis not connected');
        const subscriber = this.client.duplicate();
        await subscriber.connect();
        subscriber.on('message', (ch, message) => {
            try {
                const parsed = JSON.parse(message);
                callback(parsed, ch);
            }
            catch {
                callback(message, ch);
            }
        });
        await subscriber.subscribe(channel);
    }
    async ping() {
        try {
            if (!this.client)
                return false;
            const result = await this.client.ping();
            return result === 'PONG';
        }
        catch {
            return false;
        }
    }
    async getStats() {
        if (!this.client)
            throw new Error('Redis not connected');
        const [usedMemory, clients, uptime, keyCount] = await Promise.all([
            this.client.info('memory'),
            this.client.info('clients'),
            this.client.info('server'),
            this.client.dbsize(),
        ]);
        const parseInfo = (info, key) => {
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
export function createCacheService(config) {
    return new RedisCache(config);
}
//# sourceMappingURL=cache.js.map