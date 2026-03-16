import { MessageRouter } from '../router.js';
export interface SMSAdapterOptions {
    accountSid: string;
    authToken: string;
    phoneNumber: string;
    router: MessageRouter;
}
export declare class SMSAdapter {
    private router;
    private accountSid;
    private authToken;
    private phoneNumber;
    private isRunning;
    constructor(options: SMSAdapterOptions);
    start(): Promise<void>;
    stop(): Promise<void>;
    handleWebhook(body: any): {
        status: number;
        body: any;
    };
    private processMessage;
    sendMessage(to: string, content: string): Promise<void>;
    isActive(): boolean;
}
//# sourceMappingURL=sms.d.ts.map