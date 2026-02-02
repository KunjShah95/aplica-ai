import { AppConfig } from '../config/types';
export declare class GatewayServer {
    private config;
    private wss;
    private connections;
    constructor(config: AppConfig);
    start(): Promise<void>;
    private startWebSocket;
    private handleMessage;
    private send;
    broadcast(data: unknown): void;
    stop(): Promise<void>;
}
//# sourceMappingURL=index.d.ts.map