import { MessageRouter } from '../router.js';
import { randomUUID } from 'crypto';

export interface SMSAdapterOptions {
  accountSid: string;
  authToken: string;
  phoneNumber: string;
  router: MessageRouter;
}

export class SMSAdapter {
  private router: MessageRouter;
  private accountSid: string;
  private authToken: string;
  private phoneNumber: string;
  private isRunning: boolean = false;

  constructor(options: SMSAdapterOptions) {
    this.router = options.router;
    this.accountSid = options.accountSid;
    this.authToken = options.authToken;
    this.phoneNumber = options.phoneNumber;
  }

  async start(): Promise<void> {
    console.log('SMS (Twilio) adapter started');
    this.isRunning = true;
  }

  async stop(): Promise<void> {
    this.isRunning = false;
  }

  handleWebhook(body: any): { status: number; body: any } {
    const from = body.From;
    const bodyText = body.Body;
    const messageSid = body.MessageSid;

    if (!from || !bodyText) {
      return { status: 400, body: { error: 'Missing From or Body' } };
    }

    this.processMessage(from, bodyText, messageSid);

    return { status: 200, body: { status: 'received' } };
  }

  private async processMessage(from: string, content: string, messageSid: string): Promise<void> {
    try {
      await this.router.handleFromWebSocket(from, content, `sms:${messageSid}`);
    } catch (error) {
      console.error('Failed to process SMS:', error);
    }
  }

  async sendMessage(to: string, content: string): Promise<void> {
    const url = `https://api.twilio.com/2010-04-01/Accounts/${this.accountSid}/Messages.json`;

    const auth = Buffer.from(`${this.accountSid}:${this.authToken}`).toString('base64');

    await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        To: to,
        From: this.phoneNumber,
        Body: content,
      }),
    });
  }

  isActive(): boolean {
    return this.isRunning;
  }
}
