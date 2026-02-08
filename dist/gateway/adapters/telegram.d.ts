import { MessageRouter } from '../router.js';
export interface TelegramAdapterOptions {
    token: string;
    router: MessageRouter;
}
export declare class TelegramAdapter {
    private bot;
    private router;
    private isRunning;
    constructor(options: TelegramAdapterOptions);
    private setupHandlers;
    start(): Promise<void>;
    stop(): Promise<void>;
    isActive(): boolean;
    sendMessage(chatId: string, content: string): Promise<string | null>;
    getBotInfo(): Promise<{
        id: number;
        username: string;
        name: string;
    } | null>;
}
//# sourceMappingURL=telegram.d.ts.map