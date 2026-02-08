import { MessageRouter } from '../router.js';
export interface DiscordAdapterOptions {
    token: string;
    guildId: string;
    router: MessageRouter;
}
export declare class DiscordAdapter {
    private client;
    private router;
    private guildId;
    private isRunning;
    constructor(options: DiscordAdapterOptions);
    private setupHandlers;
    private chunkMessage;
    start(): Promise<void>;
    stop(): Promise<void>;
    isActive(): boolean;
    get token(): string;
    sendMessage(channelId: string, content: string): Promise<string | null>;
    registerCommands(): Promise<void>;
}
//# sourceMappingURL=discord.d.ts.map