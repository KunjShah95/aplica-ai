import { MessageRouter } from '../router.js';
export interface MSTeamsAdapterOptions {
    tenantId: string;
    clientId: string;
    clientSecret: string;
    botId: string;
    router: MessageRouter;
}
export interface MSTeamsMessage {
    id: string;
    channelId: string;
    from: {
        id: string;
        name: string;
    };
    conversation: {
        id: string;
        name: string;
    };
    text: string;
    timestamp: string;
}
export declare class MSTeamsAdapter {
    private tenantId;
    private clientId;
    private clientSecret;
    private botId;
    private router;
    private isRunning;
    private accessToken?;
    private tokenExpiry?;
    constructor(options: MSTeamsAdapterOptions);
    private getAccessToken;
    start(): Promise<void>;
    stop(): Promise<void>;
    isActive(): boolean;
    handleActivity(activity: Record<string, unknown>): Promise<void>;
    sendMessage(conversationId: string, content: string): Promise<string | null>;
    createConversation(userId: string): Promise<string | null>;
}
//# sourceMappingURL=msteams.d.ts.map