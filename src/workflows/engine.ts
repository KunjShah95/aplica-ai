import { db } from '../db/index.js';
import { webhookService } from '../integrations/webhooks.js';
import { notificationService } from '../notifications/service.js';

export type TriggerType = 'MANUAL' | 'SCHEDULE' | 'WEBHOOK' | 'EVENT' | 'KEYWORD';
export type StepType = 'LLM_PROMPT' | 'HTTP_REQUEST' | 'CODE_EXECUTION' | 'CONDITIONAL' | 'DELAY' | 'NOTIFICATION' | 'MEMORY_OPERATION';
export type ExecutionStatus = 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED' | 'CANCELLED';

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
    workflowId: string;
    executionId: string;
    triggerId?: string;
    triggerPayload?: Record<string, unknown>;
    variables: Record<string, unknown>;
    stepResults: Record<string, unknown>;
}

type StepHandler = (
    step: StepDefinition,
    context: ExecutionContext
) => Promise<unknown>;

export class WorkflowEngine {
    private stepHandlers: Map<StepType, StepHandler> = new Map();

    constructor() {
        this.registerDefaultHandlers();
    }

    private registerDefaultHandlers(): void {
        this.registerHandler('DELAY', async (step) => {
            const delayMs = (step.config.delayMs as number) || 1000;
            await new Promise(resolve => setTimeout(resolve, delayMs));
            return { delayed: delayMs };
        });

        this.registerHandler('NOTIFICATION', async (step, context) => {
            const userId = step.config.userId as string || context.variables.userId as string;
            if (!userId) throw new Error('userId required for notification');

            await notificationService.create({
                userId,
                type: 'SYSTEM' as any,
                title: this.interpolate(step.config.title as string, context),
                content: this.interpolate(step.config.content as string, context),
            });

            return { notified: true };
        });

        this.registerHandler('HTTP_REQUEST', async (step, context) => {
            const url = this.interpolate(step.config.url as string, context);
            const method = (step.config.method as string) || 'GET';
            const headers = step.config.headers as Record<string, string> || {};
            const body = step.config.body ? JSON.stringify(
                this.interpolateObject(step.config.body as Record<string, unknown>, context)
            ) : undefined;

            const response = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json', ...headers },
                body,
                signal: AbortSignal.timeout(30000),
            });

            const responseData = await response.text();
            let parsedResponse: unknown;
            try {
                parsedResponse = JSON.parse(responseData);
            } catch {
                parsedResponse = responseData;
            }

            return {
                status: response.status,
                headers: Object.fromEntries(response.headers),
                body: parsedResponse,
            };
        });

        this.registerHandler('CONDITIONAL', async (step, context) => {
            const condition = step.config.condition as string;
            const result = this.evaluateCondition(condition, context);

            return {
                result,
                branch: result ? 'success' : 'failure',
            };
        });

        this.registerHandler('MEMORY_OPERATION', async (step, context) => {
            const operation = step.config.operation as string;
            const data = this.interpolateObject(step.config.data as Record<string, unknown>, context);

            switch (operation) {
                case 'store':
                    return { stored: true, data };
                case 'retrieve':
                    return { retrieved: true };
                case 'search':
                    return { results: [] };
                default:
                    throw new Error(`Unknown memory operation: ${operation}`);
            }
        });
    }

    registerHandler(type: StepType, handler: StepHandler): void {
        this.stepHandlers.set(type, handler);
    }

    async createWorkflow(
        definition: WorkflowDefinition,
        userId: string
    ): Promise<string> {
        const workflow = await db.workflow.create({
            data: {
                name: definition.name,
                description: definition.description,
                steps: definition.steps,
                variables: definition.variables || {},
                isEnabled: definition.isEnabled ?? true,
                userId,
                triggers: {
                    create: definition.triggers.map(t => ({
                        type: t.type,
                        config: t.config,
                        isEnabled: true,
                    })),
                },
            },
        });

        return workflow.id;
    }

    async executeWorkflow(
        workflowId: string,
        triggerPayload?: Record<string, unknown>
    ): Promise<string> {
        const workflow = await db.workflow.findUnique({
            where: { id: workflowId },
            include: { triggers: true },
        });

        if (!workflow) {
            throw new Error(`Workflow not found: ${workflowId}`);
        }

        if (!workflow.isEnabled) {
            throw new Error('Workflow is disabled');
        }

        const execution = await db.workflowExecution.create({
            data: {
                workflowId,
                status: 'RUNNING',
                startedAt: new Date(),
            },
        });

        const context: ExecutionContext = {
            workflowId,
            executionId: execution.id,
            triggerPayload,
            variables: workflow.variables as Record<string, unknown> || {},
            stepResults: {},
        };

        this.runExecution(workflow, execution.id, context).catch(console.error);

        return execution.id;
    }

    private async runExecution(
        workflow: any,
        executionId: string,
        context: ExecutionContext
    ): Promise<void> {
        const steps = workflow.steps as StepDefinition[];
        let currentStepId = steps[0]?.id;
        let status: ExecutionStatus = 'COMPLETED';
        let error: string | undefined;

        try {
            while (currentStepId) {
                const step = steps.find(s => s.id === currentStepId);
                if (!step) break;

                const stepRecord = await db.workflowStep.create({
                    data: {
                        executionId,
                        stepId: step.id,
                        name: step.name,
                        status: 'RUNNING',
                        startedAt: new Date(),
                    },
                });

                try {
                    const result = await this.executeStep(step, context);
                    context.stepResults[step.id] = result;

                    await db.workflowStep.update({
                        where: { id: stepRecord.id },
                        data: {
                            status: 'COMPLETED',
                            completedAt: new Date(),
                            output: result as any,
                        },
                    });

                    currentStepId = step.onSuccess || steps[steps.indexOf(step) + 1]?.id;

                } catch (stepError) {
                    await db.workflowStep.update({
                        where: { id: stepRecord.id },
                        data: {
                            status: 'FAILED',
                            completedAt: new Date(),
                            error: stepError instanceof Error ? stepError.message : String(stepError),
                        },
                    });

                    if (step.onFailure) {
                        currentStepId = step.onFailure;
                    } else {
                        throw stepError;
                    }
                }
            }

        } catch (err) {
            status = 'FAILED';
            error = err instanceof Error ? err.message : String(err);
        }

        await db.workflowExecution.update({
            where: { id: executionId },
            data: {
                status,
                completedAt: new Date(),
                error,
                output: context.stepResults,
            },
        });

        await db.workflow.update({
            where: { id: workflow.id },
            data: { lastRunAt: new Date() },
        });
    }

    private async executeStep(
        step: StepDefinition,
        context: ExecutionContext
    ): Promise<unknown> {
        const handler = this.stepHandlers.get(step.type);
        if (!handler) {
            throw new Error(`No handler for step type: ${step.type}`);
        }

        let lastError: Error | undefined;
        const maxRetries = step.retryConfig?.maxRetries || 0;
        let delay = step.retryConfig?.delayMs || 1000;

        for (let attempt = 0; attempt <= maxRetries; attempt++) {
            try {
                return await handler(step, context);
            } catch (err) {
                lastError = err instanceof Error ? err : new Error(String(err));

                if (attempt < maxRetries) {
                    await new Promise(resolve => setTimeout(resolve, delay));
                    delay *= step.retryConfig?.backoffMultiplier || 1;
                }
            }
        }

        throw lastError;
    }

    private interpolate(template: string, context: ExecutionContext): string {
        return template.replace(/\{\{([^}]+)\}\}/g, (_, path) => {
            const value = this.getNestedValue(context, path.trim());
            return value !== undefined ? String(value) : '';
        });
    }

    private interpolateObject(
        obj: Record<string, unknown>,
        context: ExecutionContext
    ): Record<string, unknown> {
        const result: Record<string, unknown> = {};

        for (const [key, value] of Object.entries(obj)) {
            if (typeof value === 'string') {
                result[key] = this.interpolate(value, context);
            } else if (typeof value === 'object' && value !== null) {
                result[key] = this.interpolateObject(value as Record<string, unknown>, context);
            } else {
                result[key] = value;
            }
        }

        return result;
    }

    private getNestedValue(obj: any, path: string): unknown {
        return path.split('.').reduce((acc, part) => acc?.[part], obj);
    }

    private evaluateCondition(condition: string, context: ExecutionContext): boolean {
        const interpolated = this.interpolate(condition, context);

        try {
            const fn = new Function('ctx', `return ${interpolated}`);
            return Boolean(fn(context));
        } catch {
            return false;
        }
    }

    async getExecution(executionId: string) {
        return db.workflowExecution.findUnique({
            where: { id: executionId },
            include: {
                steps: { orderBy: { startedAt: 'asc' } },
                workflow: { select: { id: true, name: true } },
            },
        });
    }

    async listExecutions(workflowId: string, limit: number = 20) {
        return db.workflowExecution.findMany({
            where: { workflowId },
            orderBy: { startedAt: 'desc' },
            take: limit,
            include: {
                _count: { select: { steps: true } },
            },
        });
    }

    async cancelExecution(executionId: string): Promise<void> {
        await db.workflowExecution.update({
            where: { id: executionId },
            data: { status: 'CANCELLED', completedAt: new Date() },
        });
    }
}

export const workflowEngine = new WorkflowEngine();
