import { Queue, Worker } from 'bullmq';
import Redis from 'ioredis';
import { randomUUID } from 'crypto';
export class TaskQueue {
    queues = new Map();
    workers = new Map();
    connection;
    config;
    lanes = [
        { name: 'urgent', priority: 1, concurrency: 5, color: '#ff4444' },
        { name: 'normal', priority: 2, concurrency: 3, color: '#4488ff' },
        { name: 'background', priority: 3, concurrency: 1, color: '#888888' },
    ];
    constructor(config) {
        if (process.argv.includes('dashboard')) {
            // Mock mode for dashboard
            this.connection = new Proxy({}, { get: () => () => { } });
            this.config = { prefix: 'mock', defaultJobOptions: {} };
            return;
        }
        this.connection = new Redis({
            host: process.env.REDIS_HOST || 'localhost',
            port: parseInt(process.env.REDIS_PORT || '6379'),
            password: process.env.REDIS_PASSWORD || undefined,
            maxRetriesPerRequest: null,
            retryStrategy: (times) => {
                if (process.env.NODE_ENV === 'dashboard' || process.argv.includes('dashboard')) {
                    return null; // Stop reconnecting immediately in dashboard mode
                }
                return Math.min(times * 50, 2000);
            }
        });
        this.config = {
            prefix: process.env.QUEUE_PREFIX || 'sentinel',
            defaultJobOptions: {
                attempts: 3,
                backoff: { type: 'exponential', delay: 1000 },
                removeOnComplete: 100,
                removeOnFail: 50,
            },
            ...config,
        };
        try {
            this.initializeQueues();
        }
        catch (e) {
            console.warn('TaskQueue initialization failed (Redis offline?):', e instanceof Error ? e.message : String(e));
        }
    }
    initializeQueues() {
        for (const lane of this.lanes) {
            const queueName = `${this.config.prefix}-${lane.name}`;
            const queue = new Queue(queueName, {
                connection: this.connection,
                defaultJobOptions: {
                    ...this.config.defaultJobOptions,
                    priority: lane.priority * 100,
                },
            });
            this.queues.set(lane.name, queue);
        }
        console.log(`TaskQueue initialized with ${this.lanes.length} lanes`);
    }
    async add(type, payload, options = {}) {
        const lane = options.priority || 'normal';
        const queue = this.queues.get(lane);
        if (!queue) {
            throw new Error(`Unknown lane: ${lane}`);
        }
        const job = await queue.add(type, { ...payload, _taskId: randomUUID() }, {
            jobId: options.jobId || randomUUID(),
            delay: options.delay,
            priority: this.getLanePriority(lane),
        });
        return {
            id: job.id || 'unknown',
            type,
            priority: this.getLanePriority(lane),
            payload,
            createdAt: new Date(),
            status: 'pending',
            retryCount: 0,
            maxRetries: this.config.defaultJobOptions.attempts,
        };
    }
    getLanePriority(lane) {
        const laneConfig = this.lanes.find((l) => l.name === lane);
        return laneConfig ? laneConfig.priority : 2;
    }
    async getJobCounts(lane) {
        const queue = this.queues.get(lane);
        if (!queue) {
            throw new Error(`Unknown lane: ${lane}`);
        }
        const counts = await queue.getJobCounts();
        return {
            pending: counts.wait || 0,
            processing: counts.active || 0,
            completed: counts.completed || 0,
            failed: counts.failed || 0,
            cancelled: counts.delayed || 0,
        };
    }
    async getStatus() {
        const status = {};
        for (const lane of this.lanes) {
            status[lane.name] = await this.getJobCounts(lane.name);
        }
        return status;
    }
    async process(type, handler) {
        for (const lane of this.lanes) {
            const queue = this.queues.get(lane.name);
            if (!queue)
                continue;
            const worker = new Worker(queue.name, async (job) => {
                if (job.name === type) {
                    await handler(job);
                }
            }, {
                connection: this.connection,
                concurrency: lane.concurrency,
            });
            worker.on('completed', (job) => {
                console.log(`Job ${job.id} completed in lane ${lane.name}`);
            });
            worker.on('failed', (job, err) => {
                console.error(`Job ${job?.id} failed in lane ${lane.name}:`, err.message);
            });
            this.workers.set(`${lane.name}:${type}`, worker);
        }
        console.log(`Workers started for task type: ${type}`);
    }
    async pause(lane) {
        const queue = this.queues.get(lane);
        if (queue) {
            await queue.pause();
            console.log(`Queue lane ${lane} paused`);
        }
    }
    async resume(lane) {
        const queue = this.queues.get(lane);
        if (queue) {
            await queue.resume();
            console.log(`Queue lane ${lane} resumed`);
        }
    }
    async clean(lane, grace = 0) {
        const queue = this.queues.get(lane);
        if (queue) {
            await queue.clean(grace, 'completed');
            await queue.clean(grace, 'failed');
            console.log(`Queue lane ${lane} cleaned`);
        }
    }
    async close() {
        for (const worker of this.workers.values()) {
            await worker.close();
        }
        this.workers.clear();
        for (const queue of this.queues.values()) {
            await queue.close();
        }
        this.queues.clear();
        await this.connection.quit();
        console.log('TaskQueue closed');
    }
    getLanes() {
        return this.lanes;
    }
}
let taskQueueInstance = null;
export const taskQueue = new Proxy({}, {
    get: (_target, prop) => {
        if (!taskQueueInstance) {
            taskQueueInstance = new TaskQueue();
        }
        const value = taskQueueInstance[prop];
        if (typeof value === 'function') {
            return value.bind(taskQueueInstance);
        }
        return value;
    }
});
//# sourceMappingURL=queue.js.map