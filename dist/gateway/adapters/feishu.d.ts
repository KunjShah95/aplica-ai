import { MessageRouter } from '../router.js';
export interface FeishuAdapterOptions {
    appId: string;
    appSecret: string;
    verificationToken?: string;
    encryptKey?: string;
    router: MessageRouter;
}
export declare class FeishuAdapter {
    private router;
    private appId;
    private appSecret;
    private verificationToken?;
    private encryptKey?;
    private isRunning;
    constructor(options: FeishuAdapterOptions);
    start(): Promise<void>;
    stop(): Promise<void>;
    verifyURL(timestamp: string, nonce: string, signature: string): boolean;
    handleWebhook(body: any): {
        status: number;
        body: any;
    };
    private processMessage;
    sendMessage(receiveIdType: 'user_id' | 'chat_id', receiveId: string, content: string): Promise<void>;
    private getTenantToken;
    isActive(): boolean;
}
//# sourceMappingURL=feishu.d.ts.map