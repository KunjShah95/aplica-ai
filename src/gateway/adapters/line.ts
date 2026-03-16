import { MessageRouter } from '../router.js';
import { randomUUID } from 'crypto';

export interface LineAdapterOptions {
  channelId: string;
  channelSecret: string;
  channelAccessToken: string;
  router: MessageRouter;
}

interface LineEvent {
  type: string;
  replyToken?: string;
  source: {
    userId: string;
    groupId?: string;
    roomId?: string;
  };
  message: {
    type: string;
    id: string;
    text?: string;
  };
}

export class LineAdapter {
  private router: MessageRouter;
  private channelId: string;
  private channelSecret: string;
  private channelAccessToken: string;
  private isRunning: boolean = false;

  constructor(options: LineAdapterOptions) {
    this.router = options.router;
    this.channelId = options.channelId;
    this.channelSecret = options.channelSecret;
    this.channelAccessToken = options.channelAccessToken;
  }

  async start(): Promise<void> {
    console.log('LINE adapter started');
    this.isRunning = true;
  }

  async stop(): Promise<void> {
    this.isRunning = false;
  }

  handleWebhook(body: any, signature: string): { status: number; body: any } {
    const channelSecret = this.channelSecret;
    const hash = crypto
      .createHmac('SHA256', channelSecret)
      .update(JSON.stringify(body))
      .digest('base64');

    if (hash !== signature) {
      return { status: 401, body: { error: 'Invalid signature' } };
    }

    for (const event of body.events || []) {
      this.processEvent(event);
    }

    return { status: 200, body: { status: 'ok' } };
  }

  private async processEvent(event: LineEvent): Promise<void> {
    if (event.type !== 'message') return;
    if (event.message.type !== 'text') return;

    const userId = event.source.userId;
    const content = event.message.text || '';
    const channelId = event.source.groupId || event.source.roomId || userId;

    try {
      await this.router.handleFromWebSocket(userId, content, channelId);
    } catch (error) {
      console.error('Failed to process LINE message:', error);
    }
  }

  async sendMessage(to: string, content: string): Promise<void> {
    await fetch('https://api.line.me/v2/bot/message/push', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.channelAccessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        to,
        messages: [{ type: 'text', text: content }],
      }),
    });
  }

  async reply(replyToken: string, content: string): Promise<void> {
    await fetch('https://api.line.me/v2/bot/message/reply', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.channelAccessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        replyToken,
        messages: [{ type: 'text', text: content }],
      }),
    });
  }

  isActive(): boolean {
    return this.isRunning;
  }
}

import crypto from 'crypto';
