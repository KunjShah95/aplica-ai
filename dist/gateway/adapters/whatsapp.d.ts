import { MessageRouter } from '../router.js';
export interface WhatsAppAdapterOptions {
    phoneNumberId: string;
    accessToken: string;
    router: MessageRouter;
    verifyToken?: string;
}
export declare class WhatsAppAdapter {
    private router;
    private phoneNumberId;
    private accessToken;
    private verifyToken;
    private isRunning;
    constructor(options: WhatsAppAdapterOptions);
    start(): Promise<void>;
    stop(): Promise<void>;
    handleWebhook(body: any): {
        status: number;
        body: any;
    };
    handleVerify(mode: string, token: string): boolean;
    private processMessage;
    sendMessage(to: string, content: string): Promise<void>;
    isActive(): boolean;
}
//# sourceMappingURL=whatsapp.d.ts.map