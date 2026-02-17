import { Agent } from '../core/agent.js';
export interface RouterMessage {
    id: string;
    content: string;
    userId: string;
    conversationId?: string;
    source: 'telegram' | 'discord' | 'websocket' | 'cli' | 'signal' | 'googlechat' | 'msteams' | 'matrix' | 'webchat' | 'slack' | 'whatsapp';
    metadata?: Record<string, unknown>;
    timestamp: Date;
}
export interface RouterResponse {
    id: string;
    content: string;
    conversationId: string;
    tokensUsed: number;
    timestamp: Date;
}
export type MessageHandler = (message: RouterMessage) => Promise<RouterResponse>;
export declare class MessageRouter {
    private agent;
    private handlers;
    private rateLimiter;
    private stats;
    constructor(agent?: Agent);
    setAgent(agent: Agent): void;
    route(message: RouterMessage): Promise<RouterResponse>;
    private updateAverageResponseTime;
    registerHandler(source: string, handler: MessageHandler): void;
    unregisterHandler(source: string): boolean;
    handleFromTelegram(userId: string, message: string, conversationId?: string): Promise<RouterResponse>;
    handleFromDiscord(userId: string, message: string, conversationId?: string): Promise<RouterResponse>;
    handleFromWebSocket(userId: string, message: string, conversationId?: string): Promise<RouterResponse>;
    handleFromSlack(userId: string, message: string, conversationId?: string): Promise<RouterResponse>;
    handleFromCLI(userId: string, message: string, conversationId?: string): Promise<RouterResponse>;
    handleFromWhatsApp(userId: string, message: string, conversationId?: string): Promise<RouterResponse>;
    handleFromSignal(userId: string, message: string, conversationId?: string): Promise<RouterResponse>;
    handleFromGoogleChat(userId: string, message: string, conversationId?: string): Promise<RouterResponse>;
    handleFromMSTeams(userId: string, message: string, conversationId?: string): Promise<RouterResponse>;
    handleFromMatrix(userId: string, message: string, conversationId?: string): Promise<RouterResponse>;
    handleFromWebChat(userId: string, message: string, conversationId?: string): Promise<RouterResponse>;
    getStats(): RouterStats;
    resetStats(): void;
}
interface RouterStats {
    totalMessages: number;
    successfulMessages: number;
    failedMessages: number;
    averageResponseTime: number;
}
export declare const messageRouter: MessageRouter;
export {};
//# sourceMappingURL=router.d.ts.map