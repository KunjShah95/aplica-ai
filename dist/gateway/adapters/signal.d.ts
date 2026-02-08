import { MessageRouter } from '../router.js';
export interface SignalAdapterOptions {
    signalServiceUrl: string;
    phoneNumber: string;
    router: MessageRouter;
}
export interface SignalMessage {
    envelope: {
        source: string;
        sourceNumber: string;
        sourceUuid: string;
        timestamp: number;
        message?: {
            timestamp: number;
            message: string;
        };
    };
}
export declare class SignalAdapter {
    private signalServiceUrl;
    private phoneNumber;
    private router;
    private isRunning;
    private eventSource?;
    constructor(options: SignalAdapterOptions);
    private setupHandlers;
    private handleMessage;
    start(): Promise<void>;
    stop(): Promise<void>;
    isActive(): boolean;
    sendMessage(recipientId: string, content: string): Promise<string | null>;
    getInfo(): Promise<{
        number: string;
        deviceId: string;
    } | null>;
}
//# sourceMappingURL=signal.d.ts.map