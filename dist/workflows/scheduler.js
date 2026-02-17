import { db } from '../db/index.js';
import { workflowEngine } from './engine.js';
export class Scheduler {
    timers = new Map();
    running = false;
    pollTimeout;
    async start() {
        if (this.running)
            return;
        this.running = true;
        console.log('Scheduler started');
        await this.loadPendingTasks();
        this.startPolling();
    }
    stop() {
        this.running = false;
        for (const timer of this.timers.values()) {
            clearTimeout(timer);
        }
        if (this.pollTimeout) {
            clearTimeout(this.pollTimeout);
            this.pollTimeout = undefined;
        }
        this.timers.clear();
        console.log('Scheduler stopped');
    }
    async createTask(input) {
        const nextRunAt = this.calculateNextRun(input.schedule);
        const task = await db.scheduledTask.create({
            data: {
                name: input.name,
                description: input.description,
                type: input.schedule.type,
                schedule: input.schedule,
                workflowId: input.workflowId,
                payload: input.payload,
                nextRunAt,
                maxRetries: input.maxRetries || 3,
                isActive: true,
            },
        });
        if (this.running && nextRunAt) {
            this.scheduleTask(task.id, nextRunAt);
        }
        return task.id;
    }
    async cancelTask(taskId) {
        const timer = this.timers.get(taskId);
        if (timer) {
            clearTimeout(timer);
            this.timers.delete(taskId);
        }
        await db.scheduledTask.update({
            where: { id: taskId },
            data: { isActive: false },
        });
    }
    async pauseTask(taskId) {
        const timer = this.timers.get(taskId);
        if (timer) {
            clearTimeout(timer);
            this.timers.delete(taskId);
        }
        await db.scheduledTask.update({
            where: { id: taskId },
            data: { isActive: false },
        });
    }
    async resumeTask(taskId) {
        const task = await db.scheduledTask.update({
            where: { id: taskId },
            data: { isActive: true },
        });
        if (task.nextRunAt) {
            this.scheduleTask(task.id, task.nextRunAt);
        }
    }
    async triggerNow(taskId) {
        return this.runTask(taskId);
    }
    async loadPendingTasks() {
        const tasks = await db.scheduledTask.findMany({
            where: {
                isActive: true,
                nextRunAt: { not: null },
            },
        });
        for (const task of tasks) {
            if (task.nextRunAt) {
                this.scheduleTask(task.id, task.nextRunAt);
            }
        }
        console.log(`Loaded ${tasks.length} pending tasks`);
    }
    startPolling() {
        const poll = async () => {
            if (!this.running)
                return;
            try {
                const now = new Date();
                const dueTasks = await db.scheduledTask.findMany({
                    where: {
                        isActive: true,
                        nextRunAt: { lte: now },
                    },
                });
                for (const task of dueTasks) {
                    if (!this.timers.has(task.id)) {
                        this.runTask(task.id).catch(console.error);
                    }
                }
            }
            catch (error) {
                console.error('Scheduler polling error:', error);
            }
            if (this.running) {
                this.pollTimeout = setTimeout(poll, 10000);
            }
        };
        poll();
    }
    scheduleTask(taskId, runAt) {
        const existingTimer = this.timers.get(taskId);
        if (existingTimer) {
            clearTimeout(existingTimer);
        }
        const delay = Math.max(0, runAt.getTime() - Date.now());
        if (delay > 2147483647) {
            return;
        }
        const timer = setTimeout(() => {
            this.timers.delete(taskId);
            this.runTask(taskId).catch(console.error);
        }, delay);
        this.timers.set(taskId, timer);
    }
    async runTask(taskId) {
        const task = await db.scheduledTask.findUnique({
            where: { id: taskId },
        });
        if (!task || !task.isActive) {
            throw new Error('Task not found or disabled');
        }
        const run = await db.taskRun.create({
            data: {
                taskId,
                status: 'RUNNING',
                startedAt: new Date(),
            },
        });
        try {
            let output;
            const workflowId = task.workflowId;
            if (workflowId) {
                const executionId = await workflowEngine.executeWorkflow(workflowId, task.payload);
                output = { workflowExecutionId: executionId };
            }
            else {
                output = { executed: true, payload: task.payload };
            }
            await db.taskRun.update({
                where: { id: run.id },
                data: {
                    status: 'COMPLETED',
                    completedAt: new Date(),
                    output: output,
                },
            });
            const newNextRun = this.calculateNextRun(task.schedule, task.type === 'ONE_TIME');
            await db.scheduledTask.update({
                where: { id: taskId },
                data: {
                    lastRunAt: new Date(),
                    nextRunAt: newNextRun,
                    run_count: { increment: 1 },
                },
            });
            if (newNextRun) {
                this.scheduleTask(taskId, newNextRun);
            }
            return run.id;
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            await db.taskRun.update({
                where: { id: run.id },
                data: {
                    status: 'FAILED',
                    completedAt: new Date(),
                    error: errorMessage,
                },
            });
            await db.scheduledTask.update({
                where: { id: taskId },
                data: {
                    fail_count: { increment: 1 },
                    lastRunAt: new Date(),
                },
            });
            throw error;
        }
    }
    calculateNextRun(schedule, isComplete = false) {
        const now = new Date();
        switch (schedule.type) {
            case 'ONE_TIME':
                if (isComplete)
                    return null;
                return schedule.at || now;
            case 'RECURRING':
                if (!schedule.interval)
                    return null;
                return new Date(now.getTime() + schedule.interval);
            case 'CRON':
                return this.parseCron(schedule.cron || '0 * * * *', now);
            default:
                return null;
        }
    }
    parseCron(expression, after) {
        const parts = expression.split(' ');
        if (parts.length !== 5) {
            throw new Error('Invalid cron expression');
        }
        const [minute, hour, dayOfMonth, month, dayOfWeek] = parts;
        const next = new Date(after);
        next.setSeconds(0);
        next.setMilliseconds(0);
        next.setMinutes(next.getMinutes() + 1);
        for (let i = 0; i < 527040; i++) {
            if (this.matchesCronPart(minute, next.getMinutes(), 0, 59) &&
                this.matchesCronPart(hour, next.getHours(), 0, 23) &&
                this.matchesCronPart(dayOfMonth, next.getDate(), 1, 31) &&
                this.matchesCronPart(month, next.getMonth() + 1, 1, 12) &&
                this.matchesCronPart(dayOfWeek, next.getDay(), 0, 6)) {
                return next;
            }
            next.setMinutes(next.getMinutes() + 1);
        }
        throw new Error('No matching cron time found within a year');
    }
    matchesCronPart(part, value, min, max) {
        if (part === '*')
            return true;
        if (part.includes('/')) {
            const [range, step] = part.split('/');
            const stepNum = parseInt(step);
            if (range === '*') {
                return value % stepNum === 0;
            }
        }
        if (part.includes('-')) {
            const [start, end] = part.split('-').map(Number);
            return value >= start && value <= end;
        }
        if (part.includes(',')) {
            return part.split(',').map(Number).includes(value);
        }
        return parseInt(part) === value;
    }
    async listTasks(options = {}) {
        const { isActive, type, limit = 20, offset = 0 } = options;
        return db.scheduledTask.findMany({
            where: { isActive, type: type },
            orderBy: { nextRunAt: 'asc' },
            take: limit,
            skip: offset,
            include: {
                _count: { select: { runs: true } },
            },
        });
    }
    async getTaskRuns(taskId, limit = 20) {
        return db.taskRun.findMany({
            where: { taskId },
            orderBy: { startedAt: 'desc' },
            take: limit,
        });
    }
}
export const scheduler = new Scheduler();
//# sourceMappingURL=scheduler.js.map