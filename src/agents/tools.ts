import { db } from '../db/index.js';
import { shellExecutor, fileSystemExecutor, browserExecutor } from '../execution/index.js';

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
    userId?: string; // Added for RBAC
}

export interface ToolExecutionResult {
    id: string;
    output: unknown;
    status: 'COMPLETED' | 'FAILED' | 'PENDING_APPROVAL';
    duration: number;
    error?: string;
}

type ToolHandler = (input: Record<string, unknown>) => Promise<unknown>;

export class ToolRegistry {
    private handlers: Map<string, ToolHandler> = new Map();

    constructor() {
        this.registerBuiltinHandlers();
    }

    private registerBuiltinHandlers() {
        this.registerHandler('builtin:read_file', async (input) => {
            if (!input.path) throw new Error('Path is required');
            return fileSystemExecutor.readFile(String(input.path));
        });

        this.registerHandler('builtin:write_file', async (input) => {
            if (!input.path || input.content === undefined) throw new Error('Path and content are required');
            return fileSystemExecutor.writeFile(String(input.path), String(input.content));
        });

        this.registerHandler('builtin:run_shell', async (input) => {
            if (!input.command) throw new Error('Command is required');
            // Ensure args is an array or construct one
            const args = Array.isArray(input.args)
                ? input.args.map(String)
                : (input.args ? [String(input.args)] : []);

            return shellExecutor.execute({
                command: String(input.command),
                args: args
            });
        });

        this.registerHandler('builtin:browser_navigate', async (input) => {
            if (!input.url) throw new Error('URL is required');
            return browserExecutor.navigate({ url: String(input.url) });
        });

        this.registerHandler('builtin:web_search', async (input) => {
            if (!input.query) throw new Error('Query is required');

            const query = String(input.query);
            const searchUrl = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`;

            await browserExecutor.navigate({ url: searchUrl });

            // Wait for results to load
            await new Promise(resolve => setTimeout(resolve, 2000));

            const result = await browserExecutor.evaluate(`(() => {
                const results = [];
                const elements = document.querySelectorAll('.result__body');
                elements.forEach(el => {
                    const titleEl = el.querySelector('.result__title .result__a');
                    const snippetEl = el.querySelector('.result__snippet');
                    if (titleEl && snippetEl) {
                        results.push({
                            title: titleEl.innerText,
                            link: titleEl.href,
                            snippet: snippetEl.innerText
                        });
                    }
                });
                return results.slice(0, 5);
            })()`);

            if (!result.success) {
                throw new Error(`Search failed: ${result.error}`);
            }

            return {
                query,
                results: JSON.parse(result.data as string)
            };
        });

        this.registerHandler('builtin:remember', async (input) => {
            // This would typically interface with memory service
            return { message: "Memory stored", content: input.content };
        });

        this.registerHandler('builtin:recall', async (input) => {
            // This would typically interface with memory service
            return { message: "Memory recall query", query: input.query };
        });
    }

    async register(tool: ToolDefinition): Promise<void> {
        await db.tool.upsert({
            where: { name: tool.name },
            create: {
                name: tool.name,
                description: tool.description,
                schema: tool.schema as any,
                handler: tool.handler,
                category: tool.category,
                permissions: tool.permissions || [],
                isBuiltin: false,
                isEnabled: true,
            },
            update: {
                description: tool.description,
                schema: tool.schema as any,
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

        // --- SECURITY CHECK START ---
        if (tool.permissions && tool.permissions.length > 0) {
            // 1. Basic Dangerous Command Block
            if (tool.name === 'run_shell') {
                const cmd = input.input.command as string;
                const dangerous = ['rm', 'mkfs', 'dd', 'chmod', 'chown', 'sudo', 'su'];
                if (dangerous.includes(cmd)) {
                    // In a real system, we would trigger an "Approval Request" here
                    throw new Error(`Security Alert: Command '${cmd}' is blocked by default safety policy.`);
                }
            }

            // 2. Future RBAC Extension Point
            if (input.userId) {
                // await checkUserPermissions(input.userId, tool.permissions);
            }
        }
        // --- SECURITY CHECK END ---

        const handler = this.handlers.get(tool.handler) || this.handlers.get(tool.name);

        if (!handler) {
            // Attempt to find by name if handler string didn't match
            const fallback = this.handlers.get(tool.name);
            if (!fallback) {
                throw new Error(`No handler registered for tool: ${tool.name} (handler: ${tool.handler})`);
            }
        }

        const finalHandler = handler || this.handlers.get(tool.name)!;

        const execution = await db.toolExecution.create({
            data: {
                toolId: tool.id,
                input: input.input as any,
                status: 'RUNNING',
            },
        });

        try {
            const output = await finalHandler(input.input);
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
                    schema: tool.schema as any,
                    handler: tool.handler,
                    category: tool.category,
                    permissions: tool.permissions || [],
                    isBuiltin: true,
                    isEnabled: true,
                },
                update: {
                    description: tool.description,
                    schema: tool.schema as any,
                    handler: tool.handler,
                    category: tool.category,
                    permissions: tool.permissions || [],
                },
            });
        }
    }
}

export const toolRegistry = new ToolRegistry();
