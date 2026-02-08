import { webhookManager } from './webhooks.js';

export interface GmailPubSubConfig {
  projectId: string;
  subscriptionId: string;
  topicId: string;
  credentials: {
    clientEmail: string;
    privateKey: string;
  };
  watchOptions: {
    labelFilter?: string;
    topicName?: string;
  };
}

export interface GmailMessage {
  id: string;
  threadId: string;
  labelIds: string[];
  snippet: string;
  body: {
    data?: string;
  };
  from?: {
    email: string;
    name?: string;
  };
  subject?: string;
  date?: string;
}

export class GmailPubSub {
  private config: GmailPubSubConfig;
  private isRunning: boolean = false;
  private watchTimeout?: NodeJS.Timeout;
  private emailBuffer: GmailMessage[] = [];

  constructor(config: GmailPubSubConfig) {
    this.config = config;
  }

  async start(): Promise<void> {
    if (this.isRunning) {
      console.log('Gmail PubSub is already running');
      return;
    }

    this.isRunning = true;
    console.log('Gmail PubSub started');

    this.startWatch();
    this.processEmailBuffer();
  }

  async stop(): Promise<void> {
    if (!this.isRunning) return;

    if (this.watchTimeout) {
      clearTimeout(this.watchTimeout);
    }
    this.isRunning = false;
    console.log('Gmail PubSub stopped');
  }

  isActive(): boolean {
    return this.isRunning;
  }

  private async startWatch(): Promise<void> {
    try {
      await this.setupWatch();
      this.scheduleWatchRefresh();
      console.log('Gmail watch established');
    } catch (error) {
      console.error('Failed to setup Gmail watch:', error);
      setTimeout(() => this.startWatch(), 60000);
    }
  }

  private async setupWatch(): Promise<void> {
    const token = await this.getAccessToken();

    const response = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/watch`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        topicName: `projects/${this.config.projectId}/topics/${this.config.topicId}`,
        labelIds: this.config.watchOptions.labelFilter
          ? [this.config.watchOptions.labelFilter]
          : ['INBOX'],
      }),
    });

    if (!response.ok) {
      throw new Error(`Gmail watch setup failed: ${response.statusText}`);
    }
  }

  private scheduleWatchRefresh(): void {
    const refreshInterval = 7 * 24 * 60 * 60 * 1000;
    this.watchTimeout = setTimeout(async () => {
      await this.setupWatch();
      this.scheduleWatchRefresh();
    }, refreshInterval);
  }

  private async processEmailBuffer(): Promise<void> {
    while (this.isRunning) {
      if (this.emailBuffer.length > 0) {
        const email = this.emailBuffer.shift();
        if (email) {
          await this.handleEmail(email);
        }
      }
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  }

  async handlePushNotification(message: Record<string, unknown>): Promise<void> {
    try {
      const msg = message.message as Record<string, unknown> | undefined;
      const emailData = msg?.data as string | undefined;
      if (!emailData) return;

      const decoded = Buffer.from(emailData, 'base64').toString();
      const notification = JSON.parse(decoded) as Record<string, unknown>;

      if (notification.emailMessage) {
        const emailMeta = notification.emailMessage as Record<string, unknown>;
        const metadata = emailMeta.metadata as Record<string, unknown> | undefined;
        const messageId = metadata?.messageId as string | undefined;
        if (messageId) {
          const email = await this.fetchEmailDetails(messageId);
          if (email) {
            this.emailBuffer.push(email);
          }
        }
      }
    } catch (error) {
      console.error('Error processing Gmail push notification:', error);
    }
  }

  private async fetchEmailDetails(messageId: string): Promise<GmailMessage | null> {
    try {
      const token = await this.getAccessToken();

      const response = await fetch(
        `https://gmail.googleapis.com/gmail/v1/users/me/messages/${messageId}?format=metadata`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) return null;

      const data = (await response.json()) as Record<string, unknown>;
      return this.parseGmailMessage(data);
    } catch (error) {
      console.error('Error fetching email details:', error);
      return null;
    }
  }

  private async handleEmail(email: GmailMessage): Promise<void> {
    console.log(`Processing email: ${email.subject} from ${email.from?.email}`);

    await webhookManager.triggerEvent('message:received', {
      type: 'email',
      emailId: email.id,
      from: email.from,
      subject: email.subject,
      snippet: email.snippet,
      labels: email.labelIds,
      date: email.date,
    });
  }

  private parseGmailMessage(data: Record<string, unknown>): GmailMessage {
    const payload = (data.payload as Record<string, unknown>) || {};
    const body = (payload.body as Record<string, unknown>) || {};
    const headers = this.extractHeaders((payload.headers || []) as Record<string, string>[]);

    return {
      id: data.id as string,
      threadId: data.threadId as string,
      labelIds: (data.labelIds as string[]) || [],
      snippet: (data.snippet as string) || '',
      body: {
        data: (body.data as string) || '',
      },
      from: {
        email: headers['from']?.split('<')[1]?.replace('>', '') || '',
        name: headers['from']?.split('<')[0]?.trim() || '',
      },
      subject: headers['subject'] || '',
      date: headers['date'] || '',
    };
  }

  private extractHeaders(headers: Record<string, string>[] | undefined): Record<string, string> {
    if (!headers) return {};
    const result: Record<string, string> = {};
    for (const header of headers) {
      result[header.name.toLowerCase()] = header.value;
    }
    return result;
  }

  private async getAccessToken(): Promise<string> {
    const jwt = await this.createJWT();
    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        assertion: jwt,
        grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      }),
    });

    if (!response.ok) {
      throw new Error(`Token request failed: ${response.statusText}`);
    }

    const data = (await response.json()) as { access_token?: string };
    return data.access_token || '';
  }

  private async createJWT(): Promise<string> {
    const header = {
      alg: 'RS256',
      typ: 'JWT',
    };

    const payload = {
      iss: this.config.credentials.clientEmail,
      scope:
        'https://www.googleapis.com/auth/gmail.readonly https://www.googleapis.com/auth/gmail.modify',
      aud: 'https://oauth2.googleapis.com/token',
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 3600,
    };

    const encodedHeader = this.base64UrlEncode(JSON.stringify(header));
    const encodedPayload = this.base64UrlEncode(JSON.stringify(payload));

    const crypto = await import('crypto');
    const sign = crypto.createSign('RSA-SHA256');
    sign.update(`${encodedHeader}.${encodedPayload}`);
    const signature = sign.sign(this.config.credentials.privateKey, 'base64');
    const encodedSignature = this.base64UrlEncode(signature);

    return `${encodedHeader}.${encodedPayload}.${encodedSignature}`;
  }

  private base64UrlEncode(str: string): string {
    return Buffer.from(str)
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');
  }

  async sendEmail(
    to: string,
    subject: string,
    body: string,
    options?: {
      cc?: string;
      bcc?: string;
      replyTo?: string;
      inReplyTo?: string;
      references?: string;
    }
  ): Promise<string | null> {
    try {
      const token = await this.getAccessToken();

      const email = [
        `To: ${to}`,
        `Subject: ${subject}`,
        `Content-Type: text/plain; charset=UTF-8`,
        options?.cc ? `Cc: ${options.cc}` : '',
        options?.bcc ? `Bcc: ${options.bcc}` : '',
        options?.replyTo ? `Reply-To: ${options.replyTo}` : '',
        options?.inReplyTo ? `In-Reply-To: ${options.inReplyTo}` : '',
        options?.references ? `References: ${options.references}` : '',
        '',
        body,
      ]
        .filter(Boolean)
        .join('\r\n');

      const response = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          raw: Buffer.from(email).toString('base64url'),
        }),
      });

      if (!response.ok) {
        throw new Error(`Email send failed: ${response.statusText}`);
      }

      const data = (await response.json()) as { id?: string };
      return data.id || null;
    } catch (error) {
      console.error('Failed to send email:', error);
      return null;
    }
  }

  async searchEmails(query: string, maxResults: number = 10): Promise<GmailMessage[]> {
    try {
      const token = await this.getAccessToken();

      const response = await fetch(
        `https://gmail.googleapis.com/gmail/v1/users/me/messages?q=${encodeURIComponent(query)}&maxResults=${maxResults}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error(`Email search failed: ${response.statusText}`);
      }

      const data = (await response.json()) as {
        messages?: Array<{ id: string; threadId: string }>;
      };
      const messages = data.messages || [];

      const emails: GmailMessage[] = [];
      for (const msg of messages) {
        const email = await this.fetchEmailDetails(msg.id);
        if (email) {
          emails.push(email);
        }
      }

      return emails;
    } catch (error) {
      console.error('Failed to search emails:', error);
      return [];
    }
  }
}

export const createGmailPubSub = (config: GmailPubSubConfig) => new GmailPubSub(config);
