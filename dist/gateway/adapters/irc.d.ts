import { MessageRouter } from '../router.js';
export interface IRCAdapterOptions {
    host: string;
    port: number;
    ssl?: boolean;
    nick: string;
    username?: string;
    password?: string;
    channels?: string[];
    router: MessageRouter;
}
export declare class IRCAdapter {
    private router;
    private host;
    private port;
    private nick;
    private username;
    private password?;
    private channels;
    private ws?;
    private isRunning;
    private reconnectAttempts;
    private maxReconnectAttempts;
    constructor(options: IRCAdapterOptions);
    start(): Promise<void>;
    stop(): Promise<void>;
    private attemptReconnect;
    private handleMessage;
    private processMessage;
    joinChannel(channel: string): void;
    partChannel(channel: string): void;
    sendMessage(target: string, message: string): void;
    sendNotice(target: string, message: string): void;
    isActive(): boolean;
    getChannels(): string[];
}
//# sourceMappingURL=irc.d.ts.map