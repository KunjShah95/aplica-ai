import { WebSocketServer, WebSocket } from 'ws';
import { Agent } from '../core/agent.js';
import { MessageRouter } from './router.js';
import { randomUUID } from 'crypto';

export interface WSClient {
  id: string;
  ws: WebSocket;
  userId: string;
  connectedAt: Date;
  lastActivity: Date;
}

export interface WSMessage {
  type: 'message' | 'history' | 'status' | 'ping' | 'pong' | 'auth' | 'connected';
  payload: unknown;
  id?: string;
}

export interface WSResponse {
  type:
    | 'message'
    | 'error'
    | 'history'
    | 'status'
    | 'pong'
    | 'auth'
    | 'connected'
    | 'ping'
    | 'broadcast';
  payload: unknown;
  id?: string;
  timestamp: Date;
}

export class WebSocketGateway {
  private server: WebSocketServer | null = null;
  private agent: Agent;
  private router: MessageRouter;
  private clients: Map<string, WSClient> = new Map();
  private userSessions: Map<string, string> = new Map();
  private port: number;
  private pingInterval: NodeJS.Timeout | null = null;

  constructor(agent: Agent, router: MessageRouter, options: { port?: number } = {}) {
    this.agent = agent;
    this.router = router;
    this.port = options.port || 3001;
  }

  async start(): Promise<void> {
    this.server = new WebSocketServer({ port: this.port });

    this.server.on('connection', (ws: WebSocket) => {
      this.handleConnection(ws);
    });

    this.startPingInterval();

    console.log(`🔌 WebSocket Gateway listening on port ${this.port}`);
  }

  private handleConnection(ws: WebSocket): void {
    const clientId = randomUUID();
    const client: WSClient = {
      id: clientId,
      ws,
      userId: 'anonymous',
      connectedAt: new Date(),
      lastActivity: new Date(),
    };

    this.clients.set(clientId, client);

    console.log(`🔌 Client connected: ${clientId}`);

    this.send(clientId, {
      type: 'connected',
      payload: { clientId, serverTime: new Date().toISOString() },
      timestamp: new Date(),
    });

    ws.on('message', (data: Buffer) => {
      this.handleMessage(clientId, data.toString());
    });

    ws.on('close', () => {
      this.handleDisconnect(clientId);
    });

    ws.on('error', (error) => {
      console.error(`WebSocket error for ${clientId}:`, error);
      this.handleDisconnect(clientId);
    });
  }

  private async handleMessage(clientId: string, data: string): Promise<void> {
    const client = this.clients.get(clientId);
    if (!client) return;

    client.lastActivity = new Date();

    try {
      const message: WSMessage = JSON.parse(data);

      switch (message.type) {
        case 'auth':
          await this.handleAuth(clientId, message.payload);
          break;

        case 'message':
          await this.handleChatMessage(clientId, message.payload);
          break;

        case 'history':
          await this.handleHistoryRequest(clientId, message.payload);
          break;

        case 'status':
          await this.handleStatusRequest(clientId);
          break;

        case 'ping':
          this.send(clientId, {
            type: 'pong',
            payload: { timestamp: Date.now() },
            timestamp: new Date(),
          });
          break;

        default:
          this.sendError(clientId, `Unknown message type: ${message.type}`);
      }
    } catch (error) {
      console.error(`Error handling message from ${clientId}:`, error);
      this.sendError(clientId, 'Invalid message format');
    }
  }

  private async handleAuth(clientId: string, payload: unknown): Promise<void> {
    const client = this.clients.get(clientId);
    if (!client) return;

    const data = payload as { userId: string };
    if (data?.userId) {
      client.userId = data.userId;
      this.userSessions.set(data.userId, clientId);

      this.send(clientId, {
        type: 'auth',
        payload: { success: true, userId: data.userId },
        timestamp: new Date(),
      });

      console.log(`🔐 Client ${clientId} authenticated as ${data.userId}`);
    }
  }

  private async handleChatMessage(clientId: string, payload: unknown): Promise<void> {
    const client = this.clients.get(clientId);
    if (!client) return;

    const data = payload as {
      content: string;
      conversationId?: string;
    };

    if (!data?.content) {
      this.sendError(clientId, 'Message content is required');
      return;
    }

    try {
      const response = await this.router.handleFromWebSocket(
        client.userId,
        data.content,
        data.conversationId
      );

      this.send(clientId, {
        type: 'message',
        payload: {
          id: response.id,
          content: response.content,
          conversationId: response.conversationId,
          tokensUsed: response.tokensUsed,
        },
        id: response.id,
        timestamp: response.timestamp,
      });
    } catch (error) {
      this.sendError(clientId, 'Failed to process message');
    }
  }

  private async handleHistoryRequest(clientId: string, payload: unknown): Promise<void> {
    const data = payload as { conversationId: string };

    if (!data?.conversationId) {
      this.sendError(clientId, 'Conversation ID is required');
      return;
    }

    const history = await this.agent.getConversationHistory(data.conversationId);

    this.send(clientId, {
      type: 'history',
      payload: { conversationId: data.conversationId, messages: history },
      timestamp: new Date(),
    });
  }

  private async handleStatusRequest(clientId: string): Promise<void> {
    const routerStats = this.router.getStats();

    this.send(clientId, {
      type: 'status',
      payload: {
        clients: this.clients.size,
        router: routerStats,
        uptime: process.uptime(),
        memory: process.memoryUsage(),
      },
      timestamp: new Date(),
    });
  }

  private handleDisconnect(clientId: string): void {
    const client = this.clients.get(clientId);
    if (client) {
      this.userSessions.delete(client.userId);
      this.clients.delete(clientId);
      console.log(`🔌 Client disconnected: ${clientId}`);
    }
  }

  private send(clientId: string, response: WSResponse): void {
    const client = this.clients.get(clientId);
    if (client && client.ws.readyState === WebSocket.OPEN) {
      client.ws.send(JSON.stringify(response));
    }
  }

  private sendError(clientId: string, message: string): void {
    this.send(clientId, {
      type: 'error',
      payload: { message },
      timestamp: new Date(),
    });
  }

  private startPingInterval(): void {
    this.pingInterval = setInterval(() => {
      this.pingClients();
    }, 30000);
  }

  private pingClients(): void {
    const now = new Date();
    for (const [clientId, client] of this.clients) {
      const inactiveTime = now.getTime() - client.lastActivity.getTime();
      if (inactiveTime > 60000) {
        this.handleDisconnect(clientId);
      } else {
        this.send(clientId, {
          type: 'ping',
          payload: { timestamp: now.toISOString() },
          timestamp: now,
        });
      }
    }
  }

  broadcast(event: string, data: unknown): void {
    const message = JSON.stringify({
      type: 'broadcast',
      event,
      payload: data,
      timestamp: new Date(),
    });

    for (const client of this.clients.values()) {
      if (client.ws.readyState === WebSocket.OPEN) {
        client.ws.send(message);
      }
    }
  }

  getStats(): { clients: number; uptime: number } {
    return {
      clients: this.clients.size,
      uptime: process.uptime(),
    };
  }

  async stop(): Promise<void> {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
    }

    for (const client of this.clients.values()) {
      client.ws.close();
    }
    this.clients.clear();
    this.userSessions.clear();

    if (this.server) {
      this.server.close();
    }

    console.log('🔌 WebSocket Gateway stopped');
  }
}
