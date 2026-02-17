export type TriggerType = 'MANUAL' | 'CRON' | 'WEBHOOK' | 'EVENT';
export type StepType = 'LLM_PROMPT' | 'HTTP_REQUEST' | 'CODE_EXECUTION' | 'TOOL_EXECUTION' | 'CONDITIONAL' | 'DELAY' | 'NOTIFICATION' | 'MEMORY_OPERATION';
export interface WorkflowDefinition {
    name: string;
    description?: string;
    isEnabled?: boolean;
    triggers: TriggerDefinition[];
    steps: StepDefinition[];
    variables?: Record<string, unknown>;
}
export interface TriggerDefinition {
    type: TriggerType;
    config: Record<string, unknown>;
}
export interface StepDefinition {
    id: string;
    name: string;
    type: StepType;
    config: Record<string, unknown>;
    onSuccess?: string;
    onFailure?: string;
    retryConfig?: {
        maxRetries: number;
        delayMs: number;
        backoffMultiplier?: number;
    };
}
export interface ExecutionContext {
    conversationId?: string | null;
    workflowId: string;
    executionId: string;
    triggerId?: string;
    triggerPayload?: Record<string, unknown>;
    variables: Record<string, unknown>;
    stepResults: Record<string, unknown>;
}
type StepHandler = (step: StepDefinition, context: ExecutionContext) => Promise<unknown>;
export declare class WorkflowEngine {
    private stepHandlers;
    constructor();
    private registerDefaultHandlers;
    registerHandler(type: StepType, handler: StepHandler): void;
    createWorkflow(definition: WorkflowDefinition, userId: string): Promise<string>;
    executeWorkflow(workflowId: string, triggerPayload?: Record<string, unknown>): Promise<string>;
    private runExecution;
    private executeStep;
    private interpolate;
    private interpolateObject;
    private getNestedValue;
    private evaluateCondition;
    getExecution(executionId: string): Promise<({
        workflow: {
            name: string;
            id: string;
        };
        steps: {
            error: string | null;
            status: import(".prisma/client").$Enums.ExecutionStatus;
            id: string;
            inputs: import("@prisma/client/runtime/library").JsonValue;
            outputs: import("@prisma/client/runtime/library").JsonValue | null;
            startedAt: Date;
            completedAt: Date | null;
            nodeId: string;
            nodeName: string | null;
            executionId: string;
        }[];
    } & {
        error: string | null;
        status: import(".prisma/client").$Enums.ExecutionStatus;
        id: string;
        workflowId: string;
        triggeredBy: string | null;
        inputs: import("@prisma/client/runtime/library").JsonValue;
        outputs: import("@prisma/client/runtime/library").JsonValue | null;
        startedAt: Date;
        completedAt: Date | null;
    }) | null>;
    listExecutions(workflowId: string, limit?: number): Promise<({
        _count: {
            steps: number;
        };
    } & {
        error: string | null;
        status: import(".prisma/client").$Enums.ExecutionStatus;
        id: string;
        workflowId: string;
        triggeredBy: string | null;
        inputs: import("@prisma/client/runtime/library").JsonValue;
        outputs: import("@prisma/client/runtime/library").JsonValue | null;
        startedAt: Date;
        completedAt: Date | null;
    })[]>;
    cancelExecution(executionId: string): Promise<void>;
}
export declare const workflowEngine: WorkflowEngine;
export {};
//# sourceMappingURL=engine.d.ts.map