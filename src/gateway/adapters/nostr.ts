import { MessageRouter } from '../router.js';
import { randomUUID } from 'crypto';
import WebSocket from 'ws';

export interface NostrAdapterOptions {
  relayUrls: string[];
  privateKey: string;
  router: MessageRouter;
  filter?: {
    kinds?: number[];
    since?: number;
  };
}

interface NostrEvent {
  id: string;
  pubkey: string;
  created_at: number;
  kind: number;
  tags: string[][];
  content: string;
  sig: string;
}

export class NostrAdapter {
  private router: MessageRouter;
  private relayUrls: string[];
  private privateKey: string;
  private relays: Map<string, WebSocket> = new Map();
  private subscriptions: Map<string, Set<string>> = new Map();
  private isRunning: boolean = false;

  constructor(options: NostrAdapterOptions) {
    this.router = options.router;
    this.relayUrls = options.relayUrls;
    this.privateKey = options.privateKey;
  }

  async start(): Promise<void> {
    console.log('Nostr adapter starting...');

    for (const url of this.relayUrls) {
      this.connectToRelay(url);
    }

    this.isRunning = true;
  }

  async stop(): Promise<void> {
    for (const ws of this.relays.values()) {
      ws.close();
    }
    this.relays.clear();
    this.isRunning = false;
  }

  private connectToRelay(url: string): void {
    try {
      const ws = new WebSocket(url);

      ws.on('open', () => {
        console.log(`Connected to Nostr relay: ${url}`);
        this.relays.set(url, ws);
        this.subscribe(url);
      });

      ws.on('message', (data) => {
        const msg = JSON.parse(data.toString());
        this.handleMessage(msg);
      });

      ws.on('error', (error) => {
        console.error(`Nostr relay error (${url}):`, error);
      });

      ws.on('close', () => {
        console.log(`Disconnected from Nostr relay: ${url}`);
        this.relays.delete(url);
        setTimeout(() => this.connectToRelay(url), 5000);
      });
    } catch (error) {
      console.error(`Failed to connect to Nostr relay (${url}):`, error);
    }
  }

  private subscribe(relayUrl: string): void {
    const subscriptionId = randomUUID();
    const filter = {
      kinds: [1, 4],
      since: Math.floor(Date.now() / 1000) - 3600,
    };

    const ws = this.relays.get(relayUrl);
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(['REQ', subscriptionId, filter]));
      this.subscriptions.set(subscriptionId, new Set([relayUrl]));
    }
  }

  private handleMessage(msg: any[]): void {
    if (msg[0] === 'EVENT' && msg[2]) {
      const event = msg[2] as NostrEvent;
      this.processEvent(event);
    }
  }

  private async processEvent(event: NostrEvent): Promise<void> {
    if (event.kind !== 1 && event.kind !== 4) return;

    const content = event.content;
    const senderPubkey = event.pubkey;

    try {
      await this.router.handleFromWebSocket(senderPubkey, content, `nostr:${senderPubkey}`);
    } catch (error) {
      console.error('Failed to process Nostr message:', error);
    }
  }

  async publish(content: string, kind: number = 1, tags: string[][] = []): Promise<void> {
    const event: NostrEvent = {
      id: '',
      pubkey: this.getPublicKey(),
      created_at: Math.floor(Date.now() / 1000),
      kind,
      tags,
      content,
      sig: '',
    };

    event.id = this.getEventHash(event);
    event.sig = this.signEvent(event);

    for (const ws of this.relays.values()) {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify(['EVENT', event]));
      }
    }
  }

  private getPublicKey(): string {
    return '';
  }

  private getEventHash(event: NostrEvent): string {
    return '';
  }

  private signEvent(event: NostrEvent): string {
    return '';
  }

  isActive(): boolean {
    return this.isRunning;
  }
}
