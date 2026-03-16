import { MessageRouter } from '../router.js';
import crypto from 'crypto';

export interface FeishuAdapterOptions {
  appId: string;
  appSecret: string;
  verificationToken?: string;
  encryptKey?: string;
  router: MessageRouter;
}

export class FeishuAdapter {
  private router: MessageRouter;
  private appId: string;
  private appSecret: string;
  private verificationToken?: string;
  private encryptKey?: string;
  private isRunning: boolean = false;

  constructor(options: FeishuAdapterOptions) {
    this.router = options.router;
    this.appId = options.appId;
    this.appSecret = options.appSecret;
    this.verificationToken = options.verificationToken;
    this.encryptKey = options.encryptKey;
  }

  async start(): Promise<void> {
    console.log('Feishu (Lark) adapter started');
    this.isRunning = true;
  }

  async stop(): Promise<void> {
    this.isRunning = false;
  }

  verifyURL(timestamp: string, nonce: string, signature: string): boolean {
    if (!this.verificationToken) return false;

    const str = [timestamp, nonce, this.appSecret].sort().join('');
    const hash = crypto.createHash('sha1').update(str).digest('hex');

    return hash === signature;
  }

  handleWebhook(body: any): { status: number; body: any } {
    const eventType = body.header?.event_type;

    if (body.header?.event_type === 'url_verification') {
      return {
        status: 200,
        body: {
          challenge: body.challenge,
          token: this.verificationToken,
        },
      };
    }

    const message = body.event?.message;
    if (message) {
      const msgType = message.msg_type;
      const userId = message.sender?.sender_id?.user_id;
      const chatId = message.chat_id;
      let content = '';

      switch (msgType) {
        case 'text':
          content = message.text?.content || '';
          break;
        case 'image':
          content = '[Image]';
          break;
        case 'voice':
          content = '[Voice]';
          break;
        case 'file':
          content = '[File]';
          break;
        default:
          content = `[${msgType} message]`;
      }

      this.processMessage(userId, content, chatId, message.message_id);
    }

    return { status: 200, body: { msg: 'success' } };
  }

  private async processMessage(
    userId: string,
    content: string,
    chatId: string,
    messageId: string
  ): Promise<void> {
    try {
      await this.router.handleFromWebSocket(userId, content, `feishu:${chatId}`);
    } catch (error) {
      console.error('Failed to process Feishu message:', error);
    }
  }

  async sendMessage(
    receiveIdType: 'user_id' | 'chat_id',
    receiveId: string,
    content: string
  ): Promise<void> {
    const url = 'https://open.feishu.cn/open-apis/im/v1/messages';
    const params = `?receive_id_type=${receiveIdType}`;

    await fetch(url + params, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${await this.getTenantToken()}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        receive_id: receiveId,
        msg_type: 'text',
        content: JSON.stringify({ text: content }),
      }),
    });
  }

  private async getTenantToken(): Promise<string> {
    const url = 'https://open.feishu.cn/open-apis/auth/v3/tenant_access_token/internal';

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        app_id: this.appId,
        app_secret: this.appSecret,
      }),
    });

    const data = await response.json();
    return data.tenant_access_token || '';
  }

  isActive(): boolean {
    return this.isRunning;
  }
}
