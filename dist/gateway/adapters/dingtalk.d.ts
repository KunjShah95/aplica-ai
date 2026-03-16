import { MessageRouter } from '../router.js';
export interface DingTalkAdapterOptions {
    appKey: string;
    appSecret: string;
    agentId: string;
    router: MessageRouter;
}
export declare class DingTalkAdapter {
    private router;
    private appKey;
    private appSecret;
    private agentId;
    private accessToken?;
    private isRunning;
    constructor(options: DingTalkAdapterOptions);
    start(): Promise<void>;
    stop(): Promise<void>;
    private refreshAccessToken;
    handleWebhook(body: any): {
        status: number;
        body: any;
    };
    private processMessage;
    sendMessage(toUser: string, content: string): Promise<void>;
    isActive(): boolean;
}
//# sourceMappingURL=dingtalk.d.ts.map