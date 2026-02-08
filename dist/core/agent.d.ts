import { AppConfig } from '../config/types.js';
import { LLMProvider } from './llm/index.js';
import { Message } from './types.js';
import { executionContext } from '../execution/index.js';
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
export declare class Agent {
    private config;
    private llm;
    private systemPrompt;
    constructor(options: AgentOptions);
    private buildSystemPrompt;
    processMessage(content: string, conversationId: string, userId: string, source: 'telegram' | 'discord' | 'websocket' | 'cli' | 'signal' | 'googlechat' | 'msteams' | 'matrix' | 'webchat' | 'slack'): Promise<AgentResponse>;
    private buildMessages;
    startConversation(userId: string, platform: 'telegram' | 'discord' | 'websocket' | 'cli' | 'signal' | 'googlechat' | 'msteams' | 'matrix' | 'webchat' | 'slack', initialMessage?: string): Promise<{
        conversationId: string;
        response?: AgentResponse;
    }>;
    getConversationHistory(conversationId: string): Promise<Message[]>;
    isAvailable(): boolean | Promise<boolean>;
    getConfig(): AppConfig;
    execute(request: ExecutionRequest): Promise<unknown>;
    private wrapUntrustedContent;
    executeShell(command: string, args?: string[], options?: Record<string, unknown>): Promise<unknown>;
    readFile(filePath: string): Promise<unknown>;
    writeFile(filePath: string, content: string): Promise<unknown>;
    listDirectory(dirPath: string): Promise<unknown>;
    searchFiles(pattern: string, options?: {
        recursive?: boolean;
        maxDepth?: number;
    }): Promise<unknown>;
    navigateBrowser(url: string): Promise<unknown>;
    clickBrowser(selector: string): Promise<unknown>;
    fillBrowser(selector: string, value: string): Promise<unknown>;
    screenshotBrowser(): Promise<unknown>;
    runSandboxedCode(code: string, language?: 'javascript' | 'typescript', input?: Record<string, unknown>): Promise<unknown>;
    getExecutionContext(): typeof executionContext;
}
export declare function createAgent(config: AppConfig, llm: LLMProvider): Agent;
//# sourceMappingURL=agent.d.ts.map