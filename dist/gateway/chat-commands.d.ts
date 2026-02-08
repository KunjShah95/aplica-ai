import { Agent } from '../core/agent.js';
export interface SessionConfig {
    thinkingLevel: 'off' | 'minimal' | 'low' | 'medium' | 'high' | 'xhigh';
    verboseLevel: number;
    model: string;
    sendPolicy: 'always' | 'mention' | 'never';
    groupActivation: 'mention' | 'always';
}
export interface ChatCommandContext {
    conversationId: string;
    userId: string;
    source: string;
    isOwner: boolean;
    isGroup: boolean;
}
export declare class ChatCommandHandler {
    private agent;
    private sessions;
    private usageStats;
    constructor(agent: Agent);
    handleCommand(command: string, args: string[], context: ChatCommandContext): Promise<{
        response: string;
        success: boolean;
    }>;
    private cmdStatus;
    private cmdNew;
    private cmdReset;
    private cmdCompact;
    private cmdThink;
    private cmdVerbose;
    private cmdUsage;
    private cmdRestart;
    private cmdActivation;
    private cmdHelp;
    private getSessionConfig;
    private updateSessionConfig;
    private summarizeConversation;
    updateUsage(conversationId: string, tokens: number, cost?: number): Promise<void>;
}
export declare const chatCommandHandler: ChatCommandHandler;
//# sourceMappingURL=chat-commands.d.ts.map