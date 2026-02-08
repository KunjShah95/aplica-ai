export type TaskType = 'ONE_TIME' | 'RECURRING' | 'CRON';
export type TaskStatus = 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED' | 'CANCELLED';
export interface ScheduleConfig {
    type: TaskType;
    at?: Date;
    cron?: string;
    interval?: number;
    timezone?: string;
}
export interface CreateTaskInput {
    name: string;
    description?: string;
    schedule: ScheduleConfig;
    workflowId?: string;
    payload?: Record<string, unknown>;
    maxRetries?: number;
    notifyOnComplete?: boolean;
    notifyOnFailure?: boolean;
}
export declare class Scheduler {
    private timers;
    private running;
    start(): Promise<void>;
    stop(): void;
    createTask(input: CreateTaskInput): Promise<string>;
    cancelTask(taskId: string): Promise<void>;
    pauseTask(taskId: string): Promise<void>;
    resumeTask(taskId: string): Promise<void>;
    triggerNow(taskId: string): Promise<string>;
    private loadPendingTasks;
    private startPolling;
    private scheduleTask;
    private runTask;
    private calculateNextRun;
    private parseCron;
    private matchesCronPart;
    listTasks(options?: {
        isActive?: boolean;
        type?: TaskType;
        limit?: number;
        offset?: number;
    }): Promise<({
        _count: {
            runs: number;
        };
    } & {
        name: string;
        description: string | null;
        id: string;
        type: import(".prisma/client").$Enums.TaskType;
        payload: import("@prisma/client/runtime/library").JsonValue;
        createdAt: Date;
        maxRetries: number;
        isActive: boolean;
        updatedAt: Date;
        isEnabled: boolean;
        workflowId: string | null;
        schedule: import("@prisma/client/runtime/library").JsonValue;
        runCount: number;
        failCount: number;
        lastRunAt: Date | null;
        nextRunAt: Date | null;
    })[]>;
    getTaskRuns(taskId: string, limit?: number): Promise<{
        id: string;
        status: import(".prisma/client").$Enums.ExecutionStatus;
        error: string | null;
        duration: number | null;
        output: import("@prisma/client/runtime/library").JsonValue | null;
        taskId: string;
        startedAt: Date;
        completedAt: Date | null;
    }[]>;
}
export declare const scheduler: Scheduler;
//# sourceMappingURL=scheduler.d.ts.map