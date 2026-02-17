import { WebSocket } from 'ws';
import { Agent } from '../core/agent.js';
import { MessageRouter } from './router.js';
import { AuthUser } from '../auth/index.js';
export interface WSClient {
    id: string;
    ws: WebSocket;
    userId: string;
    role?: AuthUser['role'];
    connectedAt: Date;
    lastActivity: Date;
}
export interface WSMessage {
    type: 'message' | 'history' | 'status' | 'ping' | 'pong' | 'auth' | 'connected';
    payload: unknown;
    id?: string;
}
export interface WSResponse {
    type: 'message' | 'error' | 'history' | 'status' | 'pong' | 'auth' | 'connected' | 'ping' | 'broadcast';
    payload: unknown;
    id?: string;
    timestamp: Date;
}
export declare class WebSocketGateway {
    private server;
    private agent;
    private router;
    private clients;
    private userSessions;
    private rateLimiter;
    private port;
    private pingInterval;
    private approvalHandlers?;
    constructor(agent: Agent, router: MessageRouter, options?: {
        port?: number;
    });
    start(): Promise<void>;
    private handleConnection;
    private handleMessage;
    private handleAuth;
    private handleChatMessage;
    private handleHistoryRequest;
    private handleStatusRequest;
    private handleDisconnect;
    private registerApprovalListeners;
    private broadcastToAdmins;
    private send;
    private sendError;
    private startPingInterval;
    private pingClients;
    broadcast(event: string, data: unknown): void;
    getStats(): {
        clients: number;
        uptime: number;
    };
    stop(): Promise<void>;
}
//# sourceMappingURL=websocket.d.ts.map