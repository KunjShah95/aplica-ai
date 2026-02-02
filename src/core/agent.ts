import { AppConfig } from '../config/types.js';
import { LLMProvider, LLMMessage, LLMCompletionResult } from './llm/index.js';
import { conversationManager } from './conversation.js';
import { taskQueue } from './queue.js';
import { Message, Conversation, TaskType } from './types.js';
import { executeCommand, executionContext } from '../execution/index.js';

export interface AgentOptions {
  config: AppConfig;
  llm: LLMProvider;
}

export interface AgentResponse {
  message: string;
  conversationId: string;
  tokensUsed: number;
  timestamp: Date;
}

export interface ExecutionRequest {
  type: 'shell' | 'filesystem' | 'browser' | 'sandbox';
  operation: string;
  params: Record<string, unknown>;
}

export class Agent {
  private config: AppConfig;
  private llm: LLMProvider;
  private systemPrompt: string;

  constructor(options: AgentOptions) {
    this.config = options.config;
    this.llm = options.llm;
    this.systemPrompt = this.buildSystemPrompt();
  }

  private buildSystemPrompt(): string {
    const soul = this.config.soul;
    const identity = this.config.identity;

    return `# Identity
You are ${identity.displayName}, ${identity.bio}.

${identity.tagline}

## Personality
Traits: ${soul.personality.traits.join(', ')}
Tone: ${soul.personality.defaultTone}

## Values
${soul.personality.values.map((v) => `- ${v}`).join('\n')}

## Boundaries
${soul.personality.boundaries.map((b) => `- ${b}`).join('\n')}

## Capabilities
You have access to execution capabilities that allow you to:
- Execute shell commands (limited to safe operations)
- Read, write, and manage files
- Automate browser interactions
- Run sandboxed code execution

## Execution Security
- Shell commands are filtered against allowed/blocked lists
- File operations are restricted to configured paths
- Browser automation is available for web tasks
- Sandboxed execution isolates untrusted code

## Current Context
- User: ${this.config.user.name}
- Timezone: ${identity.timezone}
${identity.availability.enabled ? `- Availability: ${identity.availability.defaultHours}` : ''}

You are helpful, precise, and proactive. You provide clear and concise responses while respecting user preferences and privacy.`;
  }

  async processMessage(
    content: string,
    conversationId: string,
    userId: string,
    source: 'telegram' | 'discord' | 'websocket' | 'cli'
  ): Promise<AgentResponse> {
    const conversation = await conversationManager.get(conversationId);
    if (!conversation) {
      throw new Error(`Conversation ${conversationId} not found`);
    }

    const userMessage = await conversationManager.addMessage(conversationId, 'user', content, {
      source,
      userId,
    });

    if (!userMessage) {
      throw new Error('Failed to add user message');
    }

    const messages = await this.buildMessages(conversation);

    const result = await this.llm.complete(messages, {
      systemPrompt: this.systemPrompt,
      maxTokens: this.config.llm.maxTokens,
      temperature: this.config.llm.temperature,
    });

    await conversationManager.addMessage(conversationId, 'assistant', result.content, {
      source: 'assistant',
      userId,
    });

    await taskQueue.add('memory:save', {
      conversationId,
      userId,
      query: content,
      context: { response: result.content, tokens: result.tokensUsed },
    });

    return {
      message: result.content,
      conversationId,
      tokensUsed: result.tokensUsed,
      timestamp: new Date(),
    };
  }

  private async buildMessages(conversation: Conversation): Promise<LLMMessage[]> {
    const messages: LLMMessage[] = [];

    for (const msg of conversation.messages.slice(-50)) {
      messages.push({
        role: msg.role,
        content: msg.content,
      });
    }

    return messages;
  }

  async startConversation(
    userId: string,
    platform: 'telegram' | 'discord' | 'websocket' | 'cli',
    initialMessage?: string
  ): Promise<{ conversationId: string; response?: AgentResponse }> {
    const conversation = await conversationManager.create(userId, {
      platform,
      tags: [],
    });

    if (initialMessage) {
      const response = await this.processMessage(initialMessage, conversation.id, userId, platform);
      return { conversationId: conversation.id, response };
    }

    return { conversationId: conversation.id };
  }

  async getConversationHistory(conversationId: string): Promise<Message[]> {
    const conversation = await conversationManager.get(conversationId);
    return conversation?.messages || [];
  }

  isAvailable(): boolean | Promise<boolean> {
    return this.llm.isAvailable();
  }

  getConfig(): AppConfig {
    return this.config;
  }

  async execute(request: ExecutionRequest): Promise<unknown> {
    const { type, operation, params } = request;

    if (this.config.security.sandboxEnabled && type === 'shell') {
      const env = (params.environment as Record<string, string>) || {};
      params.environment = { ...env, SANDBOX: 'true' };
    }

    try {
      const result = await executeCommand(type, operation, params);
      return result;
    } catch (error) {
      console.error(`Execution error [${type}/${operation}]:`, error);
      throw error;
    }
  }

  async executeShell(
    command: string,
    args?: string[],
    options?: Record<string, unknown>
  ): Promise<unknown> {
    return this.execute({
      type: 'shell',
      operation: command,
      params: { args, ...options },
    });
  }

  async readFile(filePath: string): Promise<unknown> {
    return this.execute({
      type: 'filesystem',
      operation: 'readFile',
      params: { path: filePath },
    });
  }

  async writeFile(filePath: string, content: string): Promise<unknown> {
    return this.execute({
      type: 'filesystem',
      operation: 'writeFile',
      params: { path: filePath, content },
    });
  }

  async listDirectory(dirPath: string): Promise<unknown> {
    return this.execute({
      type: 'filesystem',
      operation: 'listDirectory',
      params: { path: dirPath },
    });
  }

  async searchFiles(
    pattern: string,
    options?: { recursive?: boolean; maxDepth?: number }
  ): Promise<unknown> {
    return this.execute({
      type: 'filesystem',
      operation: 'search',
      params: { pattern, ...options },
    });
  }

  async navigateBrowser(url: string): Promise<unknown> {
    return this.execute({
      type: 'browser',
      operation: 'navigate',
      params: { url },
    });
  }

  async clickBrowser(selector: string): Promise<unknown> {
    return this.execute({
      type: 'browser',
      operation: 'click',
      params: { selector },
    });
  }

  async fillBrowser(selector: string, value: string): Promise<unknown> {
    return this.execute({
      type: 'browser',
      operation: 'fill',
      params: { selector, value },
    });
  }

  async screenshotBrowser(): Promise<unknown> {
    return this.execute({
      type: 'browser',
      operation: 'screenshot',
      params: {},
    });
  }

  async runSandboxedCode(
    code: string,
    language: 'javascript' | 'typescript' = 'javascript',
    input?: Record<string, unknown>
  ): Promise<unknown> {
    return this.execute({
      type: 'sandbox',
      operation: 'execute',
      params: { code, language, input },
    });
  }

  getExecutionContext(): typeof executionContext {
    return executionContext;
  }
}

export function createAgent(config: AppConfig, llm: LLMProvider): Agent {
  return new Agent({ config, llm });
}
