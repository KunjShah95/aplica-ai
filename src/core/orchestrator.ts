import { toolRegistry } from '../agents/tools.js';
import { postgresMemory } from '../memory/postgres.js';
import { knowledgeBaseService } from '../memory/knowledge-base.js';
import { personaService } from '../agents/persona.js';

export interface AgentMessage {
    role: 'system' | 'user' | 'assistant' | 'tool';
    content: string;
    name?: string;
    toolCallId?: string;
}

export interface ToolCall {
    id: string;
    name: string;
    arguments: Record<string, unknown>;
}

export interface AgentConfig {
    userId: string;
    conversationId?: string;
    personaId?: string;
    knowledgeBaseIds?: string[];
    maxIterations?: number;
    temperature?: number;
    maxTokens?: number;
    tools?: string[];
}

export interface AgentResponse {
    content: string;
    toolCalls?: ToolCall[];
    usage?: {
        promptTokens: number;
        completionTokens: number;
        totalTokens: number;
    };
    finished: boolean;
}

type LLMProvider = (messages: AgentMessage[], config: any) => Promise<AgentResponse>;

export class AgentOrchestrator {
    private llmProvider: LLMProvider;
    private maxIterations: number;

    constructor(llmProvider: LLMProvider, maxIterations: number = 10) {
        this.llmProvider = llmProvider;
        this.maxIterations = maxIterations;
    }

    async run(
        userMessage: string,
        config: AgentConfig
    ): Promise<{ response: string; iterations: number; toolsUsed: string[] }> {
        const messages: AgentMessage[] = [];
        const toolsUsed: string[] = [];
        let iterations = 0;

        const systemPrompt = await this.buildSystemPrompt(config);
        messages.push({ role: 'system', content: systemPrompt });

        const context = await this.gatherContext(userMessage, config);
        if (context) {
            messages.push({
                role: 'system',
                content: `Relevant context:\n${context}`
            });
        }

        messages.push({ role: 'user', content: userMessage });

        while (iterations < (config.maxIterations || this.maxIterations)) {
            iterations++;

            const response = await this.llmProvider(messages, {
                temperature: config.temperature,
                maxTokens: config.maxTokens,
                tools: config.tools,
            });

            if (response.finished || !response.toolCalls?.length) {
                await this.storeMemoryIfNeeded(userMessage, response.content, config);

                return {
                    response: response.content,
                    iterations,
                    toolsUsed,
                };
            }

            messages.push({
                role: 'assistant',
                content: response.content || '',
            });

            for (const toolCall of response.toolCalls) {
                toolsUsed.push(toolCall.name);

                try {
                    const tool = await this.findTool(toolCall.name);
                    if (!tool) {
                        messages.push({
                            role: 'tool',
                            name: toolCall.name,
                            toolCallId: toolCall.id,
                            content: `Error: Tool "${toolCall.name}" not found`,
                        });
                        continue;
                    }

                    const result = await toolRegistry.execute({
                        toolId: tool.id,
                        input: toolCall.arguments,
                    });

                    messages.push({
                        role: 'tool',
                        name: toolCall.name,
                        toolCallId: toolCall.id,
                        content: JSON.stringify(result.output),
                    });

                } catch (error) {
                    messages.push({
                        role: 'tool',
                        name: toolCall.name,
                        toolCallId: toolCall.id,
                        content: `Error: ${error instanceof Error ? error.message : String(error)}`,
                    });
                }
            }
        }

        const lastAssistantMessage = messages
            .filter(m => m.role === 'assistant')
            .pop();

        return {
            response: lastAssistantMessage?.content || 'Maximum iterations reached without completion.',
            iterations,
            toolsUsed,
        };
    }

    async *runStream(
        userMessage: string,
        config: AgentConfig
    ): AsyncGenerator<{ type: 'text' | 'tool' | 'done'; content: string; toolName?: string }> {
        const messages: AgentMessage[] = [];

        const systemPrompt = await this.buildSystemPrompt(config);
        messages.push({ role: 'system', content: systemPrompt });

        const context = await this.gatherContext(userMessage, config);
        if (context) {
            messages.push({ role: 'system', content: `Relevant context:\n${context}` });
        }

        messages.push({ role: 'user', content: userMessage });

        let iterations = 0;
        const maxIter = config.maxIterations || this.maxIterations;

        while (iterations < maxIter) {
            iterations++;

            const response = await this.llmProvider(messages, {
                temperature: config.temperature,
                maxTokens: config.maxTokens,
                tools: config.tools,
            });

            if (response.content) {
                yield { type: 'text', content: response.content };
            }

            if (response.finished || !response.toolCalls?.length) {
                yield { type: 'done', content: response.content };
                return;
            }

            messages.push({ role: 'assistant', content: response.content || '' });

            for (const toolCall of response.toolCalls) {
                yield { type: 'tool', content: `Executing ${toolCall.name}...`, toolName: toolCall.name };

                try {
                    const tool = await this.findTool(toolCall.name);
                    if (!tool) {
                        messages.push({
                            role: 'tool',
                            name: toolCall.name,
                            toolCallId: toolCall.id,
                            content: `Error: Tool "${toolCall.name}" not found`,
                        });
                        continue;
                    }

                    const result = await toolRegistry.execute({
                        toolId: tool.id,
                        input: toolCall.arguments,
                    });

                    messages.push({
                        role: 'tool',
                        name: toolCall.name,
                        toolCallId: toolCall.id,
                        content: JSON.stringify(result.output),
                    });

                } catch (error) {
                    messages.push({
                        role: 'tool',
                        name: toolCall.name,
                        toolCallId: toolCall.id,
                        content: `Error: ${error instanceof Error ? error.message : String(error)}`,
                    });
                }
            }
        }

        yield { type: 'done', content: 'Maximum iterations reached.' };
    }

    private async buildSystemPrompt(config: AgentConfig): Promise<string> {
        let prompt = '';

        if (config.personaId) {
            const persona = await personaService.get(config.personaId);
            if (persona) {
                prompt = persona.systemPrompt;
            }
        }

        if (!prompt) {
            const defaultPersona = await personaService.getDefault();
            prompt = defaultPersona?.systemPrompt || 'You are a helpful AI assistant.';
        }

        const enabledTools = await toolRegistry.getEnabled();
        if (enabledTools.length > 0) {
            prompt += '\n\nYou have access to the following tools:\n';
            for (const tool of enabledTools) {
                prompt += `- ${tool.name}: ${tool.description}\n`;
            }
            prompt += '\nUse tools when appropriate to help the user.';
        }

        return prompt;
    }

    private async gatherContext(
        query: string,
        config: AgentConfig
    ): Promise<string | null> {
        const contextParts: string[] = [];

        try {
            const memories = await postgresMemory.search({
                userId: config.userId,
                query,
                limit: 5,
            });

            if (memories.length > 0) {
                const memoryContext = memories
                    .map(m => `- ${m.content} (importance: ${m.importance})`)
                    .join('\n');
                contextParts.push(`Relevant memories:\n${memoryContext}`);
            }
        } catch (error) {
            console.error('Failed to retrieve memories:', error);
        }

        if (config.knowledgeBaseIds?.length) {
            try {
                for (const kbId of config.knowledgeBaseIds) {
                    const results = await knowledgeBaseService.search(kbId, query, 3);
                    if (results.length > 0) {
                        const kbContext = results
                            .map((r: any) => `[${r.documentTitle || r.documentId}]: ${r.content || r.chunkId}`)
                            .join('\n\n');
                        contextParts.push(`Knowledge base results:\n${kbContext}`);
                    }
                }
            } catch (error) {
                console.error('Failed to search knowledge bases:', error);
            }
        }

        return contextParts.length > 0 ? contextParts.join('\n\n') : null;
    }

    private async storeMemoryIfNeeded(
        userMessage: string,
        assistantResponse: string,
        config: AgentConfig
    ): Promise<void> {
        const importantPatterns = [
            /remember that/i,
            /don't forget/i,
            /important:/i,
            /note:/i,
            /my (name|birthday|preference|favorite)/i,
        ];

        const shouldStore = importantPatterns.some(p =>
            p.test(userMessage) || p.test(assistantResponse)
        );

        if (shouldStore) {
            try {
                await postgresMemory.add({
                    userId: config.userId,
                    type: 'CONTEXT' as any,
                    content: `User: ${userMessage}\nAssistant: ${assistantResponse}`,
                    importance: 0.7,
                    metadata: {
                        conversationId: config.conversationId,
                        autoExtracted: true,
                    },
                });
            } catch (error) {
                console.error('Failed to store memory:', error);
            }
        }
    }

    private async findTool(name: string) {
        const tools = await toolRegistry.list();
        return tools.find((t: { name: string }) => t.name === name);
    }
}

export function createAgentOrchestrator(
    llmProvider: LLMProvider,
    maxIterations?: number
): AgentOrchestrator {
    return new AgentOrchestrator(llmProvider, maxIterations);
}
