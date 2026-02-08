import { MessageRouter } from '../router.js';
export interface WebChatAdapterOptions {
    port: number;
    router: MessageRouter;
}
export interface WebChatMessage {
    type: 'message' | 'typing' | 'presence';
    userId: string;
    conversationId?: string;
    content?: string;
    timestamp: Date;
}
export declare class WebChatAdapter {
    private port;
    private router;
    private isRunning;
    private wss?;
    private connections;
    private userConversations;
    constructor(options: WebChatAdapterOptions);
    private setupWebSocket;
    private handleMessage;
    private handleChatMessage;
    private handleTyping;
    private handlePresence;
    private wsSendToUser;
    start(): Promise<void>;
    stop(): Promise<void>;
    isActive(): boolean;
    broadcastToAll(message: object): Promise<void>;
    sendToUser(userId: string, message: object): Promise<void>;
    getConnectionCount(): number;
}
//# sourceMappingURL=webchat.d.ts.map