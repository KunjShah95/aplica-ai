import { randomUUID } from 'crypto';
import { EventEmitter } from 'events';

export type NodeType =
  | 'trigger'
  | 'action'
  | 'condition'
  | 'loop'
  | 'parallel'
  | 'api_call'
  | 'transform'
  | 'notification'
  | 'agent';

export interface WorkflowNode {
  id: string;
  type: NodeType;
  name: string;
  position: { x: number; y: number };
  inputs: WorkflowPort[];
  outputs: WorkflowPort[];
  config: Record<string, unknown>;
  status: 'pending' | 'running' | 'completed' | 'failed';
  error?: string;
  executionTime?: number;
}

export interface WorkflowPort {
  id: string;
  name: string;
  type: 'any' | 'string' | 'number' | 'boolean' | 'object' | 'array';
  required: boolean;
}

export interface WorkflowEdge {
  id: string;
  source: string;
  target: string;
  label?: string;
  condition?: string;
}

export interface Workflow {
  id: string;
  name: string;
  description?: string;
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
  createdAt: Date;
  modifiedAt: Date;
  enabled: boolean;
  trigger?: {
    type: 'manual' | 'schedule' | 'webhook' | 'event';
    config: Record<string, unknown>;
  };
  metadata?: Record<string, unknown>;
}

export interface WorkflowExecution {
  id: string;
  workflowId: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  currentNode?: string;
  inputs: Record<string, unknown>;
  outputs: Record<string, unknown>;
  logs: WorkflowLog[];
  startedAt: Date;
  completedAt?: Date;
  error?: string;
}

export interface WorkflowLog {
  timestamp: Date;
  nodeId: string;
  level: 'info' | 'warn' | 'error';
  message: string;
  data?: unknown;
}

export interface WorkflowBuilderOptions {
  maxNodes?: number;
  maxExecutionTime?: number;
  enableParallel?: boolean;
}

export class WorkflowBuilder extends EventEmitter {
  private workflows: Map<string, Workflow> = new Map();
  private executions: Map<string, WorkflowExecution> = new Map();
  private options: Required<WorkflowBuilderOptions>;

  constructor(options: WorkflowBuilderOptions = {}) {
    super();
    this.options = {
      maxNodes: options.maxNodes || 100,
      maxExecutionTime: options.maxExecutionTime || 300000,
      enableParallel: options.enableParallel !== false,
    };
  }

  createWorkflow(name: string, description?: string): Workflow {
    const workflow: Workflow = {
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

  addNode(
    workflowId: string,
    type: NodeType,
    name: string,
    position: { x: number; y: number },
    config: Record<string, unknown> = {}
  ): WorkflowNode | null {
    const workflow = this.workflows.get(workflowId);
    if (!workflow) return null;

    if (workflow.nodes.length >= this.options.maxNodes) {
      throw new Error(`Maximum nodes (${this.options.maxNodes}) exceeded`);
    }

    const node: WorkflowNode = {
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

  connect(
    workflowId: string,
    sourceNodeId: string,
    targetNodeId: string,
    label?: string,
    condition?: string
  ): WorkflowEdge | null {
    const workflow = this.workflows.get(workflowId);
    if (!workflow) return null;

    const sourceNode = workflow.nodes.find((n) => n.id === sourceNodeId);
    const targetNode = workflow.nodes.find((n) => n.id === targetNodeId);

    if (!sourceNode || !targetNode) return null;

    const edge: WorkflowEdge = {
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

  removeNode(workflowId: string, nodeId: string): boolean {
    const workflow = this.workflows.get(workflowId);
    if (!workflow) return false;

    workflow.nodes = workflow.nodes.filter((n) => n.id !== nodeId);
    workflow.edges = workflow.edges.filter((e) => e.source !== nodeId && e.target !== nodeId);
    workflow.modifiedAt = new Date();

    console.log(`Node removed: ${nodeId}`);
    this.emit('node:removed', { workflowId, nodeId });

    return true;
  }

  async execute(
    workflowId: string,
    inputs: Record<string, unknown> = {}
  ): Promise<WorkflowExecution> {
    const workflow = this.workflows.get(workflowId);
    if (!workflow) throw new Error('Workflow not found');

    const execution: WorkflowExecution = {
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
    } catch (error) {
      execution.status = 'failed';
      execution.error = error instanceof Error ? error.message : String(error);
      execution.completedAt = new Date();

      console.error(`Workflow failed: ${workflow.name}`, error);
      this.emit('execution:failed', execution);
    }

    return execution;
  }

  private async runWorkflow(
    workflow: Workflow,
    execution: WorkflowExecution
  ): Promise<Record<string, unknown>> {
    const results: Record<string, unknown> = {};
    const startNodes = this.getStartNodes(workflow);

    for (const node of startNodes) {
      const nodeResult = await this.executeNode(workflow, node, execution, results);
      if (nodeResult) {
        Object.assign(results, nodeResult);
      }
    }

    return results;
  }

  private getStartNodes(workflow: Workflow): WorkflowNode[] {
    const hasIncoming = new Set(workflow.edges.map((e) => e.target));
    return workflow.nodes.filter((n) => !hasIncoming.has(n.id));
  }

  private async executeNode(
    workflow: Workflow,
    node: WorkflowNode,
    execution: WorkflowExecution,
    context: Record<string, unknown>
  ): Promise<Record<string, unknown> | null> {
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
    } catch (error) {
      node.status = 'failed';
      node.error = error instanceof Error ? error.message : String(error);
      this.log(execution, node.id, 'error', `Node failed: ${node.name}`, { error });
      throw error;
    }
  }

  private async runNodeAction(
    node: WorkflowNode,
    context: Record<string, unknown>,
    execution: WorkflowExecution
  ): Promise<Record<string, unknown>> {
    switch (node.type) {
      case 'trigger':
        return { triggered: true, timestamp: new Date().toISOString() };

      case 'action':
        const { shellExecutor } = await import('../execution/shell.js');
        const shellResult = await shellExecutor.execute({
          command: node.config.command as string,
          args: node.config.args as string[],
        });
        return { success: shellResult.success, output: shellResult.stdout };

      case 'api_call':
        const response = await fetch(node.config.url as string, {
          method: (node.config.method as string) || 'GET',
          headers: node.config.headers as Record<string, string>,
        });
        const data = await response.json();
        return { status: response.status, data };

      case 'transform':
        const inputData = context[node.config.inputKey as string] || {};
        return this.transformData(
          inputData,
          node.config.transformations as Record<string, unknown>
        );

      case 'notification':
        console.log(`Notification: ${node.config.message}`);
        return { sent: true, message: node.config.message };

      case 'agent':
        const { agentSwarm } = await import('../agents/swarm.js');
        const task = await agentSwarm.submitTask({
          type: node.config.taskType as string,
          payload: node.config.taskPayload as Record<string, unknown>,
          priority: 1,
        });
        return { taskId: task.id, status: task.status };

      default:
        return { processed: true, node: node.name };
    }
  }

  private transformData(
    data: unknown,
    transformations: Record<string, unknown>
  ): Record<string, unknown> {
    let result = data as Record<string, unknown>;

    if (transformations.pick) {
      const picked: Record<string, unknown> = {};
      for (const key of transformations.pick as string[]) {
        if (result[key] !== undefined) {
          picked[key] = result[key];
        }
      }
      result = picked;
    }

    if (transformations.rename) {
      const renames = transformations.rename as Record<string, string>;
      for (const [oldKey, newKey] of Object.entries(renames)) {
        if (result[oldKey] !== undefined) {
          result[newKey] = result[oldKey];
          delete result[oldKey];
        }
      }
    }

    return result;
  }

  private evaluateCondition(condition: string, context: Record<string, unknown>): boolean {
    try {
      const vm = require('vm');
      return Boolean(vm.runInNewContext(condition, context));
    } catch {
      return true;
    }
  }

  private log(
    execution: WorkflowExecution,
    nodeId: string,
    level: 'info' | 'warn' | 'error',
    message: string,
    data?: unknown
  ): void {
    const log: WorkflowLog = {
      timestamp: new Date(),
      nodeId,
      level,
      message,
      data,
    };
    execution.logs.push(log);
    this.emit('execution:log', { executionId: execution.id, log });
  }

  getWorkflow(workflowId: string): Workflow | undefined {
    return this.workflows.get(workflowId);
  }

  getAllWorkflows(): Workflow[] {
    return Array.from(this.workflows.values());
  }

  getExecution(executionId: string): WorkflowExecution | undefined {
    return this.executions.get(executionId);
  }

  getWorkflowExecutions(workflowId: string): WorkflowExecution[] {
    return Array.from(this.executions.values()).filter((e) => e.workflowId === workflowId);
  }

  deleteWorkflow(workflowId: string): boolean {
    const workflow = this.workflows.get(workflowId);
    if (!workflow) return false;

    this.workflows.delete(workflowId);

    const executions = this.getWorkflowExecutions(workflowId);
    for (const exec of executions) {
      exec.status = 'cancelled';
    }

    console.log(`Workflow deleted: ${workflow.name}`);
    this.emit('workflow:deleted', workflow);

    return true;
  }

  private getDefaultInputs(type: NodeType): WorkflowPort[] {
    const inputs: WorkflowPort[] = [{ id: 'input', name: 'Input', type: 'any', required: false }];

    if (type === 'condition') {
      inputs.push({ id: 'condition', name: 'Condition', type: 'boolean', required: true });
    }

    return inputs;
  }

  private getDefaultOutputs(type: NodeType): WorkflowPort[] {
    const outputs: WorkflowPort[] = [
      { id: 'output', name: 'Output', type: 'any', required: false },
    ];

    if (type === 'condition') {
      outputs.push({ id: 'true', name: 'True', type: 'any', required: false });
      outputs.push({ id: 'false', name: 'False', type: 'any', required: false });
    }

    return outputs;
  }

  exportWorkflow(workflowId: string): string | null {
    const workflow = this.workflows.get(workflowId);
    return workflow ? JSON.stringify(workflow, null, 2) : null;
  }

  importWorkflow(data: string): Workflow | null {
    try {
      const workflow = JSON.parse(data) as Workflow;
      workflow.id = randomUUID();
      workflow.createdAt = new Date();
      workflow.modifiedAt = new Date();

      this.workflows.set(workflow.id, workflow);
      this.emit('workflow:imported', workflow);

      return workflow;
    } catch {
      return null;
    }
  }

  getStats(): { workflowCount: number; executionCount: number; activeExecutions: number } {
    const active = Array.from(this.executions.values()).filter(
      (e) => e.status === 'running'
    ).length;

    return {
      workflowCount: this.workflows.size,
      executionCount: this.executions.size,
      activeExecutions: active,
    };
  }
}

export const workflowBuilder = new WorkflowBuilder();
