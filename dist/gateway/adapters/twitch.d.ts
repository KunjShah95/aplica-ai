import { MessageRouter } from '../router.js';
export interface TwitchAdapterOptions {
    clientId: string;
    clientSecret: string;
    botUsername: string;
    oauthToken: string;
    router: MessageRouter;
    channels?: string[];
}
export declare class TwitchAdapter {
    private router;
    private clientId;
    private clientSecret;
    private botUsername;
    private oauthToken;
    private channels;
    private ws?;
    private isRunning;
    private reconnectTimer?;
    constructor(options: TwitchAdapterOptions);
    start(): Promise<void>;
    stop(): Promise<void>;
    private connect;
    private scheduleReconnect;
    private handleMessage;
    private processMessage;
    joinChannel(channel: string): void;
    partChannel(channel: string): void;
    sendMessage(channel: string, message: string): Promise<void>;
    isActive(): boolean;
}
//# sourceMappingURL=twitch.d.ts.map