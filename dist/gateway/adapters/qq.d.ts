import { MessageRouter } from '../router.js';
export interface QQAdapterOptions {
    appId: string;
    token: string;
    secret: string;
    router: MessageRouter;
}
export declare class QQAdapter {
    private router;
    private appId;
    private token;
    private secret;
    private isRunning;
    constructor(options: QQAdapterOptions);
    start(): Promise<void>;
    stop(): Promise<void>;
    handleWebhook(body: any): {
        status: number;
        body: any;
    };
    handleDirectMessage(body: any): {
        status: number;
        body: any;
    };
    private processMessage;
    sendMessage(targetId: string, content: string): Promise<void>;
    sendDirectMessage(userId: string, content: string): Promise<void>;
    isActive(): boolean;
}
//# sourceMappingURL=qq.d.ts.map