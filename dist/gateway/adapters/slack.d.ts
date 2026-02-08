import { MessageRouter } from '../router.js';
export interface SlackAdapterOptions {
    token: string;
    signingSecret?: string;
    appToken?: string;
    router: MessageRouter;
}
export declare class SlackAdapter {
    private client;
    private router;
    private isRunning;
    private botInfo;
    constructor(options: SlackAdapterOptions);
    start(): Promise<void>;
    stop(): Promise<void>;
    isActive(): boolean;
    sendMessage(channelId: string, content: string): Promise<string | null>;
    getBotInfo(): Promise<{
        id?: string;
        name?: string;
    }>;
}
//# sourceMappingURL=slack.d.ts.map