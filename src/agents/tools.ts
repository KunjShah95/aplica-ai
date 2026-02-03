import { db } from '../db/index.js';

export interface ToolDefinition {
    name: string;
    description: string;
    schema: {
        type: 'object';
        properties: Record<string, {
            type: string;
            description?: string;
            enum?: string[];
            items?: { type: string };
            default?: unknown;
        }>;
        required?: string[];
    };
    handler: string;
    category?: string;
    permissions?: string[];
}

export interface ToolExecutionInput {
    toolId: string;
    input: Record<string, unknown>;
}

export interface ToolExecutionResult {
    id: string;
    output: unknown;
    status: 'COMPLETED' | 'FAILED';
    duration: number;
    error?: string;
}

type ToolHandler = (input: Record<string, unknown>) => Promise<unknown>;

export class ToolRegistry {
    private handlers: Map<string, ToolHandler> = new Map();

    async register(tool: ToolDefinition): Promise<void> {
        await db.tool.upsert({
            where: { name: tool.name },
            create: {
                name: tool.name,
                description: tool.description,
                schema: tool.schema,
                handler: tool.handler,
                category: tool.category,
                permissions: tool.permissions || [],
                isBuiltin: false,
                isEnabled: true,
            },
            update: {
                description: tool.description,
                schema: tool.schema,
                handler: tool.handler,
                category: tool.category,
                permissions: tool.permissions || [],
            },
        });
    }

    registerHandler(name: string, handler: ToolHandler): void {
        this.handlers.set(name, handler);
    }

    async execute(input: ToolExecutionInput): Promise<ToolExecutionResult> {
        const startTime = Date.now();

        const tool = await db.tool.findUnique({
            where: { id: input.toolId },
        });

        if (!tool) {
            throw new Error(`Tool not found: ${input.toolId}`);
        }

        if (!tool.isEnabled) {
            throw new Error(`Tool is disabled: ${tool.name}`);
        }

        const handler = this.handlers.get(tool.name);
        if (!handler) {
            throw new Error(`No handler registered for tool: ${tool.name}`);
        }

        const execution = await db.toolExecution.create({
            data: {
                toolId: tool.id,
                input: input.input,
                status: 'RUNNING',
            },
        });

        try {
            const output = await handler(input.input);
            const duration = Date.now() - startTime;

            await db.toolExecution.update({
                where: { id: execution.id },
                data: {
                    output: output as any,
                    status: 'COMPLETED',
                    duration,
                },
            });

            return {
                id: execution.id,
                output,
                status: 'COMPLETED',
                duration,
            };
        } catch (error) {
            const duration = Date.now() - startTime;
            const errorMessage = error instanceof Error ? error.message : String(error);

            await db.toolExecution.update({
                where: { id: execution.id },
                data: {
                    status: 'FAILED',
                    error: errorMessage,
                    duration,
                },
            });

            return {
                id: execution.id,
                output: null,
                status: 'FAILED',
                duration,
                error: errorMessage,
            };
        }
    }

    async list(category?: string) {
        return db.tool.findMany({
            where: { category },
            orderBy: { name: 'asc' },
        });
    }

    async getEnabled() {
        return db.tool.findMany({
            where: { isEnabled: true },
            orderBy: { name: 'asc' },
        });
    }

    async enable(name: string): Promise<void> {
        await db.tool.update({
            where: { name },
            data: { isEnabled: true },
        });
    }

    async disable(name: string): Promise<void> {
        await db.tool.update({
            where: { name },
            data: { isEnabled: false },
        });
    }

    async getExecutionHistory(toolId: string, limit: number = 20) {
        return db.toolExecution.findMany({
            where: { toolId },
            orderBy: { createdAt: 'desc' },
            take: limit,
        });
    }

    async seedBuiltinTools(): Promise<void> {
        const builtinTools: ToolDefinition[] = [
            {
                name: 'web_search',
                description: 'Search the web for information',
                schema: {
                    type: 'object',
                    properties: {
                        query: { type: 'string', description: 'Search query' },
                        limit: { type: 'number', description: 'Maximum results', default: 5 },
                    },
                    required: ['query'],
                },
                handler: 'builtin:web_search',
                category: 'search',
            },
            {
                name: 'read_file',
                description: 'Read contents of a file',
                schema: {
                    type: 'object',
                    properties: {
                        path: { type: 'string', description: 'File path to read' },
                    },
                    required: ['path'],
                },
                handler: 'builtin:read_file',
                category: 'filesystem',
                permissions: ['filesystem'],
            },
            {
                name: 'write_file',
                description: 'Write content to a file',
                schema: {
                    type: 'object',
                    properties: {
                        path: { type: 'string', description: 'File path to write' },
                        content: { type: 'string', description: 'Content to write' },
                    },
                    required: ['path', 'content'],
                },
                handler: 'builtin:write_file',
                category: 'filesystem',
                permissions: ['filesystem'],
            },
            {
                name: 'run_shell',
                description: 'Execute a shell command',
                schema: {
                    type: 'object',
                    properties: {
                        command: { type: 'string', description: 'Command to execute' },
                        args: { type: 'array', items: { type: 'string' }, description: 'Command arguments' },
                    },
                    required: ['command'],
                },
                handler: 'builtin:run_shell',
                category: 'execution',
                permissions: ['execute'],
            },
            {
                name: 'browser_navigate',
                description: 'Navigate to a URL in the browser',
                schema: {
                    type: 'object',
                    properties: {
                        url: { type: 'string', description: 'URL to navigate to' },
                    },
                    required: ['url'],
                },
                handler: 'builtin:browser_navigate',
                category: 'browser',
                permissions: ['browser'],
            },
            {
                name: 'remember',
                description: 'Store information in long-term memory',
                schema: {
                    type: 'object',
                    properties: {
                        content: { type: 'string', description: 'Information to remember' },
                        tags: { type: 'array', items: { type: 'string' }, description: 'Tags for categorization' },
                    },
                    required: ['content'],
                },
                handler: 'builtin:remember',
                category: 'memory',
            },
            {
                name: 'recall',
                description: 'Search and retrieve information from memory',
                schema: {
                    type: 'object',
                    properties: {
                        query: { type: 'string', description: 'Search query' },
                        limit: { type: 'number', description: 'Maximum results', default: 5 },
                    },
                    required: ['query'],
                },
                handler: 'builtin:recall',
                category: 'memory',
            },
        ];

        for (const tool of builtinTools) {
            await db.tool.upsert({
                where: { name: tool.name },
                create: {
                    name: tool.name,
                    description: tool.description,
                    schema: tool.schema,
                    handler: tool.handler,
                    category: tool.category,
                    permissions: tool.permissions || [],
                    isBuiltin: true,
                    isEnabled: true,
                },
                update: {
                    description: tool.description,
                    schema: tool.schema,
                },
            });
        }
    }
}

export const toolRegistry = new ToolRegistry();
