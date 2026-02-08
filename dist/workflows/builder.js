import { randomUUID } from 'crypto';
import { EventEmitter } from 'events';
export class WorkflowBuilder extends EventEmitter {
    workflows = new Map();
    executions = new Map();
    options;
    constructor(options = {}) {
        super();
        this.options = {
            maxNodes: options.maxNodes || 100,
            maxExecutionTime: options.maxExecutionTime || 300000,
            enableParallel: options.enableParallel !== false,
        };
    }
    createWorkflow(name, description) {
        const workflow = {
            id: randomUUID(),
            name,
            description,
            nodes: [],
            edges: [],
            createdAt: new Date(),
            modifiedAt: new Date(),
            enabled: false,
        };
        this.workflows.set(workflow.id, workflow);
        console.log(`Workflow created: ${name}`);
        this.emit('workflow:created', workflow);
        return workflow;
    }
    addNode(workflowId, type, name, position, config = {}) {
        const workflow = this.workflows.get(workflowId);
        if (!workflow)
            return null;
        if (workflow.nodes.length >= this.options.maxNodes) {
            throw new Error(`Maximum nodes (${this.options.maxNodes}) exceeded`);
        }
        const node = {
            id: randomUUID(),
            type,
            name,
            position,
            inputs: this.getDefaultInputs(type),
            outputs: this.getDefaultOutputs(type),
            config,
            status: 'pending',
        };
        workflow.nodes.push(node);
        workflow.modifiedAt = new Date();
        console.log(`Node added: ${name} (${type})`);
        this.emit('node:added', { workflowId, node });
        return node;
    }
    connect(workflowId, sourceNodeId, targetNodeId, label, condition) {
        const workflow = this.workflows.get(workflowId);
        if (!workflow)
            return null;
        const sourceNode = workflow.nodes.find((n) => n.id === sourceNodeId);
        const targetNode = workflow.nodes.find((n) => n.id === targetNodeId);
        if (!sourceNode || !targetNode)
            return null;
        const edge = {
            id: randomUUID(),
            source: sourceNodeId,
            target: targetNodeId,
            label,
            condition,
        };
        workflow.edges.push(edge);
        workflow.modifiedAt = new Date();
        console.log(`Connected ${sourceNode.name} -> ${targetNode.name}`);
        this.emit('edge:added', { workflowId, edge });
        return edge;
    }
    removeNode(workflowId, nodeId) {
        const workflow = this.workflows.get(workflowId);
        if (!workflow)
            return false;
        workflow.nodes = workflow.nodes.filter((n) => n.id !== nodeId);
        workflow.edges = workflow.edges.filter((e) => e.source !== nodeId && e.target !== nodeId);
        workflow.modifiedAt = new Date();
        console.log(`Node removed: ${nodeId}`);
        this.emit('node:removed', { workflowId, nodeId });
        return true;
    }
    async execute(workflowId, inputs = {}) {
        const workflow = this.workflows.get(workflowId);
        if (!workflow)
            throw new Error('Workflow not found');
        const execution = {
            id: randomUUID(),
            workflowId,
            status: 'running',
            inputs,
            outputs: {},
            logs: [],
            startedAt: new Date(),
        };
        this.executions.set(execution.id, execution);
        console.log(`Workflow execution started: ${workflow.name}`);
        this.emit('execution:started', execution);
        try {
            const result = await this.runWorkflow(workflow, execution);
            execution.status = 'completed';
            execution.outputs = result;
            execution.completedAt = new Date();
            console.log(`Workflow completed: ${workflow.name}`);
            this.emit('execution:completed', execution);
        }
        catch (error) {
            execution.status = 'failed';
            execution.error = error instanceof Error ? error.message : String(error);
            execution.completedAt = new Date();
            console.error(`Workflow failed: ${workflow.name}`, error);
            this.emit('execution:failed', execution);
        }
        return execution;
    }
    async runWorkflow(workflow, execution) {
        const results = {};
        const startNodes = this.getStartNodes(workflow);
        for (const node of startNodes) {
            const nodeResult = await this.executeNode(workflow, node, execution, results);
            if (nodeResult) {
                Object.assign(results, nodeResult);
            }
        }
        return results;
    }
    getStartNodes(workflow) {
        const hasIncoming = new Set(workflow.edges.map((e) => e.target));
        return workflow.nodes.filter((n) => !hasIncoming.has(n.id));
    }
    async executeNode(workflow, node, execution, context) {
        node.status = 'running';
        const startTime = Date.now();
        this.log(execution, node.id, 'info', `Executing node: ${node.name}`);
        try {
            const result = await this.runNodeAction(node, context, execution);
            node.status = 'completed';
            node.executionTime = Date.now() - startTime;
            this.log(execution, node.id, 'info', `Node completed: ${node.name}`, result);
            const dependentNodes = workflow.edges.filter((e) => e.source === node.id);
            for (const edge of dependentNodes) {
                const childNode = workflow.nodes.find((n) => n.id === edge.target);
                if (childNode) {
                    if (edge.condition && !this.evaluateCondition(edge.condition, result)) {
                        continue;
                    }
                    const childResult = await this.executeNode(workflow, childNode, execution, {
                        ...context,
                        ...result,
                    });
                    if (childResult) {
                        Object.assign(result, childResult);
                    }
                }
            }
            return { [node.name]: result };
        }
        catch (error) {
            node.status = 'failed';
            node.error = error instanceof Error ? error.message : String(error);
            this.log(execution, node.id, 'error', `Node failed: ${node.name}`, { error });
            throw error;
        }
    }
    async runNodeAction(node, context, execution) {
        switch (node.type) {
            case 'trigger':
                return { triggered: true, timestamp: new Date().toISOString() };
            case 'action':
                const { shellExecutor } = await import('../execution/shell.js');
                const shellResult = await shellExecutor.execute({
                    command: node.config.command,
                    args: node.config.args,
                });
                return { success: shellResult.success, output: shellResult.stdout };
            case 'api_call':
                const response = await fetch(node.config.url, {
                    method: node.config.method || 'GET',
                    headers: node.config.headers,
                });
                const data = await response.json();
                return { status: response.status, data };
            case 'transform':
                const inputData = context[node.config.inputKey] || {};
                return this.transformData(inputData, node.config.transformations);
            case 'notification':
                console.log(`Notification: ${node.config.message}`);
                return { sent: true, message: node.config.message };
            case 'agent':
                const { agentSwarm } = await import('../agents/swarm.js');
                const task = await agentSwarm.submitTask({
                    type: node.config.taskType,
                    payload: node.config.taskPayload,
                    priority: 1,
                });
                return { taskId: task.id, status: task.status };
            default:
                return { processed: true, node: node.name };
        }
    }
    transformData(data, transformations) {
        let result = data;
        if (transformations.pick) {
            const picked = {};
            for (const key of transformations.pick) {
                if (result[key] !== undefined) {
                    picked[key] = result[key];
                }
            }
            result = picked;
        }
        if (transformations.rename) {
            const renames = transformations.rename;
            for (const [oldKey, newKey] of Object.entries(renames)) {
                if (result[oldKey] !== undefined) {
                    result[newKey] = result[oldKey];
                    delete result[oldKey];
                }
            }
        }
        return result;
    }
    evaluateCondition(condition, context) {
        try {
            const fn = new Function('context', `with(context) { return ${condition}; }`);
            return Boolean(fn(context));
        }
        catch {
            return true;
        }
    }
    log(execution, nodeId, level, message, data) {
        const log = {
            timestamp: new Date(),
            nodeId,
            level,
            message,
            data,
        };
        execution.logs.push(log);
        this.emit('execution:log', { executionId: execution.id, log });
    }
    getWorkflow(workflowId) {
        return this.workflows.get(workflowId);
    }
    getAllWorkflows() {
        return Array.from(this.workflows.values());
    }
    getExecution(executionId) {
        return this.executions.get(executionId);
    }
    getWorkflowExecutions(workflowId) {
        return Array.from(this.executions.values()).filter((e) => e.workflowId === workflowId);
    }
    deleteWorkflow(workflowId) {
        const workflow = this.workflows.get(workflowId);
        if (!workflow)
            return false;
        this.workflows.delete(workflowId);
        const executions = this.getWorkflowExecutions(workflowId);
        for (const exec of executions) {
            exec.status = 'cancelled';
        }
        console.log(`Workflow deleted: ${workflow.name}`);
        this.emit('workflow:deleted', workflow);
        return true;
    }
    getDefaultInputs(type) {
        const inputs = [{ id: 'input', name: 'Input', type: 'any', required: false }];
        if (type === 'condition') {
            inputs.push({ id: 'condition', name: 'Condition', type: 'boolean', required: true });
        }
        return inputs;
    }
    getDefaultOutputs(type) {
        const outputs = [
            { id: 'output', name: 'Output', type: 'any', required: false },
        ];
        if (type === 'condition') {
            outputs.push({ id: 'true', name: 'True', type: 'any', required: false });
            outputs.push({ id: 'false', name: 'False', type: 'any', required: false });
        }
        return outputs;
    }
    exportWorkflow(workflowId) {
        const workflow = this.workflows.get(workflowId);
        return workflow ? JSON.stringify(workflow, null, 2) : null;
    }
    importWorkflow(data) {
        try {
            const workflow = JSON.parse(data);
            workflow.id = randomUUID();
            workflow.createdAt = new Date();
            workflow.modifiedAt = new Date();
            this.workflows.set(workflow.id, workflow);
            this.emit('workflow:imported', workflow);
            return workflow;
        }
        catch {
            return null;
        }
    }
    getStats() {
        const active = Array.from(this.executions.values()).filter((e) => e.status === 'running').length;
        return {
            workflowCount: this.workflows.size,
            executionCount: this.executions.size,
            activeExecutions: active,
        };
    }
}
export const workflowBuilder = new WorkflowBuilder();
//# sourceMappingURL=builder.js.map