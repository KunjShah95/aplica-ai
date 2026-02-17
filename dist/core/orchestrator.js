import { toolRegistry } from '../agents/tools.js';
import { postgresMemory } from '../memory/postgres.js';
import { knowledgeBaseService } from '../memory/knowledge-base.js';
import { personaService } from '../agents/persona.js';
import { ConstitutionalAI } from './security/constitutional.js';
import { ApprovalManager } from './security/approval.js';
import { promptGuard } from '../security/prompt-guard.js';
export class AgentOrchestrator {
    llmProvider;
    maxIterations;
    constructor(llmProvider, maxIterations = 10) {
        this.llmProvider = llmProvider;
        this.maxIterations = maxIterations;
    }
    async run(userMessage, config) {
        const messages = [];
        const toolsUsed = [];
        let iterations = 0;
        let systemPrompt = await this.buildSystemPrompt(config);
        messages.push({ role: 'system', content: systemPrompt });
        let context = await this.gatherContext(userMessage, config);
        if (context) {
            messages.push({
                role: 'system',
                content: `Relevant context:\n${context}`
            });
        }
        let sanitizedMessage = promptGuard.sanitize(userMessage);
        let promptCheck = promptGuard.validate(sanitizedMessage);
        if (!promptCheck.valid) {
            return {
                response: `[Safety Refusal] ${promptCheck.reason}`,
                iterations: 0,
                toolsUsed: [],
            };
        }
        messages.push({ role: 'user', content: sanitizedMessage });
        // CONSTITUTIONAL PRE-CHECK (Faster)
        const safety = await ConstitutionalAI.validateInput(sanitizedMessage);
        if (!safety.safe) {
            return {
                response: `[Safety Refusal] ${safety.reason}`,
                iterations: 0,
                toolsUsed: [],
            };
        }
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
                    // CONSTITUTIONAL TOOL CHECK (Safer)
                    const toolSafe = await ConstitutionalAI.validateToolUsage(tool.name, toolCall.arguments, config);
                    if (!toolSafe.safe) {
                        messages.push({
                            role: 'tool',
                            name: toolCall.name,
                            toolCallId: toolCall.id,
                            content: `Error: Tool usage blocked by safety policy: ${toolSafe.reason}`,
                        });
                        continue;
                    }
                    // APPROVAL CHECK (Secure)
                    if (tool.name === 'run_shell' || tool.name === 'delete_file') {
                        // For demonstration, map 'HIGH' risk to these actions
                        const approval = await ApprovalManager.request(config.userId, `Execute ${tool.name}`, toolCall.arguments, 'HIGH');
                        // In this mock, 'HIGH' defaults to DENIED or PENDING unless auto-approved.
                        // We check if it is explicitly approved.
                        if (approval.status !== 'APPROVED' && approval.status !== 'AUTO_APPROVED') {
                            messages.push({
                                role: 'tool',
                                name: toolCall.name,
                                toolCallId: toolCall.id,
                                content: `Error: User approval required and not granted for high-risk action.`,
                            });
                            continue;
                        }
                    }
                    const result = await toolRegistry.execute({
                        toolId: tool.id,
                        input: toolCall.arguments,
                        userId: config.userId,
                    });
                    messages.push({
                        role: 'tool',
                        name: toolCall.name,
                        toolCallId: toolCall.id,
                        content: JSON.stringify(result.output),
                    });
                }
                catch (error) {
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
            response: ConstitutionalAI.sanitizeOutput(lastAssistantMessage?.content || 'Maximum iterations reached without completion.'),
            iterations,
            toolsUsed,
        };
    }
    async *runStream(userMessage, config) {
        const messages = [];
        const systemPrompt = await this.buildSystemPrompt(config);
        messages.push({ role: 'system', content: systemPrompt });
        const context = await this.gatherContext(userMessage, config);
        if (context) {
            messages.push({ role: 'system', content: `Relevant context:\n${context}` });
        }
        const sanitizedMessage = promptGuard.sanitize(userMessage);
        const promptCheck = promptGuard.validate(sanitizedMessage);
        if (!promptCheck.valid) {
            yield { type: 'text', content: `[Safety Refusal] ${promptCheck.reason}` };
            yield { type: 'done', content: `[Safety Refusal] ${promptCheck.reason}` };
            return;
        }
        messages.push({ role: 'user', content: sanitizedMessage });
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
                yield { type: 'text', content: ConstitutionalAI.sanitizeOutput(response.content) };
            }
            if (response.finished || !response.toolCalls?.length) {
                yield { type: 'done', content: ConstitutionalAI.sanitizeOutput(response.content) };
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
                        userId: config.userId,
                    });
                    messages.push({
                        role: 'tool',
                        name: toolCall.name,
                        toolCallId: toolCall.id,
                        content: JSON.stringify(result.output),
                    });
                }
                catch (error) {
                    messages.push({
                        role: 'tool',
                        name: toolCall.name,
                        toolCallId: toolCall.id,
                        content: `Error: ${error instanceof Error ? error.message : String(error)}`,
                    });
                }
            }
        }
        yield { type: 'done', content: ConstitutionalAI.sanitizeOutput('Maximum iterations reached.') };
    }
    async buildSystemPrompt(config) {
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
        console.log(`[Orchestrator] Active Tools: ${enabledTools.map(t => t.name).join(', ')}`);
        if (enabledTools.length > 0) {
            prompt += '\n\nYou have access to the following tools:\n';
            for (const tool of enabledTools) {
                prompt += `- ${tool.name}: ${tool.description}\n`;
            }
            prompt += '\nUse tools when appropriate to help the user.';
        }
        return prompt;
    }
    async gatherContext(query, config) {
        const contextParts = [];
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
        }
        catch (error) {
            console.error('Failed to retrieve memories:', error);
        }
        if (config.knowledgeBaseIds?.length) {
            try {
                for (const kbId of config.knowledgeBaseIds) {
                    const results = await knowledgeBaseService.search(kbId, query, 3);
                    if (results.length > 0) {
                        const kbContext = results
                            .map((r) => `[${r.documentTitle || r.documentId}]: ${r.content || r.chunkId}`)
                            .join('\n\n');
                        contextParts.push(`Knowledge base results:\n${kbContext}`);
                    }
                }
            }
            catch (error) {
                console.error('Failed to search knowledge bases:', error);
            }
        }
        return contextParts.length > 0 ? contextParts.join('\n\n') : null;
    }
    async storeMemoryIfNeeded(userMessage, assistantResponse, config) {
        const importantPatterns = [
            /remember that/i,
            /don't forget/i,
            /important:/i,
            /note:/i,
            /my (name|birthday|preference|favorite)/i,
        ];
        const shouldStore = importantPatterns.some(p => p.test(userMessage) || p.test(assistantResponse));
        if (shouldStore) {
            try {
                await postgresMemory.add({
                    userId: config.userId,
                    type: 'CONTEXT',
                    content: `User: ${userMessage}\nAssistant: ${assistantResponse}`,
                    importance: 0.7,
                    metadata: {
                        conversationId: config.conversationId,
                        autoExtracted: true,
                    },
                });
            }
            catch (error) {
                console.error('Failed to store memory:', error);
            }
        }
    }
    async findTool(name) {
        const tools = await toolRegistry.list();
        return tools.find((t) => t.name === name);
    }
}
export function createAgentOrchestrator(llmProvider, maxIterations) {
    return new AgentOrchestrator(llmProvider, maxIterations);
}
//# sourceMappingURL=orchestrator.js.map