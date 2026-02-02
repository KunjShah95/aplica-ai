import { EventEmitter } from 'events';
import { randomUUID } from 'crypto';

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

export class TaskScheduler extends EventEmitter {
  private tasks: Map<string, ScheduledTask> = new Map();
  private timeouts: Map<string, NodeJS.Timeout> = new Map();
  private interval: NodeJS.Timeout | null = null;
  private runningCount: number = 0;
  private options: Required<SchedulerOptions>;
  private cronParser: CronParser;

  constructor(options: SchedulerOptions = {}) {
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

  private start(): void {
    this.interval = setInterval(() => {
      this.checkSchedules();
    }, 1000);
    console.log(`Task scheduler started (timezone: ${this.options.timezone})`);
  }

  addTask(
    task: Omit<ScheduledTask, 'id' | 'createdAt' | 'modifiedAt' | 'runCount'>
  ): ScheduledTask {
    const fullTask: ScheduledTask = {
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

  private scheduleTask(task: ScheduledTask): void {
    if (!task.enabled) return;

    this.clearTaskTimeout(task.id);

    const nextRun = this.getNextRunTime(task);
    if (!nextRun) return;

    task.nextRun = nextRun;
    const delay = nextRun.getTime() - Date.now();

    if (delay <= 0) {
      this.executeTask(task);
    } else {
      const timeout = setTimeout(() => {
        this.executeTask(task);
      }, delay);
      this.timeouts.set(task.id, timeout);
    }
  }

  private getNextRunTime(task: ScheduledTask): Date | null {
    const now = new Date();

    switch (task.type) {
      case 'once':
        if (typeof task.schedule !== 'object') return null;
        const onceDate = new Date(task.schedule as unknown as string);
        return onceDate > now ? onceDate : null;

      case 'interval':
        if (typeof task.schedule !== 'number') return null;
        return new Date(now.getTime() + task.schedule);

      case 'cron':
        return this.cronParser.getNextExecution(task.schedule as CronSchedule, now);

      default:
        return null;
    }
  }

  async executeTask(task: ScheduledTask): Promise<void> {
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
    } catch (error) {
      console.error(`Task failed: ${task.name}`, error);
      this.emit('task:failed', {
        taskId: task.id,
        taskName: task.name,
        error: error instanceof Error ? error.message : String(error),
      });
    } finally {
      this.runningCount--;
      this.scheduleTask(task);
      this.saveTasks();
    }
  }

  private async runTaskFunction(task: ScheduledTask): Promise<void> {
    switch (task.task.type) {
      case 'message':
        const { MessageRouter } = await import('../gateway/router.js');
        const router = new MessageRouter({} as any);
        await router.handleFromCLI('scheduler', task.task.payload.message as string);
        break;

      case 'shell':
        const { shellExecutor } = await import('../execution/shell.js');
        await shellExecutor.execute({
          command: task.task.payload.command as string,
          args: task.task.payload.args as string[],
        });
        break;

      case 'browser':
        const { browserExecutor } = await import('../execution/browser.js');
        await browserExecutor.navigate({
          url: task.task.payload.url as string,
        });
        break;

      case 'workflow':
        const { agentSwarm } = await import('../agents/swarm.js');
        await agentSwarm.submitTask({
          type: task.task.payload.taskType as string,
          payload: task.task.payload as Record<string, unknown>,
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

  removeTask(taskId: string): boolean {
    const task = this.tasks.get(taskId);
    if (!task) return false;

    this.clearTaskTimeout(taskId);
    this.tasks.delete(taskId);
    this.saveTasks();

    console.log(`Task removed: ${task.name}`);
    this.emit('task:removed', task);

    return true;
  }

  updateTask(taskId: string, updates: Partial<ScheduledTask>): ScheduledTask | null {
    const task = this.tasks.get(taskId);
    if (!task) return null;

    const updatedTask: ScheduledTask = {
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

  enableTask(taskId: string): boolean {
    const task = this.tasks.get(taskId);
    if (!task) return false;

    task.enabled = true;
    task.modifiedAt = new Date();
    this.scheduleTask(task);
    this.saveTasks();

    this.emit('task:enabled', task);
    return true;
  }

  disableTask(taskId: string): boolean {
    const task = this.tasks.get(taskId);
    if (!task) return false;

    task.enabled = false;
    task.modifiedAt = new Date();
    this.clearTaskTimeout(taskId);
    task.nextRun = undefined;
    this.saveTasks();

    this.emit('task:disabled', task);
    return true;
  }

  getTask(taskId: string): ScheduledTask | undefined {
    return this.tasks.get(taskId);
  }

  getAllTasks(): ScheduledTask[] {
    return Array.from(this.tasks.values());
  }

  getEnabledTasks(): ScheduledTask[] {
    return Array.from(this.tasks.values()).filter((t) => t.enabled);
  }

  getStats(): SchedulerStats {
    const enabled = this.getEnabledTasks();
    let nextRun: Date | undefined;

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

  private checkSchedules(): void {
    const now = new Date();

    for (const task of this.tasks.values()) {
      if (!task.enabled || !task.nextRun) continue;

      if (task.nextRun <= now) {
        this.executeTask(task);
      }
    }
  }

  private clearTaskTimeout(taskId: string): void {
    const timeout = this.timeouts.get(taskId);
    if (timeout) {
      clearTimeout(timeout);
      this.timeouts.delete(taskId);
    }
  }

  private saveTasks(): void {
    try {
      const data = JSON.stringify(Array.from(this.tasks.values()), null, 2);
      const { dirname } = require('path');
      const { mkdirSync, writeFileSync } = require('fs');
      const dir = dirname(this.options.persistencePath);
      if (!require('fs').existsSync(dir)) {
        mkdirSync(dir, { recursive: true });
      }
      writeFileSync(this.options.persistencePath, data);
    } catch (error) {
      console.error('Failed to save scheduler tasks:', error);
    }
  }

  private loadTasks(): void {
    try {
      if (require('fs').existsSync(this.options.persistencePath)) {
        const data = require('fs').readFileSync(this.options.persistencePath, 'utf-8');
        const tasks = JSON.parse(data) as ScheduledTask[];

        for (const task of tasks) {
          task.createdAt = new Date(task.createdAt);
          task.modifiedAt = new Date(task.modifiedAt);
          if (task.lastRun) task.lastRun = new Date(task.lastRun);
          if (task.nextRun) task.nextRun = new Date(task.nextRun);

          this.tasks.set(task.id, task);
          this.scheduleTask(task);
        }

        console.log(`Loaded ${tasks.length} scheduled tasks`);
      }
    } catch (error) {
      console.error('Failed to load scheduler tasks:', error);
    }
  }

  async stop(): Promise<void> {
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
  private timezone: string;

  constructor(timezone: string) {
    this.timezone = timezone;
  }

  getNextExecution(schedule: CronSchedule, from: Date = new Date()): Date | null {
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

  private matchesSchedule(date: Date, schedule: CronSchedule): boolean {
    return (
      this.matchesField(date.getSeconds(), schedule.second) &&
      this.matchesField(date.getMinutes(), schedule.minute) &&
      this.matchesField(date.getHours(), schedule.hour) &&
      this.matchesField(date.getDate(), schedule.dayOfMonth) &&
      this.matchesField(date.getMonth() + 1, schedule.month) &&
      this.matchesField(date.getDay(), schedule.dayOfWeek)
    );
  }

  private matchesField(value: number, field: CronField | undefined): boolean {
    if (field === undefined || field === '*') return true;

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
