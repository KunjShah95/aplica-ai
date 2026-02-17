import { AppConfig } from '../config/types.js';
import { MessageRouter } from './router.js';
import { WebSocketGateway } from './websocket.js';
import { TelegramAdapter } from './adapters/telegram.js';
import { DiscordAdapter } from './adapters/discord.js';
import { SlackAdapter } from './adapters/slack.js';
import { WhatsAppAdapter } from './adapters/whatsapp/index.js';
import { SignalAdapter } from './adapters/signal.js';
import { GoogleChatAdapter } from './adapters/googlechat.js';
import { MSTeamsAdapter } from './adapters/msteams.js';
import { MatrixAdapter } from './adapters/matrix.js';
import { WebChatAdapter } from './adapters/webchat.js';
export declare class GatewayServer {
    private config;
    private router;
    private agent;
    wsGateway: WebSocketGateway | null;
    telegramAdapter: TelegramAdapter | null;
    discordAdapter: DiscordAdapter | null;
    slackAdapter: SlackAdapter | null;
    whatsappAdapter: WhatsAppAdapter | null;
    signalAdapter: SignalAdapter | null;
    googleChatAdapter: GoogleChatAdapter | null;
    msTeamsAdapter: MSTeamsAdapter | null;
    matrixAdapter: MatrixAdapter | null;
    webChatAdapter: WebChatAdapter | null;
    private isRunning;
    constructor(config: AppConfig);
    start(): Promise<void>;
    private startWebSocket;
    private startTelegram;
    private startDiscord;
    private startSlack;
    private startWhatsApp;
    private startSignal;
    private startGoogleChat;
    private startMSTeams;
    private startMatrix;
    private startWebChat;
    stop(): Promise<void>;
    getStatus(): GatewayStatus;
    getRouter(): MessageRouter;
}
export interface GatewayStatus {
    running: boolean;
    uptime: number;
    platforms: {
        websocket: boolean;
        telegram: boolean;
        discord: boolean;
        slack: boolean;
        whatsapp: boolean;
        signal: boolean;
        googleChat: boolean;
        msTeams: boolean;
        matrix: boolean;
        webChat: boolean;
    };
    stats: {
        totalMessages: number;
        successfulMessages: number;
        failedMessages: number;
        averageResponseTime: number;
    };
}
//# sourceMappingURL=server.d.ts.map