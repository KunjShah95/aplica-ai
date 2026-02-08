import { EventEmitter } from 'events';
import { randomUUID } from 'crypto';
export class TaskScheduler extends EventEmitter {
    tasks = new Map();
    timeouts = new Map();
    interval = null;
    runningCount = 0;
    options;
    cronParser;
    constructor(options = {}) {
        super();
        this.options = {
            timezone: options.timezone || 'UTC',
            maxConcurrent: options.maxConcurrent || 10,
            persistencePath: options.persistencePath || './data/scheduler.json',
        };
        this.cronParser = new CronParser(this.options.timezone);
        this.loadTasks();
        this.start();
    }
    start() {
        this.interval = setInterval(() => {
            this.checkSchedules();
        }, 1000);
        console.log(`Task scheduler started (timezone: ${this.options.timezone})`);
    }
    addTask(task) {
        const fullTask = {
            ...task,
            id: randomUUID(),
            runCount: 0,
            createdAt: new Date(),
            modifiedAt: new Date(),
        };
        this.tasks.set(fullTask.id, fullTask);
        this.scheduleTask(fullTask);
        this.saveTasks();
        console.log(`Task scheduled: ${fullTask.name} (${fullTask.type})`);
        this.emit('task:added', fullTask);
        return fullTask;
    }
    scheduleTask(task) {
        if (!task.enabled)
            return;
        this.clearTaskTimeout(task.id);
        const nextRun = this.getNextRunTime(task);
        if (!nextRun)
            return;
        task.nextRun = nextRun;
        const delay = nextRun.getTime() - Date.now();
        if (delay <= 0) {
            this.executeTask(task);
        }
        else {
            const timeout = setTimeout(() => {
                this.executeTask(task);
            }, delay);
            this.timeouts.set(task.id, timeout);
        }
    }
    getNextRunTime(task) {
        const now = new Date();
        switch (task.type) {
            case 'once':
                if (typeof task.schedule !== 'object')
                    return null;
                const onceDate = new Date(task.schedule);
                return onceDate > now ? onceDate : null;
            case 'interval':
                if (typeof task.schedule !== 'number')
                    return null;
                return new Date(now.getTime() + task.schedule);
            case 'cron':
                return this.cronParser.getNextExecution(task.schedule, now);
            default:
                return null;
        }
    }
    async executeTask(task) {
        if (this.runningCount >= this.options.maxConcurrent) {
            console.warn(`Task "${task.name}" delayed: max concurrent tasks reached`);
            this.scheduleTask(task);
            return;
        }
        this.runningCount++;
        task.runCount++;
        task.lastRun = new Date();
        console.log(`Executing scheduled task: ${task.name}`);
        this.emit('task:executing', task);
        try {
            this.emit('task:run', {
                taskId: task.id,
                taskName: task.name,
                type: task.task.type,
                payload: task.task.payload,
            });
            await this.runTaskFunction(task);
            console.log(`Task completed: ${task.name}`);
            this.emit('task:completed', {
                taskId: task.id,
                taskName: task.name,
                runCount: task.runCount,
            });
        }
        catch (error) {
            console.error(`Task failed: ${task.name}`, error);
            this.emit('task:failed', {
                taskId: task.id,
                taskName: task.name,
                error: error instanceof Error ? error.message : String(error),
            });
        }
        finally {
            this.runningCount--;
            this.scheduleTask(task);
            this.saveTasks();
        }
    }
    async runTaskFunction(task) {
        switch (task.task.type) {
            case 'message':
                const { MessageRouter } = await import('../gateway/router.js');
                const router = new MessageRouter({});
                await router.handleFromCLI('scheduler', task.task.payload.message);
                break;
            case 'shell':
                const { shellExecutor } = await import('../execution/shell.js');
                await shellExecutor.execute({
                    command: task.task.payload.command,
                    args: task.task.payload.args,
                });
                break;
            case 'browser':
                const { browserExecutor } = await import('../execution/browser.js');
                await browserExecutor.navigate({
                    url: task.task.payload.url,
                });
                break;
            case 'workflow':
                const { agentSwarm } = await import('../agents/swarm.js');
                await agentSwarm.submitTask({
                    type: task.task.payload.taskType,
                    payload: task.task.payload,
                    priority: 1,
                });
                break;
            case 'custom':
                this.emit('custom:task', task);
                break;
            default:
                this.emit('task:unknown-type', task);
        }
    }
    removeTask(taskId) {
        const task = this.tasks.get(taskId);
        if (!task)
            return false;
        this.clearTaskTimeout(taskId);
        this.tasks.delete(taskId);
        this.saveTasks();
        console.log(`Task removed: ${task.name}`);
        this.emit('task:removed', task);
        return true;
    }
    updateTask(taskId, updates) {
        const task = this.tasks.get(taskId);
        if (!task)
            return null;
        const updatedTask = {
            ...task,
            ...updates,
            id: task.id,
            createdAt: task.createdAt,
            runCount: task.runCount,
            modifiedAt: new Date(),
        };
        this.tasks.set(taskId, updatedTask);
        this.scheduleTask(updatedTask);
        this.saveTasks();
        this.emit('task:updated', updatedTask);
        return updatedTask;
    }
    enableTask(taskId) {
        const task = this.tasks.get(taskId);
        if (!task)
            return false;
        task.enabled = true;
        task.modifiedAt = new Date();
        this.scheduleTask(task);
        this.saveTasks();
        this.emit('task:enabled', task);
        return true;
    }
    disableTask(taskId) {
        const task = this.tasks.get(taskId);
        if (!task)
            return false;
        task.enabled = false;
        task.modifiedAt = new Date();
        this.clearTaskTimeout(taskId);
        task.nextRun = undefined;
        this.saveTasks();
        this.emit('task:disabled', task);
        return true;
    }
    getTask(taskId) {
        return this.tasks.get(taskId);
    }
    getAllTasks() {
        return Array.from(this.tasks.values());
    }
    getEnabledTasks() {
        return Array.from(this.tasks.values()).filter((t) => t.enabled);
    }
    getStats() {
        const enabled = this.getEnabledTasks();
        let nextRun;
        for (const task of enabled) {
            if (task.nextRun && (!nextRun || task.nextRun < nextRun)) {
                nextRun = task.nextRun;
            }
        }
        return {
            totalTasks: this.tasks.size,
            enabledTasks: enabled.length,
            runningTasks: this.runningCount,
            nextScheduledRun: nextRun,
        };
    }
    checkSchedules() {
        const now = new Date();
        for (const task of this.tasks.values()) {
            if (!task.enabled || !task.nextRun)
                continue;
            if (task.nextRun <= now) {
                this.executeTask(task);
            }
        }
    }
    clearTaskTimeout(taskId) {
        const timeout = this.timeouts.get(taskId);
        if (timeout) {
            clearTimeout(timeout);
            this.timeouts.delete(taskId);
        }
    }
    saveTasks() {
        try {
            const data = JSON.stringify(Array.from(this.tasks.values()), null, 2);
            const { dirname } = require('path');
            const { mkdirSync, writeFileSync } = require('fs');
            const dir = dirname(this.options.persistencePath);
            if (!require('fs').existsSync(dir)) {
                mkdirSync(dir, { recursive: true });
            }
            writeFileSync(this.options.persistencePath, data);
        }
        catch (error) {
            console.error('Failed to save scheduler tasks:', error);
        }
    }
    loadTasks() {
        try {
            if (require('fs').existsSync(this.options.persistencePath)) {
                const data = require('fs').readFileSync(this.options.persistencePath, 'utf-8');
                const tasks = JSON.parse(data);
                for (const task of tasks) {
                    task.createdAt = new Date(task.createdAt);
                    task.modifiedAt = new Date(task.modifiedAt);
                    if (task.lastRun)
                        task.lastRun = new Date(task.lastRun);
                    if (task.nextRun)
                        task.nextRun = new Date(task.nextRun);
                    this.tasks.set(task.id, task);
                    this.scheduleTask(task);
                }
                console.log(`Loaded ${tasks.length} scheduled tasks`);
            }
        }
        catch (error) {
            console.error('Failed to load scheduler tasks:', error);
        }
    }
    async stop() {
        if (this.interval) {
            clearInterval(this.interval);
        }
        for (const timeout of this.timeouts.values()) {
            clearTimeout(timeout);
        }
        this.timeouts.clear();
        await this.saveTasks();
        console.log('Task scheduler stopped');
    }
}
class CronParser {
    timezone;
    constructor(timezone) {
        this.timezone = timezone;
    }
    getNextExecution(schedule, from = new Date()) {
        let date = new Date(from);
        const maxIterations = 366 * 24 * 60 * 60;
        let iterations = 0;
        while (iterations < maxIterations) {
            if (this.matchesSchedule(date, schedule)) {
                return date;
            }
            date = new Date(date.getTime() + 60000);
            iterations++;
        }
        return null;
    }
    matchesSchedule(date, schedule) {
        return (this.matchesField(date.getSeconds(), schedule.second) &&
            this.matchesField(date.getMinutes(), schedule.minute) &&
            this.matchesField(date.getHours(), schedule.hour) &&
            this.matchesField(date.getDate(), schedule.dayOfMonth) &&
            this.matchesField(date.getMonth() + 1, schedule.month) &&
            this.matchesField(date.getDay(), schedule.dayOfWeek));
    }
    matchesField(value, field) {
        if (field === undefined || field === '*')
            return true;
        if (typeof field === 'number') {
            return value === field;
        }
        if (field.startsWith('*/')) {
            const interval = parseInt(field.substring(2));
            return value % interval === 0;
        }
        if (field.includes('-')) {
            const [start, end] = field.split('-').map(Number);
            return value >= start && value <= end;
        }
        if (field.includes(',')) {
            const values = field.split(',').map(Number);
            return values.includes(value);
        }
        return false;
    }
}
export const taskScheduler = new TaskScheduler();
//# sourceMappingURL=index.js.map