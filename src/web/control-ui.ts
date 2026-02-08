import { randomUUID } from 'crypto';
import { WebSocketServer, WebSocket } from 'ws';
import { IncomingMessage, Server as HttpServer } from 'http';
import { createServer } from 'https';
import { readFileSync } from 'fs';

export interface ControlUIConfig {
  port: number;
  https: boolean;
  certificate?: string;
  key?: string;
  password?: string;
  authEnabled: boolean;
}

export interface DashboardWidget {
  id: string;
  type: WidgetType;
  title: string;
  position: { x: number; y: number };
  size: { width: number; height: number };
  config: Record<string, unknown>;
}

export type WidgetType =
  | 'stats'
  | 'conversations'
  | 'channels'
  | 'health'
  | 'logs'
  | 'activity'
  | 'usage'
  | 'skills'
  | 'nodes'
  | 'custom';

export interface DashboardConfig {
  id: string;
  name: string;
  widgets: DashboardWidget[];
  theme: 'light' | 'dark';
  refreshInterval: number;
}

export interface ControlEvent {
  type: ControlEventType;
  timestamp: Date;
  data: Record<string, unknown>;
}

export type ControlEventType =
  | 'gateway_start'
  | 'gateway_stop'
  | 'gateway_restart'
  | 'channel_enable'
  | 'channel_disable'
  | 'skill_install'
  | 'skill_uninstall'
  | 'config_update'
  | 'user_action';

export class ControlUIServer {
  private config: ControlUIConfig;
  private server?: HttpServer;
  private wss?: WebSocketServer;
  private connections: Map<string, WebSocket> = new Map();
  private dashboards: Map<string, DashboardConfig> = new Map();
  private eventHistory: ControlEvent[] = [];
  private maxHistory: number;
  private listeners: Set<(event: ControlEvent) => void> = new Set();

  constructor(config?: Partial<ControlUIConfig>, maxHistory: number = 1000) {
    this.config = {
      port: config?.port ?? 18790,
      https: config?.https ?? false,
      certificate: config?.certificate,
      key: config?.key,
      password: config?.password,
      authEnabled: config?.authEnabled ?? true,
    };
    this.maxHistory = maxHistory;
    this.createDefaultDashboard();
  }

  private createDefaultDashboard(): void {
    const dashboard: DashboardConfig = {
      id: 'default',
      name: 'Main Dashboard',
      theme: 'dark',
      refreshInterval: 5000,
      widgets: [
        {
          id: 'stats-1',
          type: 'stats',
          title: 'System Stats',
          position: { x: 0, y: 0 },
          size: { width: 4, height: 2 },
          config: {},
        },
        {
          id: 'channels-1',
          type: 'channels',
          title: 'Channels',
          position: { x: 4, y: 0 },
          size: { width: 4, height: 2 },
          config: {},
        },
        {
          id: 'health-1',
          type: 'health',
          title: 'Health',
          position: { x: 8, y: 0 },
          size: { width: 4, height: 2 },
          config: {},
        },
        {
          id: 'activity-1',
          type: 'activity',
          title: 'Recent Activity',
          position: { x: 0, y: 2 },
          size: { width: 6, height: 3 },
          config: {},
        },
        {
          id: 'usage-1',
          type: 'usage',
          title: 'Usage',
          position: { x: 6, y: 2 },
          size: { width: 6, height: 3 },
          config: {},
        },
      ],
    };

    this.dashboards.set(dashboard.id, dashboard);
  }

  async start(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.config.https && this.config.certificate && this.config.key) {
        const https = createServer(
          {
            cert: readFileSync(this.config.certificate),
            key: readFileSync(this.config.key),
            requestCert: false,
          },
          (req, res) => {
            this.handleRequest(req, res);
          }
        );

        this.server = https;
      } else {
        this.server = createServer((req, res) => {
          this.handleRequest(req, res);
        });
      }

      this.wss = new WebSocketServer({ server: this.server });

      this.wss.on('connection', (ws: WebSocket, req: IncomingMessage) => {
        this.handleConnection(ws, req);
      });

      this.server.on('error', reject);

      this.server.listen(this.config.port, () => {
        console.log(`Control UI started on port ${this.config.port}`);
        resolve();
      });
    });
  }

  private handleRequest(req: IncomingMessage, res: any): void {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(
      JSON.stringify({
        status: 'ok',
        version: '1.0.0',
        endpoints: [
          'GET /api/status',
          'GET /api/channels',
          'GET /api/stats',
          'GET /api/events',
          'POST /api/gateway/restart',
          'WS /ws',
        ],
      })
    );
  }

  private handleConnection(ws: WebSocket, req: IncomingMessage): void {
    const connectionId = randomUUID();
    this.connections.set(connectionId, ws);

    ws.on('message', (data: Buffer) => {
      try {
        const message = JSON.parse(data.toString());
        this.handleMessage(connectionId, ws, message);
      } catch (error) {
        console.error('Invalid message received:', error);
      }
    });

    ws.on('close', () => {
      this.connections.delete(connectionId);
    });

    ws.on('error', (error) => {
      console.error('WebSocket error:', error);
      this.connections.delete(connectionId);
    });

    ws.send(
      JSON.stringify({
        type: 'connected',
        connectionId,
        timestamp: new Date(),
      })
    );
  }

  private handleMessage(
    connectionId: string,
    ws: WebSocket,
    message: Record<string, unknown>
  ): void {
    switch (message.type) {
      case 'auth':
        this.handleAuth(connectionId, ws, message);
        break;
      case 'subscribe':
        this.handleSubscribe(connectionId, message);
        break;
      case 'unsubscribe':
        this.handleUnsubscribe(connectionId, message);
        break;
      case 'action':
        this.handleAction(connectionId, message);
        break;
      case 'ping':
        ws.send(JSON.stringify({ type: 'pong', timestamp: new Date() }));
        break;
    }
  }

  private handleAuth(connectionId: string, ws: WebSocket, message: Record<string, unknown>): void {
    if (!this.config.authEnabled) {
      ws.send(JSON.stringify({ type: 'auth_success', connectionId }));
      return;
    }

    if (message.password === this.config.password) {
      ws.send(JSON.stringify({ type: 'auth_success', connectionId }));
    } else {
      ws.send(JSON.stringify({ type: 'auth_error', error: 'Invalid password' }));
      ws.close();
    }
  }

  private subscriptions: Map<string, Set<string>> = new Map();

  private handleSubscribe(connectionId: string, message: Record<string, unknown>): void {
    const topics = message.topics as string[];
    if (!topics) return;

    if (!this.subscriptions.has(connectionId)) {
      this.subscriptions.set(connectionId, new Set());
    }

    for (const topic of topics) {
      this.subscriptions.get(connectionId)!.add(topic);
    }
  }

  private handleUnsubscribe(connectionId: string, message: Record<string, unknown>): void {
    const topics = message.topics as string[];
    if (!topics) return;

    const subs = this.subscriptions.get(connectionId);
    if (subs) {
      for (const topic of topics) {
        subs.delete(topic);
      }
    }
  }

  private handleAction(connectionId: string, message: Record<string, unknown>): void {
    const action = message.action as string;
    const payload = message.payload as Record<string, unknown>;

    this.recordEvent('user_action', { action, payload, connectionId });

    switch (action) {
      case 'gateway_restart':
        this.emit({ type: 'gateway_restart', timestamp: new Date(), data: { connectionId } });
        break;
      case 'channel_enable':
        this.emit({ type: 'channel_enable', timestamp: new Date(), data: payload });
        break;
      case 'channel_disable':
        this.emit({ type: 'channel_disable', timestamp: new Date(), data: payload });
        break;
      case 'skill_install':
        this.emit({ type: 'skill_install', timestamp: new Date(), data: payload });
        break;
      case 'skill_uninstall':
        this.emit({ type: 'skill_uninstall', timestamp: new Date(), data: payload });
        break;
      case 'config_update':
        this.emit({ type: 'config_update', timestamp: new Date(), data: payload });
        break;
    }

    this.broadcast(
      {
        type: 'action_result',
        action,
        success: true,
        timestamp: new Date(),
      },
      connectionId
    );
  }

  private recordEvent(type: ControlEventType, data: Record<string, unknown>): void {
    const event: ControlEvent = {
      type,
      timestamp: new Date(),
      data,
    };

    this.eventHistory.push(event);

    if (this.eventHistory.length > this.maxHistory) {
      this.eventHistory = this.eventHistory.slice(-this.maxHistory);
    }
  }

  broadcast(message: object, excludeConnectionId?: string): void {
    const data = JSON.stringify(message);

    for (const [connectionId, ws] of this.connections.entries()) {
      if (connectionId === excludeConnectionId) continue;

      if (ws.readyState === WebSocket.OPEN) {
        ws.send(data);
      }
    }
  }

  broadcastEvent(event: ControlEvent): void {
    this.broadcast({
      type: 'event',
      eventType: event.type,
      timestamp: event.timestamp,
      data: event.data,
    });
  }

  emit(event: ControlEvent): void {
    this.recordEvent(event.type, event.data);
    this.broadcastEvent(event);

    for (const listener of this.listeners) {
      listener(event);
    }
  }

  on(listener: (event: ControlEvent) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  getDashboards(): DashboardConfig[] {
    return Array.from(this.dashboards.values());
  }

  getDashboard(id: string): DashboardConfig | undefined {
    return this.dashboards.get(id);
  }

  updateDashboard(id: string, updates: Partial<DashboardConfig>): DashboardConfig | null {
    const dashboard = this.dashboards.get(id);
    if (!dashboard) return null;

    const updated = { ...dashboard, ...updates };
    this.dashboards.set(id, updated);
    return updated;
  }

  getEvents(limit?: number): ControlEvent[] {
    if (limit) {
      return this.eventHistory.slice(-limit);
    }
    return [...this.eventHistory];
  }

  getStats(): {
    connections: number;
    events: number;
    dashboards: number;
    uptime: number;
  } {
    return {
      connections: this.connections.size,
      events: this.eventHistory.length,
      dashboards: this.dashboards.size,
      uptime: process.uptime(),
    };
  }

  async stop(): Promise<void> {
    for (const ws of this.connections.values()) {
      ws.close();
    }
    this.connections.clear();

    if (this.wss) {
      this.wss.close();
    }

    if (this.server) {
      await new Promise<void>((resolve) => {
        this.server!.close(() => resolve());
      });
    }

    console.log('Control UI stopped');
  }
}

export const controlUI = new ControlUIServer();
