import { db } from '../db/index.js';
import { notificationService } from '../notifications/service.js';
import { toolRegistry } from '../agents/index.js';
import { memoryManager } from '../memory/index.js';
import { configLoader } from '../config/loader.js';
import { createProvider } from '../core/llm/index.js';
export class WorkflowEngine {
    stepHandlers = new Map();
    constructor() {
        this.registerDefaultHandlers();
    }
    registerDefaultHandlers() {
        this.registerHandler('DELAY', async (step) => {
            const delayMs = step.config.delayMs || 1000;
            await new Promise((resolve) => setTimeout(resolve, delayMs));
            return { delayed: delayMs };
        });
        this.registerHandler('NOTIFICATION', async (step, context) => {
            const userId = step.config.userId || context.variables.userId;
            if (!userId)
                throw new Error('userId required for notification');
            await notificationService.create({
                userId,
                type: 'SYSTEM',
                title: this.interpolate(step.config.title, context),
                content: this.interpolate(step.config.content, context),
            });
            return { notified: true };
        });
        this.registerHandler('HTTP_REQUEST', async (step, context) => {
            const url = this.interpolate(step.config.url, context);
            const method = step.config.method || 'GET';
            const headers = step.config.headers || {};
            const body = step.config.body
                ? JSON.stringify(this.interpolateObject(step.config.body, context))
                : undefined;
            const response = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json', ...headers },
                body,
                signal: AbortSignal.timeout(30000),
            });
            const responseData = await response.text();
            let parsedResponse;
            try {
                parsedResponse = JSON.parse(responseData);
            }
            catch {
                parsedResponse = responseData;
            }
            return {
                status: response.status,
                headers: Object.fromEntries(new Map(Object.entries(response.headers))),
                body: parsedResponse,
            };
        });
        this.registerHandler('CONDITIONAL', async (step, context) => {
            const condition = step.config.condition;
            const result = this.evaluateCondition(condition, context);
            return {
                result,
                branch: result ? 'success' : 'failure',
            };
        });
        this.registerHandler('MEMORY_OPERATION', async (step, context) => {
            const operation = step.config.operation;
            const data = this.interpolateObject(step.config.data, context);
            switch (operation) {
                case 'store': {
                    if (data.conversationId && Array.isArray(data.messages)) {
                        await memoryManager.saveConversation(String(data.conversationId), String(data.userId || context.variables.userId || 'default'), data.messages);
                        return { stored: true, type: 'conversation' };
                    }
                    if (data.title || data.content) {
                        const note = await memoryManager.saveNote({
                            title: String(data.title || 'Untitled'),
                            content: String(data.content || ''),
                            tags: data.tags || [],
                            category: data.category || 'user',
                        });
                        return { stored: true, type: 'note', note };
                    }
                    if (data.logEntry) {
                        const entry = data.logEntry;
                        const log = await memoryManager.addDailyLog({
                            type: entry.type || 'note',
                            content: String(entry.content || ''),
                            tags: entry.tags || [],
                        });
                        return { stored: true, type: 'daily_log', log };
                    }
                    throw new Error('Unsupported store payload for MEMORY_OPERATION');
                }
                case 'retrieve': {
                    if (data.noteFileName) {
                        const note = await memoryManager.getNote(String(data.noteFileName));
                        return { retrieved: Boolean(note), note };
                    }
                    const userId = String(data.userId || context.variables.userId || 'default');
                    const conversationId = String(data.conversationId || context.conversationId);
                    const maxTokens = Number(data.maxTokens || 2000);
                    const contextText = await memoryManager.getContext(userId, conversationId, maxTokens);
                    return { retrieved: true, context: contextText };
                }
                case 'search': {
                    if (!data.query)
                        throw new Error('query is required for memory search');
                    const results = await memoryManager.search({
                        query: String(data.query),
                        store: data.store,
                        limit: data.limit,
                        type: data.type,
                        tags: data.tags,
                        userId: data.userId,
                    });
                    return { results };
                }
                case 'remember': {
                    if (!data.query)
                        throw new Error('query is required for memory recall');
                    const memories = await memoryManager.remember(String(data.query), {
                        type: data.type,
                        maxResults: data.maxResults,
                    });
                    return { memories };
                }
                case 'forget': {
                    if (!data.id)
                        throw new Error('id is required to forget memory');
                    const deleted = await memoryManager.forget(String(data.id), data.store);
                    return { deleted };
                }
                default:
                    throw new Error(`Unknown memory operation: ${operation}`);
            }
        });
        this.registerHandler('LLM_PROMPT', async (step, context) => {
            const config = await configLoader.load();
            const provider = createProvider(config.llm);
            const systemPrompt = step.config.systemPrompt
                ? this.interpolate(step.config.systemPrompt, context)
                : 'You are a helpful assistant.';
            const userPrompt = this.interpolate(step.config.prompt, context);
            const result = await provider.complete([
                { role: 'system', content: systemPrompt },
                { role: 'user', content: userPrompt },
            ], {
                temperature: step.config.temperature || 0.7,
                maxTokens: step.config.maxTokens || 1000,
            });
            return {
                content: result.content,
                tokensUsed: result.tokensUsed,
            };
        });
        this.registerHandler('TOOL_EXECUTION', async (step, context) => {
            const toolName = step.config.tool;
            if (!toolName)
                throw new Error('Tool name required');
            const tools = await toolRegistry.list();
            const tool = tools.find((t) => t.name === toolName);
            if (!tool)
                throw new Error(`Tool not found: ${toolName}`);
            const input = this.interpolateObject(step.config.input, context);
            const result = await toolRegistry.execute({
                toolId: tool.id,
                input,
                userId: context.variables.userId, // Pass userId from context variables
            });
            if (result.status === 'FAILED') {
                throw new Error(result.error || 'Tool execution failed');
            }
            return result.output;
        });
    }
    registerHandler(type, handler) {
        this.stepHandlers.set(type, handler);
    }
    async createWorkflow(definition, userId) {
        const workflow = await db.workflow.create({
            data: {
                name: definition.name,
                description: definition.description,
                nodes: definition.steps,
                edges: [],
                settings: (definition.variables || {}),
                isActive: definition.isEnabled ?? true,
                userId,
                triggers: {
                    create: definition.triggers.map((t) => ({
                        type: t.type,
                        config: t.config,
                        isActive: true,
                    })),
                },
            },
        });
        return workflow.id;
    }
    async executeWorkflow(workflowId, triggerPayload) {
        const workflow = await db.workflow.findUnique({
            where: { id: workflowId },
            include: { triggers: true },
        });
        if (!workflow) {
            throw new Error(`Workflow not found: ${workflowId}`);
        }
        if (!workflow.isActive) {
            throw new Error('Workflow is disabled');
        }
        const execution = await db.workflowExecution.create({
            data: {
                workflowId,
                status: 'RUNNING',
                startedAt: new Date(),
                inputs: (triggerPayload || {}),
            },
        });
        const context = {
            workflowId,
            executionId: execution.id,
            triggerPayload,
            variables: {
                userId: workflow.userId,
                ...(workflow.settings || {}),
            },
            stepResults: {},
        };
        this.runExecution(workflow, execution.id, context).catch(async (err) => {
            console.error('Critical workflow execution failure:', err);
            try {
                await db.workflowExecution.update({
                    where: { id: execution.id },
                    data: {
                        status: 'FAILED',
                        completedAt: new Date(),
                        error: err instanceof Error ? err.message : String(err),
                    },
                });
            }
            catch (dbErr) {
                console.error('Failed to update execution status after crash:', dbErr);
            }
        });
        return execution.id;
    }
    async runExecution(workflow, executionId, context) {
        const steps = workflow.nodes;
        let currentStepId = steps[0]?.id;
        let status = 'COMPLETED';
        let error;
        try {
            while (currentStepId) {
                const step = steps.find((s) => s.id === currentStepId);
                if (!step)
                    break;
                const stepRecord = await db.workflowStep.create({
                    data: {
                        executionId,
                        nodeId: step.id,
                        nodeName: step.name,
                        status: 'RUNNING',
                        startedAt: new Date(),
                        inputs: step.config,
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
                            outputs: result,
                        },
                    });
                    currentStepId = step.onSuccess || steps[steps.indexOf(step) + 1]?.id;
                }
                catch (stepError) {
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
                    }
                    else {
                        throw stepError;
                    }
                }
            }
        }
        catch (err) {
            status = 'FAILED';
            error = err instanceof Error ? err.message : String(err);
        }
        await db.workflowExecution.update({
            where: { id: executionId },
            data: {
                status,
                completedAt: new Date(),
                error,
                outputs: context.stepResults,
            },
        });
    }
    async executeStep(step, context) {
        const handler = this.stepHandlers.get(step.type);
        if (!handler) {
            throw new Error(`No handler for step type: ${step.type}`);
        }
        let lastError;
        const maxRetries = step.retryConfig?.maxRetries || 0;
        let delay = step.retryConfig?.delayMs || 1000;
        for (let attempt = 0; attempt <= maxRetries; attempt++) {
            try {
                return await handler(step, context);
            }
            catch (err) {
                lastError = err instanceof Error ? err : new Error(String(err));
                if (attempt < maxRetries) {
                    await new Promise((resolve) => setTimeout(resolve, delay));
                    delay *= step.retryConfig?.backoffMultiplier || 1;
                }
            }
        }
        throw lastError;
    }
    interpolate(template, context) {
        return template.replace(/\{\{([^}]+)\}\}/g, (_, path) => {
            const value = this.getNestedValue(context, path.trim());
            if (value === undefined)
                return '';
            if (typeof value === 'object')
                return JSON.stringify(value, null, 2);
            return String(value);
        });
    }
    interpolateObject(obj, context) {
        const result = {};
        for (const [key, value] of Object.entries(obj)) {
            if (typeof value === 'string') {
                result[key] = this.interpolate(value, context);
            }
            else if (typeof value === 'object' && value !== null) {
                result[key] = this.interpolateObject(value, context);
            }
            else {
                result[key] = value;
            }
        }
        return result;
    }
    getNestedValue(obj, path) {
        return path.split('.').reduce((acc, part) => acc?.[part], obj);
    }
    evaluateCondition(condition, context) {
        const interpolated = this.interpolate(condition, context);
        try {
            const vm = require('vm');
            // Use runInNewContext to prevent access to the main process
            // We pass the context as the sandbox
            return Boolean(vm.runInNewContext(interpolated, context));
        }
        catch {
            return false;
        }
    }
    async getExecution(executionId) {
        return db.workflowExecution.findUnique({
            where: { id: executionId },
            include: {
                steps: { orderBy: { startedAt: 'asc' } },
                workflow: { select: { id: true, name: true } },
            },
        });
    }
    async listExecutions(workflowId, limit = 20) {
        return db.workflowExecution.findMany({
            where: { workflowId },
            orderBy: { startedAt: 'desc' },
            take: limit,
            include: {
                _count: { select: { steps: true } },
            },
        });
    }
    async cancelExecution(executionId) {
        await db.workflowExecution.update({
            where: { id: executionId },
            data: { status: 'CANCELLED', completedAt: new Date() },
        });
    }
}
export const workflowEngine = new WorkflowEngine();
//# sourceMappingURL=engine.js.map