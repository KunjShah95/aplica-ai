import { MessageRouter } from '../router.js';

export interface QQAdapterOptions {
  appId: string;
  token: string;
  secret: string;
  router: MessageRouter;
}

export class QQAdapter {
  private router: MessageRouter;
  private appId: string;
  private token: string;
  private secret: string;
  private isRunning: boolean = false;

  constructor(options: QQAdapterOptions) {
    this.router = options.router;
    this.appId = options.appId;
    this.token = options.token;
    this.secret = options.secret;
  }

  async start(): Promise<void> {
    console.log('QQ adapter started');
    this.isRunning = true;
  }

  async stop(): Promise<void> {
    this.isRunning = false;
  }

  handleWebhook(body: any): { status: number; body: any } {
    const channelId = body.channel_id;
    const guildId = body.guild_id;
    const userId = body.author?.id;
    const messageId = body.id;
    const content = body.content;

    if (!userId || !content) {
      return { status: 400, body: { error: 'Invalid message' } };
    }

    this.processMessage(userId, content, guildId || channelId, messageId);

    return { status: 200, body: { msg: 'success' } };
  }

  handleDirectMessage(body: any): { status: number; body: any } {
    const userId = body.user_id;
    const messageId = body.message_id;
    const content = body.content || body.message?.content;

    if (!userId) {
      return { status: 400, body: { error: 'Invalid DM' } };
    }

    this.processMessage(userId, content || '[Message]', 'dm', messageId);

    return { status: 200, body: { msg: 'success' } };
  }

  private async processMessage(
    userId: string,
    content: string,
    chatId: string,
    messageId: string
  ): Promise<void> {
    try {
      await this.router.handleFromWebSocket(userId, content, `qq:${chatId}`);
    } catch (error) {
      console.error('Failed to process QQ message:', error);
    }
  }

  async sendMessage(targetId: string, content: string): Promise<void> {
    console.log(`Sending to QQ ${targetId}: ${content}`);
  }

  async sendDirectMessage(userId: string, content: string): Promise<void> {
    console.log(`Sending DM to QQ ${userId}: ${content}`);
  }

  isActive(): boolean {
    return this.isRunning;
  }
}
