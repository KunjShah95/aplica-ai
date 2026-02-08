import { EventEmitter } from 'events';
export type ScheduleType = 'cron' | 'interval' | 'once' | 'manual';
export type CronField = number | '*' | '*/n' | 'n-m' | 'n,m';
export interface CronSchedule {
    second?: CronField;
    minute?: CronField;
    hour?: CronField;
    dayOfMonth?: CronField;
    month?: CronField;
    dayOfWeek?: CronField;
}
export interface ScheduledTask {
    id: string;
    name: string;
    type: ScheduleType;
    schedule: string | CronSchedule | number;
    task: {
        type: string;
        payload: Record<string, unknown>;
    };
    enabled: boolean;
    lastRun?: Date;
    nextRun?: Date;
    runCount: number;
    createdAt: Date;
    modifiedAt: Date;
    metadata?: Record<string, unknown>;
}
export interface SchedulerOptions {
    timezone?: string;
    maxConcurrent?: number;
    persistencePath?: string;
}
export interface SchedulerStats {
    totalTasks: number;
    enabledTasks: number;
    runningTasks: number;
    nextScheduledRun?: Date;
}
export declare class TaskScheduler extends EventEmitter {
    private tasks;
    private timeouts;
    private interval;
    private runningCount;
    private options;
    private cronParser;
    constructor(options?: SchedulerOptions);
    private start;
    addTask(task: Omit<ScheduledTask, 'id' | 'createdAt' | 'modifiedAt' | 'runCount'>): ScheduledTask;
    private scheduleTask;
    private getNextRunTime;
    executeTask(task: ScheduledTask): Promise<void>;
    private runTaskFunction;
    removeTask(taskId: string): boolean;
    updateTask(taskId: string, updates: Partial<ScheduledTask>): ScheduledTask | null;
    enableTask(taskId: string): boolean;
    disableTask(taskId: string): boolean;
    getTask(taskId: string): ScheduledTask | undefined;
    getAllTasks(): ScheduledTask[];
    getEnabledTasks(): ScheduledTask[];
    getStats(): SchedulerStats;
    private checkSchedules;
    private clearTaskTimeout;
    private saveTasks;
    private loadTasks;
    stop(): Promise<void>;
}
export declare const taskScheduler: TaskScheduler;
//# sourceMappingURL=index.d.ts.map