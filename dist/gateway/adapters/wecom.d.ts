import { MessageRouter } from '../router.js';
export interface WeComAdapterOptions {
    corpId: string;
    corpSecret: string;
    agentId: string;
    router: MessageRouter;
    token?: string;
    encodingAesKey?: string;
}
export declare class WeComAdapter {
    private router;
    private corpId;
    private corpSecret;
    private agentId;
    private token?;
    private encodingAesKey?;
    private accessToken?;
    private isRunning;
    constructor(options: WeComAdapterOptions);
    start(): Promise<void>;
    stop(): Promise<void>;
    private refreshAccessToken;
    handleWebhook(query: any, body: any): {
        status: number;
        body: any;
    };
    verifyURL(msgSignature: string, timestamp: string, nonce: string, echostr: string): string;
    private generateSignature;
    private handleEvent;
    private processMessage;
    sendMessage(toUser: string, content: string): Promise<void>;
    sendMarkdown(toUser: string, content: string): Promise<void>;
    isActive(): boolean;
}
//# sourceMappingURL=wecom.d.ts.map