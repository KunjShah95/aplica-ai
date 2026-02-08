import { randomUUID } from 'crypto';
import { EventEmitter } from 'events';
export class AgentSwarm extends EventEmitter {
    agents = new Map();
    tasks = new Map();
    messageQueue = [];
    coordinator = null;
    stats;
    constructor() {
        super();
        this.stats = {
            totalTasks: 0,
            completedTasks: 0,
            failedTasks: 0,
            responseTimes: [],
        };
    }
    registerAgent(config) {
        this.agents.set(config.id, config);
        if (config.role === 'coordinator') {
            this.coordinator = config.id;
        }
        console.log(`Agent registered: ${config.name} (${config.role})`);
        this.emit('agent:registered', config);
    }
    unregisterAgent(agentId) {
        const agent = this.agents.get(agentId);
        if (!agent)
            return false;
        this.agents.delete(agentId);
        if (this.coordinator === agentId) {
            this.coordinator = null;
            this.assignNewCoordinator();
        }
        console.log(`Agent unregistered: ${agent.name}`);
        this.emit('agent:unregistered', agent);
        return true;
    }
    assignNewCoordinator() {
        for (const [id, agent] of this.agents) {
            if (agent.role === 'coordinator') {
                this.coordinator = id;
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
        console.log(`Task submitted: ${newTask.type} (priority: ${newTask.priority})`);
        this.emit('task:submitted', newTask);
        await this.dispatchTask(newTask.id);
        return newTask;
    }
    async dispatchTask(taskId) {
        const task = this.tasks.get(taskId);
        if (!task || task.status !== 'pending')
            return;
        const eligibleAgents = Array.from(this.agents.values())
            .filter((agent) => {
            if (!agent.capabilities.includes(task.type))
                return false;
            if (agent.maxTasks && this.getAgentTaskCount(agent.id) >= agent.maxTasks)
                return false;
            return true;
        })
            .sort((a, b) => (b.priority || 0) - (a.priority || 0));
        if (eligibleAgents.length === 0) {
            console.warn(`No eligible agents for task: ${task.type}`);
            return;
        }
        const selectedAgent = eligibleAgents[0];
        task.assignedTo = selectedAgent.id;
        task.status = 'assigned';
        task.updatedAt = new Date();
        console.log(`Task ${taskId} assigned to ${selectedAgent.name}`);
        this.emit('task:assigned', { task, agent: selectedAgent });
        await this.sendMessage({
            id: randomUUID(),
            from: 'system',
            to: selectedAgent.id,
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
        console.log(`Task completed: ${taskId}`);
        this.emit('task:completed', task);
        if (task.assignedTo) {
            await this.sendMessage({
                id: randomUUID(),
                from: 'system',
                to: task.assignedTo,
                type: 'result',
                payload: { taskId, result },
                timestamp: new Date(),
            });
        }
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
        console.error(`Task failed: ${taskId} - ${error}`);
        this.emit('task:failed', task);
        if (task.assignedTo) {
            await this.sendMessage({
                id: randomUUID(),
                from: 'system',
                to: task.assignedTo,
                type: 'result',
                payload: { taskId, error },
                timestamp: new Date(),
            });
        }
    }
    async checkDependencies(completedTaskId) {
        for (const [taskId, task] of this.tasks) {
            if (task.status === 'pending' && task.dependencies?.includes(completedTaskId)) {
                const allDepsMet = task.dependencies.every((depId) => {
                    const depTask = this.tasks.get(depId);
                    return depTask?.status === 'completed';
                });
                if (allDepsMet) {
                    await this.dispatchTask(taskId);
                }
            }
        }
    }
    async sendMessage(message) {
        message.id = randomUUID();
        this.messageQueue.push(message);
        const recipient = this.agents.get(message.to);
        if (recipient) {
            this.emit('message:send', message);
            console.log(`Message from ${message.from} to ${message.to}: ${message.type}`);
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
        let count = 0;
        for (const task of this.tasks.values()) {
            if (task.assignedTo === agentId &&
                (task.status === 'assigned' || task.status === 'processing')) {
                count++;
            }
        }
        return count;
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
        const activeTasks = Array.from(this.tasks.values()).filter((t) => t.status === 'assigned' || t.status === 'processing').length;
        const avgResponseTime = this.stats.responseTimes.length > 0
            ? this.stats.responseTimes.reduce((a, b) => a + b, 0) / this.stats.responseTimes.length
            : 0;
        return {
            totalAgents: this.agents.size,
            activeTasks,
            completedTasks: this.stats.completedTasks,
            failedTasks: this.stats.failedTasks,
            avgResponseTime,
        };
    }
    async createTaskWorkflow(name, steps) {
        const taskIds = [];
        for (const step of steps) {
            const task = await this.submitTask({
                type: step.type,
                payload: step.payload,
                dependencies: step.dependsOn,
                priority: 1,
            });
            taskIds.push(task.id);
        }
        console.log(`Workflow "${name}" created with ${taskIds.length} tasks`);
        this.emit('workflow:created', { name, taskIds });
        return taskIds;
    }
}
export const agentSwarm = new AgentSwarm();
//# sourceMappingURL=swarm.js.map