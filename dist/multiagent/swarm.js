import { randomUUID } from 'crypto';
import { EventEmitter } from 'events';
/**
 * Enhanced Swarm implementation for multi-agent coordination
 */
export class EnhancedSwarm extends EventEmitter {
    agents = new Map();
    tasks = new Map();
    messageQueue = [];
    coordinatorId = null;
    config;
    stats;
    constructor(config) {
        super();
        this.config = {
            name: config?.name || 'default',
            workflow: config?.workflow || 'sequential',
            maxConcurrency: config?.maxConcurrency || 5,
            maxRetries: config?.maxRetries || 3,
        };
        this.stats = {
            totalTasks: 0,
            completedTasks: 0,
            failedTasks: 0,
            responseTimes: [],
        };
    }
    setConfig(config) {
        this.config = { ...this.config, ...config };
    }
    registerAgent(config) {
        this.agents.set(config.id, config);
        if (config.role === 'router') {
            this.coordinatorId = config.id;
        }
        console.log(`[Swarm] Agent registered: ${config.name} (${config.role})`);
        this.emit('agent:registered', config);
    }
    unregisterAgent(agentId) {
        const agent = this.agents.get(agentId);
        if (!agent)
            return false;
        this.agents.delete(agentId);
        if (this.coordinatorId === agentId) {
            this.coordinatorId = null;
            this.assignNewCoordinator();
        }
        console.log(`[Swarm] Agent unregistered: ${agent.name}`);
        this.emit('agent:unregistered', agent);
        return true;
    }
    assignNewCoordinator() {
        for (const [id, agent] of this.agents) {
            if (agent.role === 'router') {
                this.coordinatorId = id;
                return;
            }
        }
    }
    async submitTask(task) {
        const newTask = {
            ...task,
            id: randomUUID(),
            status: 'pending',
            createdAt: new Date(),
            updatedAt: new Date(),
        };
        this.tasks.set(newTask.id, newTask);
        this.stats.totalTasks++;
        console.log(`[Swarm] Task submitted: ${newTask.type} (priority: ${newTask.priority})`);
        this.emit('task:submitted', newTask);
        await this.dispatchTask(newTask.id);
        return newTask;
    }
    async dispatchTask(taskId) {
        const task = this.tasks.get(taskId);
        if (!task || task.status !== 'pending')
            return;
        const eligibleAgents = this.getEligibleAgents(task.type);
        if (eligibleAgents.length === 0) {
            console.warn(`[Swarm] No eligible agents for task: ${task.type}`);
            return;
        }
        if (this.config.workflow === 'parallel') {
            await this.dispatchParallel(taskId);
        }
        else if (this.config.workflow === 'hierarchical') {
            await this.dispatchHierarchical(taskId);
        }
        else {
            await this.dispatchSequential(taskId);
        }
    }
    async dispatchSequential(taskId) {
        const task = this.tasks.get(taskId);
        if (!task)
            return;
        const agent = this.getEligibleAgents(task.type)[0];
        await this.assignTask(task, agent);
    }
    async dispatchParallel(taskId) {
        const task = this.tasks.get(taskId);
        if (!task)
            return;
        const agents = this.getEligibleAgents(task.type).slice(0, this.config.maxConcurrency || 5);
        await Promise.all(agents.map((agent) => this.assignTask({ ...task, id: randomUUID() }, agent)));
    }
    async dispatchHierarchical(taskId) {
        const task = this.tasks.get(taskId);
        if (!task)
            return;
        if (this.coordinatorId) {
            const agent = this.agents.get(this.coordinatorId);
            if (agent) {
                await this.assignTask(task, agent);
                return;
            }
        }
        await this.dispatchSequential(taskId);
    }
    getEligibleAgents(taskType) {
        return Array.from(this.agents.values())
            .filter((agent) => {
            if (!agent.capabilities.includes(taskType) && !agent.capabilities.includes('*'))
                return false;
            if (agent.maxTasks && this.getAgentTaskCount(agent.id) >= agent.maxTasks)
                return false;
            return true;
        })
            .sort((a, b) => (b.priority || 0) - (a.priority || 0));
    }
    async assignTask(task, agent) {
        task.assignedTo = agent.id;
        task.status = 'assigned';
        task.updatedAt = new Date();
        console.log(`[Swarm] Task ${task.id} assigned to ${agent.name}`);
        this.emit('task:assigned', { task, agent });
        await this.sendMessage({
            id: randomUUID(),
            from: 'system',
            to: agent.id,
            type: 'task',
            payload: task,
            timestamp: new Date(),
        });
    }
    async completeTask(taskId, result) {
        const task = this.tasks.get(taskId);
        if (!task)
            return;
        task.status = 'completed';
        task.result = result;
        task.updatedAt = new Date();
        this.stats.completedTasks++;
        console.log(`[Swarm] Task completed: ${taskId}`);
        this.emit('task:completed', task);
        await this.checkDependencies(taskId);
    }
    async failTask(taskId, error) {
        const task = this.tasks.get(taskId);
        if (!task)
            return;
        task.status = 'failed';
        task.error = error;
        task.updatedAt = new Date();
        this.stats.failedTasks++;
        console.error(`[Swarm] Task failed: ${taskId} - ${error}`);
        this.emit('task:failed', task);
    }
    async checkDependencies(completedTaskId) {
        for (const [taskId, task] of this.tasks) {
            if (task.status === 'pending' && task.dependencies?.includes(completedTaskId)) {
                const allMet = task.dependencies.every((depId) => {
                    const dep = this.tasks.get(depId);
                    return dep?.status === 'completed';
                });
                if (allMet)
                    await this.dispatchTask(taskId);
            }
        }
    }
    async sendMessage(message) {
        message.id = randomUUID();
        this.messageQueue.push(message);
        const recipient = this.agents.get(message.to);
        if (recipient) {
            this.emit('message:send', message);
            console.log(`[Swarm] Message: ${message.from} -> ${message.to}`);
        }
    }
    async broadcast(type, payload, exclude) {
        for (const agent of this.agents.values()) {
            if (!exclude?.includes(agent.id)) {
                await this.sendMessage({
                    id: randomUUID(),
                    from: 'system',
                    to: agent.id,
                    type,
                    payload,
                    timestamp: new Date(),
                });
            }
        }
    }
    getAgentTaskCount(agentId) {
        return Array.from(this.tasks.values()).filter((t) => t.assignedTo === agentId && (t.status === 'assigned' || t.status === 'processing')).length;
    }
    getAgent(agentId) {
        return this.agents.get(agentId);
    }
    getAllAgents() {
        return Array.from(this.agents.values());
    }
    getTask(taskId) {
        return this.tasks.get(taskId);
    }
    getAllTasks() {
        return Array.from(this.tasks.values());
    }
    getPendingTasks() {
        return Array.from(this.tasks.values()).filter((t) => t.status === 'pending');
    }
    getStats() {
        const modelUsage = {};
        for (const task of this.tasks.values()) {
            const model = task.metadata?.modelUsed || 'unknown';
            modelUsage[model] = (modelUsage[model] || 0) + 1;
        }
        return {
            totalTasks: this.stats.totalTasks,
            completedTasks: this.stats.completedTasks,
            failedTasks: this.stats.failedTasks,
            avgResponseTime: this.stats.responseTimes.length
                ? this.stats.responseTimes.reduce((a, b) => a + b, 0) / this.stats.responseTimes.length
                : 0,
            modelUsage,
        };
    }
    async createTaskWorkflow(name, steps) {
        const taskIds = [];
        if (this.config.workflow === 'parallel') {
            const parallel = steps.filter((s) => !s.dependsOn || s.dependsOn.length === 0);
            const results = await Promise.all(parallel.map((step) => this.submitTask({ type: step.type, payload: step.payload, dependencies: step.dependsOn, priority: 1 })));
            taskIds.push(...results.map((r) => r.id));
        }
        else {
            for (const step of steps) {
                const task = await this.submitTask({ type: step.type, payload: step.payload, dependencies: step.dependsOn, priority: 1 });
                taskIds.push(task.id);
            }
        }
        console.log(`[Swarm] Workflow "${name}" created with ${taskIds.length} tasks`);
        this.emit('workflow:created', { name, taskIds });
        return taskIds;
    }
    clear() {
        this.tasks.clear();
        this.messageQueue = [];
        this.stats = { totalTasks: 0, completedTasks: 0, failedTasks: 0, responseTimes: [] };
        console.log('[Swarm] Cleared');
    }
}
/**
 * Enhanced Swarm Orchestrator for managing multiple swarms
 */
export class EnhancedSwarmOrchestrator {
    swarms = new Map();
    defaultSwarm;
    constructor() {
        this.defaultSwarm = new EnhancedSwarm();
        this.swarms.set('default', this.defaultSwarm);
    }
    createSwarm(name, config) {
        const swarm = new EnhancedSwarm(config);
        swarm.setConfig({ name });
        this.swarms.set(name, swarm);
        console.log(`[SwarmOrchestrator] Created swarm: ${name}`);
        return swarm;
    }
    getSwarm(name = 'default') {
        return this.swarms.get(name) || this.defaultSwarm;
    }
    deleteSwarm(name) {
        if (name === 'default')
            return false;
        return this.swarms.delete(name);
    }
    getAllSwarms() {
        return Array.from(this.swarms.keys());
    }
    async executeMultiSwarmTask(task, swarmNames) {
        const results = new Map();
        const swarms = swarmNames
            ? swarmNames.map((n) => this.swarms.get(n)).filter(Boolean)
            : Array.from(this.swarms.values());
        await Promise.all(swarms.map(async (swarm) => {
            const result = await swarm.submitTask(task);
            results.set(swarm.config?.name || 'default', result);
        }));
        return results;
    }
    getGlobalStats() {
        const stats = {};
        for (const [name, swarm] of this.swarms) {
            stats[name] = swarm.getStats();
        }
        return stats;
    }
}
export const enhancedSwarm = new EnhancedSwarm();
export const enhancedSwarmOrchestrator = new EnhancedSwarmOrchestrator();
//# sourceMappingURL=swarm.js.map