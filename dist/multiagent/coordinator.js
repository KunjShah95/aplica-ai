import { randomUUID } from 'crypto';
import { EventEmitter } from 'events';
import { agentFactory } from './agent-factory.js';
import { taskRouter } from './router.js';
import { messageBus } from './message-bus.js';
/**
 * Multi-Agent Coordinator - Orchestrates all sub-agents and manages coordination
 */
export class MultiAgentCoordinator extends EventEmitter {
    agents = new Map();
    agentConfigs = new Map();
    tasks = new Map();
    agentFactory;
    taskRouter;
    messageBus;
    stats;
    costTracking = [];
    config;
    constructor(config) {
        super();
        this.agentFactory = agentFactory;
        this.taskRouter = taskRouter;
        this.messageBus = messageBus;
        this.stats = {
            totalTasks: 0,
            completedTasks: 0,
            failedTasks: 0,
            responseTimes: [],
        };
        this.config = {
            name: config?.name || 'default',
            workflow: config?.workflow || 'sequential',
            maxConcurrency: config?.maxConcurrency || 5,
            maxRetries: config?.maxRetries || 3,
            failFast: config?.failFast || false,
        };
        this.setupMessageHandlers();
    }
    /**
     * Setup message bus handlers
     */
    setupMessageHandlers() {
        this.messageBus.on('message:task', (msg) => {
            this.handleTaskMessage(msg);
        });
        this.messageBus.on('message:result', (msg) => {
            this.handleResultMessage(msg);
        });
        this.messageBus.on('message:status', (msg) => {
            this.handleStatusMessage(msg);
        });
    }
    /**
     * Register an agent instance
     */
    registerAgent(agent, config) {
        this.agents.set(config.id, agent);
        this.agentConfigs.set(config.id, config);
        console.log(`[Coordinator] Registered agent: ${config.name} (${config.role})`);
        this.emit('agent:registered', config);
    }
    /**
     * Unregister an agent
     */
    unregisterAgent(agentId) {
        const agent = this.agents.get(agentId);
        if (!agent)
            return false;
        this.agents.delete(agentId);
        this.agentConfigs.delete(agentId);
        console.log(`[Coordinator] Unregistered agent: ${agentId}`);
        this.emit('agent:unregistered', agentId);
        return true;
    }
    /**
     * Create and register a specialized agent
     */
    createAgent(config, llm, role, customId) {
        const agent = this.agentFactory.createAgent(config, llm, role, customId);
        const agentConfig = this.agentFactory.getAgentConfig(role);
        if (!agentConfig) {
            throw new Error(`Unknown agent role: ${role}`);
        }
        this.registerAgent(agent, {
            ...agentConfig,
            id: customId || agentConfig.id,
        });
        return agent;
    }
    /**
     * Submit a task to the coordinator
     */
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
        console.log(`[Coordinator] Task submitted: ${newTask.type} (priority: ${newTask.priority})`);
        this.emit('task:submitted', newTask);
        // Route the task to appropriate agent
        const routing = this.taskRouter.routeTask(this.toRoutingInput(newTask.payload));
        newTask.metadata = {
            modelUsed: routing.modelTier,
            modelConfidence: routing.confidence,
            routingReason: routing.reasoning,
        };
        if (this.config.workflow === 'parallel') {
            await this.dispatchTaskParallel(newTask.id);
        }
        else if (this.config.workflow === 'hierarchical') {
            await this.dispatchTaskHierarchical(newTask.id);
        }
        else if (this.config.workflow === 'peer_review') {
            await this.dispatchTaskPeerReview(newTask.id);
        }
        else if (this.config.workflow === 'debate') {
            await this.dispatchTaskDebate(newTask.id);
        }
        else {
            await this.dispatchTaskSequential(newTask.id);
        }
        return newTask;
    }
    /**
     * Dispatch task sequentially
     */
    async dispatchTaskSequential(taskId) {
        const task = this.tasks.get(taskId);
        if (!task || task.status !== 'pending')
            return;
        const routing = this.taskRouter.routeTask(this.toRoutingInput(task.payload));
        const agent = this.agents.get(routing.agentRole);
        if (agent) {
            task.assignedTo = routing.agentRole;
            task.status = 'assigned';
            await this.messageBus.publish({
                from: 'system',
                to: routing.agentRole,
                type: 'task',
                payload: task,
            });
        }
        else {
            console.warn(`[Coordinator] No agent found for role: ${routing.agentRole}`);
        }
    }
    /**
     * Dispatch task in parallel to multiple agents
     */
    async dispatchTaskParallel(taskId) {
        const task = this.tasks.get(taskId);
        if (!task || task.status !== 'pending')
            return;
        const availableAgents = this.getEligibleAgents(task.type);
        const maxConcurrency = this.config.maxConcurrency || 5;
        const agents = availableAgents.slice(0, maxConcurrency);
        for (const agentConfig of agents) {
            const parallelTask = {
                ...task,
                id: randomUUID(),
                assignedTo: agentConfig.id,
                status: 'assigned',
                createdAt: new Date(),
                updatedAt: new Date(),
            };
            await this.messageBus.publish({
                from: 'system',
                to: agentConfig.id,
                type: 'task',
                payload: parallelTask,
            });
        }
    }
    /**
     * Dispatch task hierarchically (through router)
     */
    async dispatchTaskHierarchical(taskId) {
        const task = this.tasks.get(taskId);
        if (!task || task.status !== 'pending')
            return;
        const routerAgent = this.agents.get('brain:router');
        if (routerAgent) {
            task.assignedTo = 'brain:router';
            task.status = 'assigned';
            await this.messageBus.publish({
                from: 'system',
                to: 'brain:router',
                type: 'task',
                payload: task,
            });
        }
        else {
            await this.dispatchTaskSequential(taskId);
        }
    }
    /**
     * Dispatch task through peer review (drafter + critic)
     */
    async dispatchTaskPeerReview(taskId) {
        const task = this.tasks.get(taskId);
        if (!task || task.status !== 'pending')
            return;
        // Create draft task
        const draftTask = {
            ...task,
            id: randomUUID(),
            type: 'draft:' + task.type,
            status: 'assigned',
            createdAt: new Date(),
            updatedAt: new Date(),
        };
        await this.messageBus.publish({
            from: 'system',
            to: 'team:drafter',
            type: 'task',
            payload: draftTask,
        });
        // Schedule critic task (depends on draft completion)
        const criticTask = {
            ...task,
            id: randomUUID(),
            type: 'review:' + task.type,
            status: 'pending',
            dependencies: [draftTask.id],
            createdAt: new Date(),
            updatedAt: new Date(),
        };
        this.tasks.set(criticTask.id, criticTask);
        this.stats.totalTasks++;
    }
    /**
     * Dispatch task through debate mode
     */
    async dispatchTaskDebate(taskId) {
        const task = this.tasks.get(taskId);
        if (!task || task.status !== 'pending')
            return;
        // Create debate task with two sides
        const proTask = {
            ...task,
            id: randomUUID(),
            type: 'debate:pro',
            status: 'debating',
            createdAt: new Date(),
            updatedAt: new Date(),
        };
        const conTask = {
            ...task,
            id: randomUUID(),
            type: 'debate:con',
            status: 'debating',
            createdAt: new Date(),
            updatedAt: new Date(),
        };
        await this.messageBus.publish({
            from: 'system',
            to: 'team:debater',
            type: 'task',
            payload: proTask,
        });
        await this.messageBus.publish({
            from: 'system',
            to: 'team:debater',
            type: 'task',
            payload: conTask,
        });
        // Store debate tasks
        this.tasks.set(proTask.id, proTask);
        this.tasks.set(conTask.id, conTask);
        this.stats.totalTasks += 2;
    }
    /**
     * Get eligible agents for a task type
     */
    getEligibleAgents(taskType) {
        return Array.from(this.agentConfigs.values())
            .filter((agent) => {
            if (!agent.capabilities.includes(taskType) && !agent.capabilities.includes('*')) {
                return false;
            }
            if (agent.maxTasks) {
                const activeTasks = this.getAgentTaskCount(agent.id);
                if (activeTasks >= agent.maxTasks)
                    return false;
            }
            return true;
        })
            .sort((a, b) => (b.priority || 0) - (a.priority || 0));
    }
    /**
     * Get task count for an agent
     */
    getAgentTaskCount(agentId) {
        return Array.from(this.tasks.values()).filter((t) => t.assignedTo === agentId && (t.status === 'assigned' || t.status === 'processing')).length;
    }
    /**
     * Handle task messages from message bus
     */
    async handleTaskMessage(msg) {
        const task = msg.payload;
        console.log(`[Coordinator] Task message received: ${task.type} for ${task.id}`);
    }
    /**
     * Handle result messages from message bus
     */
    async handleResultMessage(msg) {
        const { taskId, result, error } = msg.payload;
        const task = this.tasks.get(taskId);
        if (task) {
            if (error) {
                task.status = 'failed';
                task.error = error;
                this.stats.failedTasks++;
                console.error(`[Coordinator] Task failed: ${taskId} - ${error}`);
            }
            else {
                task.status = 'completed';
                task.result = result;
                this.stats.completedTasks++;
                console.log(`[Coordinator] Task completed: ${taskId}`);
            }
            task.updatedAt = new Date();
            this.emit('task:completed', task);
        }
    }
    /**
     * Handle status messages from message bus
     */
    async handleStatusMessage(msg) {
        const status = msg.payload;
        if (status.type === 'cost_update') {
            this.costTracking.push(status.data);
        }
        if (status.type === 'stats_update') {
            this.emit('stats:updated', status.data);
        }
    }
    /**
     * Get agent by role
     */
    getAgentByRole(role) {
        const config = this.agentFactory.getAgentConfig(role);
        if (!config)
            return undefined;
        return this.agents.get(config.id);
    }
    /**
     * Get all agents
     */
    getAllAgents() {
        return Array.from(this.agents.values());
    }
    /**
     * Get all agent configs
     */
    getAllAgentConfigs() {
        return Array.from(this.agentConfigs.values());
    }
    /**
     * Get agent stats
     */
    getAgentStats() {
        return {
            totalTasks: this.stats.totalTasks,
            completedTasks: this.stats.completedTasks,
            failedTasks: this.stats.failedTasks,
            avgResponseTime: this.stats.responseTimes.length > 0
                ? this.stats.responseTimes.reduce((a, b) => a + b, 0) / this.stats.responseTimes.length
                : 0,
            modelUsage: this.getModelUsage(),
            totalCost: this.costTracking.reduce((a, c) => a + c.cost, 0),
        };
    }
    /**
     * Get model usage statistics
     */
    getModelUsage() {
        const usage = {};
        for (const task of this.tasks.values()) {
            const model = task.metadata?.modelUsed || 'unknown';
            usage[model] = (usage[model] || 0) + 1;
        }
        return usage;
    }
    /**
     * Get cost tracking data
     */
    getCostTracking() {
        return this.costTracking;
    }
    /**
     * Get task by ID
     */
    getTask(taskId) {
        return this.tasks.get(taskId);
    }
    /**
     * Get all tasks
     */
    getAllTasks() {
        return Array.from(this.tasks.values());
    }
    /**
     * Get pending tasks
     */
    getPendingTasks() {
        return Array.from(this.tasks.values()).filter((t) => t.status === 'pending');
    }
    /**
     * Get active tasks
     */
    getActiveTasks() {
        return Array.from(this.tasks.values()).filter((t) => t.status === 'assigned' || t.status === 'processing' || t.status === 'debating');
    }
    /**
     * Clear all tasks
     */
    clearTasks() {
        this.tasks.clear();
        this.stats = {
            totalTasks: 0,
            completedTasks: 0,
            failedTasks: 0,
            responseTimes: [],
        };
        console.log('[Coordinator] Tasks cleared');
    }
    /**
     * Update workflow configuration
     */
    setWorkflowConfig(config) {
        this.config = { ...this.config, ...config };
        console.log(`[Coordinator] Workflow config updated: ${this.config.workflow}`);
    }
    /**
     * Get coordinator status
     */
    getStatus() {
        return {
            name: this.config.name,
            workflow: this.config.workflow,
            totalAgents: this.agents.size,
            totalTasks: this.stats.totalTasks,
            activeTasks: this.getActiveTasks().length,
            completedTasks: this.stats.completedTasks,
            failedTasks: this.stats.failedTasks,
            agents: Array.from(this.agentConfigs.values()).map((a) => ({
                id: a.id,
                role: a.role,
                name: a.name,
            })),
        };
    }
    toRoutingInput(payload) {
        if (typeof payload['text'] === 'string')
            return payload['text'];
        if (typeof payload['content'] === 'string')
            return payload['content'];
        if (typeof payload['task'] === 'string')
            return payload['task'];
        try {
            return JSON.stringify(payload);
        }
        catch {
            return String(payload);
        }
    }
}
/**
 * Global coordinator instance
 */
export const multiAgentCoordinator = new MultiAgentCoordinator();
//# sourceMappingURL=coordinator.js.map