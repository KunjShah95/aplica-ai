import { MessageRouter } from '../router.js';
export interface LineAdapterOptions {
    channelId: string;
    channelSecret: string;
    channelAccessToken: string;
    router: MessageRouter;
}
export declare class LineAdapter {
    private router;
    private channelId;
    private channelSecret;
    private channelAccessToken;
    private isRunning;
    constructor(options: LineAdapterOptions);
    start(): Promise<void>;
    stop(): Promise<void>;
    handleWebhook(body: any, signature: string): {
        status: number;
        body: any;
    };
    private processEvent;
    sendMessage(to: string, content: string): Promise<void>;
    reply(replyToken: string, content: string): Promise<void>;
    isActive(): boolean;
}
//# sourceMappingURL=line.d.ts.map