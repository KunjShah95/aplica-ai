import { Job } from 'bullmq';
import { Task, TaskPayload, TaskType, TaskStatus, QueueConfig, ProcessingLane } from './types.js';
export declare class TaskQueue {
    private queues;
    private workers;
    private connection;
    private config;
    private lanes;
    constructor(config?: Partial<QueueConfig>);
    private initializeQueues;
    add(type: TaskType, payload: TaskPayload, options?: {
        priority?: 'urgent' | 'normal' | 'background';
        delay?: number;
        jobId?: string;
    }): Promise<Task>;
    private getLanePriority;
    getJobCounts(lane: string): Promise<Record<TaskStatus, number>>;
    getStatus(): Promise<Record<string, Record<TaskStatus, number>>>;
    process(type: TaskType, handler: (job: Job<TaskPayload>) => Promise<void>): Promise<void>;
    pause(lane: string): Promise<void>;
    resume(lane: string): Promise<void>;
    clean(lane: string, grace?: number): Promise<void>;
    close(): Promise<void>;
    getLanes(): ProcessingLane[];
}
export declare const taskQueue: TaskQueue;
//# sourceMappingURL=queue.d.ts.map