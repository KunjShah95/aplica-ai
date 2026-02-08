import { MessageRouter } from '../router.js';
import { WebSocketServer, WebSocket } from 'ws';
import { randomUUID } from 'crypto';

export interface WebChatAdapterOptions {
  port: number;
  router: MessageRouter;
}

export interface WebChatMessage {
  type: 'message' | 'typing' | 'presence';
  userId: string;
  conversationId?: string;
  content?: string;
  timestamp: Date;
}

export class WebChatAdapter {
  private port: number;
  private router: MessageRouter;
  private isRunning: boolean = false;
  private wss?: WebSocketServer;
  private connections: Map<string, WebSocket> = new Map();
  private userConversations: Map<string, string> = new Map();

  constructor(options: WebChatAdapterOptions) {
    this.port = options.port;
    this.router = options.router;
  }

  private setupWebSocket(): void {
    this.wss = new WebSocketServer({ port: this.port });

    this.wss.on('connection', (ws: WebSocket) => {
      const connectionId = randomUUID();
      this.connections.set(connectionId, ws);

      ws.on('message', async (data: Buffer) => {
        try {
          const message = JSON.parse(data.toString()) as WebChatMessage;
          await this.handleMessage(connectionId, ws, message);
        } catch (error) {
          console.error('Error parsing WebChat message:', error);
        }
      });

      ws.on('close', () => {
        this.connections.delete(connectionId);
      });

      ws.on('error', (error: Error) => {
        console.error('WebChat connection error:', error);
        this.connections.delete(connectionId);
      });

      ws.send(
        JSON.stringify({
          type: 'connected',
          connectionId,
          timestamp: new Date(),
        })
      );
    });

    this.wss.on('error', (error: Error) => {
      console.error('WebSocket server error:', error);
    });
  }

  private async handleMessage(
    connectionId: string,
    ws: WebSocket,
    message: WebChatMessage
  ): Promise<void> {
    switch (message.type) {
      case 'message':
        await this.handleChatMessage(connectionId, ws, message);
        break;
      case 'typing':
        await this.handleTyping(connectionId, message);
        break;
      case 'presence':
        await this.handlePresence(connectionId, message);
        break;
    }
  }

  private async handleChatMessage(
    connectionId: string,
    ws: WebSocket,
    message: WebChatMessage
  ): Promise<void> {
    const userId = message.userId;
    const content = message.content || '';
    let conversationId = message.conversationId || this.userConversations.get(userId);

    if (!content) return;

    try {
      const response = await this.router.handleFromWebChat(userId, content, conversationId);

      if (!conversationId) {
        this.userConversations.set(userId, response.conversationId);
        conversationId = response.conversationId;
      }

      ws.send(
        JSON.stringify({
          type: 'message',
          userId: 'assistant',
          conversationId: response.conversationId,
          content: response.content,
          timestamp: response.timestamp,
        })
      );
    } catch (error) {
      console.error('Error handling WebChat message:', error);
      ws.send(
        JSON.stringify({
          type: 'error',
          message: 'Failed to process message',
          timestamp: new Date(),
        })
      );
    }
  }

  private async handleTyping(connectionId: string, message: WebChatMessage): Promise<void> {
    const userId = message.userId;
    const conversationId = this.userConversations.get(userId);

    if (!conversationId) return;

    this.wsSendToUser(
      userId,
      JSON.stringify({
        type: 'typing',
        userId: message.userId,
        conversationId,
        timestamp: new Date(),
      })
    );
  }

  private async handlePresence(connectionId: string, message: WebChatMessage): Promise<void> {
    this.wsSendToUser(
      message.userId,
      JSON.stringify({
        type: 'presence',
        userId: message.userId,
        status: 'online',
        timestamp: new Date(),
      })
    );
  }

  private wsSendToUser(userId: string, data: string): void {
    for (const [connectionId, ws] of this.connections.entries()) {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(data);
      }
    }
  }

  async start(): Promise<void> {
    if (this.isRunning) {
      console.log('WebChat adapter is already running');
      return;
    }

    this.setupWebSocket();
    this.isRunning = true;
    console.log(`WebChat adapter started on port ${this.port}`);
  }

  async stop(): Promise<void> {
    if (!this.isRunning) return;

    this.wss?.close();
    this.connections.clear();
    this.isRunning = false;
    console.log('WebChat adapter stopped');
  }

  isActive(): boolean {
    return this.isRunning;
  }

  async broadcastToAll(message: object): Promise<void> {
    const data = JSON.stringify(message);
    for (const ws of this.connections.values()) {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(data);
      }
    }
  }

  async sendToUser(userId: string, message: object): Promise<void> {
    const data = JSON.stringify(message);
    for (const [connectionId, ws] of this.connections.entries()) {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(data);
      }
    }
  }

  getConnectionCount(): number {
    return this.connections.size;
  }
}
