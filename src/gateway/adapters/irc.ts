import { MessageRouter } from '../router.js';
import WebSocket from 'ws';

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

export class IRCAdapter {
  private router: MessageRouter;
  private host: string;
  private port: number;
  private nick: string;
  private username: string;
  private password?: string;
  private channels: Set<string> = new Set();
  private ws?: WebSocket;
  private isRunning: boolean = false;
  private reconnectAttempts: number = 0;
  private maxReconnectAttempts: number = 5;

  constructor(options: IRCAdapterOptions) {
    this.router = options.router;
    this.host = options.host;
    this.port = options.port;
    this.nick = options.nick;
    this.username = options.username || options.nick;
    this.password = options.password;

    if (options.channels) {
      options.channels.forEach((ch) => this.channels.add(ch.toLowerCase()));
    }
  }

  async start(): Promise<void> {
    console.log(`IRC adapter connecting to ${this.host}:${this.port}...`);

    const protocol = this.port === 6697 || this.port === 7778 ? 'wss:' : 'ws:';
    this.ws = new WebSocket(`${protocol}//${this.host}:${this.port}`);

    this.ws.on('open', () => {
      console.log(`Connected to IRC server: ${this.host}`);
      this.isRunning = true;
      this.reconnectAttempts = 0;

      if (this.password) {
        this.ws?.send(`PASS ${this.password}`);
      }
      this.ws?.send(`NICK ${this.nick}`);
      this.ws?.send(`USER ${this.username} 0 * :${this.username}`);

      for (const channel of this.channels) {
        this.joinChannel(channel);
      }
    });

    this.ws.on('message', (data: Buffer) => {
      this.handleMessage(data.toString());
    });

    this.ws.on('error', (error) => {
      console.error('IRC error:', error);
    });

    this.ws.on('close', () => {
      console.log('Disconnected from IRC server');
      this.isRunning = false;
      this.attemptReconnect();
    });
  }

  async stop(): Promise<void> {
    this.isRunning = false;
    if (this.ws) {
      this.ws.close();
    }
  }

  private attemptReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('Max reconnect attempts reached for IRC');
      return;
    }

    this.reconnectAttempts++;
    const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000);

    console.log(`Reconnecting to IRC in ${delay}ms (attempt ${this.reconnectAttempts})`);
    setTimeout(() => this.start(), delay);
  }

  private handleMessage(data: string): void {
    const lines = data.split('\r\n');

    for (const line of lines) {
      if (!line) continue;

      if (line.startsWith('PING')) {
        const pong = line.replace('PING', 'PONG');
        this.ws?.send(pong);
        continue;
      }

      const match = line.match(/^:([^!]+)!([^@]+)@[^\s]+ PRIVMSG ([^\s]+) :(.+)$/);
      if (match) {
        const [, nick, , channel, message] = match;
        this.processMessage(nick, channel, message);
      }
    }
  }

  private async processMessage(nick: string, channel: string, message: string): Promise<void> {
    const peerId = `${channel}:${nick}`;

    try {
      await this.router.handleFromWebSocket(peerId, message, channel);
    } catch (error) {
      console.error('Failed to process IRC message:', error);
    }
  }

  joinChannel(channel: string): void {
    const ch = channel.toLowerCase();
    this.channels.add(ch);
    this.ws?.send(`JOIN ${ch}`);
  }

  partChannel(channel: string): void {
    const ch = channel.toLowerCase();
    this.channels.delete(ch);
    this.ws?.send(`PART ${ch}`);
  }

  sendMessage(target: string, message: string): void {
    this.ws?.send(`PRIVMSG ${target} :${message}`);
  }

  sendNotice(target: string, message: string): void {
    this.ws?.send(`NOTICE ${target} :${message}`);
  }

  isActive(): boolean {
    return this.isRunning;
  }

  getChannels(): string[] {
    return Array.from(this.channels);
  }
}
