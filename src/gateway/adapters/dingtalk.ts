import { MessageRouter } from '../router.js';

export interface DingTalkAdapterOptions {
  appKey: string;
  appSecret: string;
  agentId: string;
  router: MessageRouter;
}

export class DingTalkAdapter {
  private router: MessageRouter;
  private appKey: string;
  private appSecret: string;
  private agentId: string;
  private accessToken?: string;
  private isRunning: boolean = false;

  constructor(options: DingTalkAdapterOptions) {
    this.router = options.router;
    this.appKey = options.appKey;
    this.appSecret = options.appSecret;
    this.agentId = options.agentId;
  }

  async start(): Promise<void> {
    console.log('DingTalk adapter starting...');
    await this.refreshAccessToken();
    this.isRunning = true;
  }

  async stop(): Promise<void> {
    this.isRunning = false;
  }

  private async refreshAccessToken(): Promise<void> {
    try {
      const url = 'https://api.dingtalk.com/v1.0/oauth2/accessToken';
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          appKey: this.appKey,
          appSecret: this.appSecret,
        }),
      });
      const data = await response.json();

      if (data.accessToken) {
        this.accessToken = data.accessToken;
        console.log('DingTalk access token refreshed');
      }
    } catch (error) {
      console.error('Error refreshing DingTalk token:', error);
    }
  }

  handleWebhook(body: any): { status: number; body: any } {
    const eventType = body.eventType;
    const userId = body.senderId;
    const messageId = body.messageId;

    if (body.msgtype === 'text') {
      const content = body.text?.content;
      if (content) {
        this.processMessage(userId, content, messageId);
      }
    } else if (body.msgtype === 'image') {
      this.processMessage(userId, '[Image]', messageId);
    } else if (body.msgtype === 'voice') {
      this.processMessage(userId, '[Voice]', messageId);
    }

    if (eventType === 'user_add_org' || eventType === 'user_modify_org') {
      console.log(`DingTalk user event: ${eventType}`);
    }

    return { status: 200, body: { msg: 'success' } };
  }

  private async processMessage(userId: string, content: string, messageId: string): Promise<void> {
    try {
      await this.router.handleFromWebSocket(userId, content, `dingtalk:${messageId}`);
    } catch (error) {
      console.error('Failed to process DingTalk message:', error);
    }
  }

  async sendMessage(toUser: string, content: string): Promise<void> {
    if (!this.accessToken) return;

    const url = `https://api.dingtalk.com/v1.0/robot/oToMessages/batchSend?accessToken=${this.accessToken}`;

    await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        robotCode: this.appKey,
        userIds: [toUser],
        msgKey: 'sampleText',
        msgParam: JSON.stringify({ content }),
      }),
    });
  }

  isActive(): boolean {
    return this.isRunning;
  }
}
