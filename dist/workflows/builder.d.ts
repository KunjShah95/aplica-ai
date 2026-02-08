import { EventEmitter } from 'events';
export type NodeType = 'trigger' | 'action' | 'condition' | 'loop' | 'parallel' | 'api_call' | 'transform' | 'notification' | 'agent';
export interface WorkflowNode {
    id: string;
    type: NodeType;
    name: string;
    position: {
        x: number;
        y: number;
    };
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
export declare class WorkflowBuilder extends EventEmitter {
    private workflows;
    private executions;
    private options;
    constructor(options?: WorkflowBuilderOptions);
    createWorkflow(name: string, description?: string): Workflow;
    addNode(workflowId: string, type: NodeType, name: string, position: {
        x: number;
        y: number;
    }, config?: Record<string, unknown>): WorkflowNode | null;
    connect(workflowId: string, sourceNodeId: string, targetNodeId: string, label?: string, condition?: string): WorkflowEdge | null;
    removeNode(workflowId: string, nodeId: string): boolean;
    execute(workflowId: string, inputs?: Record<string, unknown>): Promise<WorkflowExecution>;
    private runWorkflow;
    private getStartNodes;
    private executeNode;
    private runNodeAction;
    private transformData;
    private evaluateCondition;
    private log;
    getWorkflow(workflowId: string): Workflow | undefined;
    getAllWorkflows(): Workflow[];
    getExecution(executionId: string): WorkflowExecution | undefined;
    getWorkflowExecutions(workflowId: string): WorkflowExecution[];
    deleteWorkflow(workflowId: string): boolean;
    private getDefaultInputs;
    private getDefaultOutputs;
    exportWorkflow(workflowId: string): string | null;
    importWorkflow(data: string): Workflow | null;
    getStats(): {
        workflowCount: number;
        executionCount: number;
        activeExecutions: number;
    };
}
export declare const workflowBuilder: WorkflowBuilder;
//# sourceMappingURL=builder.d.ts.map