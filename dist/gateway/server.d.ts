import { AppConfig } from '../config/types.js';
import { MessageRouter } from './router.js';
export declare class GatewayServer {
    private config;
    private router;
    private agent;
    private wsGateway;
    private telegramAdapter;
    private discordAdapter;
    private slackAdapter;
    private isRunning;
    constructor(config: AppConfig);
    start(): Promise<void>;
    private startWebSocket;
    private startTelegram;
    private startDiscord;
    private startSlack;
    stop(): Promise<void>;
    getStatus(): {
        running: boolean;
        websocket: boolean;
        telegram: boolean;
        discord: boolean;
        slack: boolean;
    };
    getRouter(): MessageRouter;
}
//# sourceMappingURL=server.d.ts.map