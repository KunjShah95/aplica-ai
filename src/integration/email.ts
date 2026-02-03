import nodemailer, { Transporter, SendMailOptions } from 'nodemailer';
import { ImapFlow, MailboxObject } from 'imapflow';

export interface EmailConfig {
  smtp: {
    host: string;
    port: number;
    secure: boolean;
    user: string;
    pass: string;
    from?: string;
  };
  imap?: {
    host: string;
    port: number;
    secure: boolean;
    user: string;
    pass: string;
  };
}

export interface EmailMessage {
  to: string | string[];
  cc?: string | string[];
  bcc?: string | string[];
  subject: string;
  text?: string;
  html?: string;
  attachments?: Array<{
    filename: string;
    content: Buffer | string;
    contentType?: string;
  }>;
  replyTo?: string;
}

export interface EmailSearchOptions {
  folder?: string;
  since?: Date;
  until?: Date;
  subject?: string;
  from?: string;
  to?: string;
  seen?: boolean;
  limit?: number;
}

export interface EmailInfo {
  uid: number;
  subject: string;
  from: string;
  to: string[];
  date: Date;
  seen: boolean;
  text?: string;
  html?: string;
  attachments: Array<{
    filename: string;
    size: number;
    contentType: string;
  }>;
}

export class EmailService {
  private transporter: Transporter | null = null;
  private imapClient: ImapFlow | null = null;
  private config: EmailConfig;

  constructor(config: EmailConfig) {
    this.config = config;
    this.initTransporter();
  }

  private initTransporter(): void {
    this.transporter = nodemailer.createTransport({
      host: this.config.smtp.host,
      port: this.config.smtp.port,
      secure: this.config.smtp.secure,
      auth: {
        user: this.config.smtp.user,
        pass: this.config.smtp.pass,
      },
    });
  }

  async send(message: EmailMessage): Promise<{ messageId: string }> {
    if (!this.transporter) throw new Error('SMTP not configured');

    const to = Array.isArray(message.to) ? message.to.join(', ') : message.to;
    const cc = message.cc
      ? Array.isArray(message.cc)
        ? message.cc.join(', ')
        : message.cc
      : undefined;
    const bcc = message.bcc
      ? Array.isArray(message.bcc)
        ? message.bcc.join(', ')
        : message.bcc
      : undefined;

    const options: SendMailOptions = {
      from: this.config.smtp.from || this.config.smtp.user,
      to,
      cc,
      bcc,
      subject: message.subject,
      text: message.text,
      html: message.html,
      attachments: message.attachments?.map((att) => ({
        filename: att.filename,
        content: att.content,
        contentType: att.contentType,
      })),
      replyTo: message.replyTo,
    };

    const result = await this.transporter.sendMail(options);
    return { messageId: result.messageId || '' };
  }

  async sendTemplate(
    to: string | string[],
    subject: string,
    template: string,
    data: Record<string, any>
  ): Promise<{ messageId: string }> {
    const html = this.renderTemplate(template, data);
    const text = this.stripHtml(html);

    return this.send({
      to,
      subject,
      html,
      text,
    });
  }

  private renderTemplate(template: string, data: Record<string, any>): string {
    let result = template;
    for (const [key, value] of Object.entries(data)) {
      result = result.replace(new RegExp(`{{${key}}}`, 'g'), String(value));
    }
    return result;
  }

  private stripHtml(html: string): string {
    return html
      .replace(/<[^>]*>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  private async initImap(): Promise<void> {
    if (!this.config.imap || this.imapClient) return;

    this.imapClient = new ImapFlow({
      host: this.config.imap.host,
      port: this.config.imap.port,
      secure: this.config.imap.secure,
      auth: {
        user: this.config.imap.user,
        pass: this.config.imap.pass,
      },
    });

    await this.imapClient.connect();
  }

  async searchEmails(options: EmailSearchOptions): Promise<EmailInfo[]> {
    await this.initImap();
    if (!this.imapClient) throw new Error('IMAP not configured');

    const folder = options.folder || 'INBOX';
    const lock = await this.imapClient.getMailboxLock(folder);

    try {
      const search: Record<string, any> = {};

      if (options.since) search.since = options.since;
      if (options.until) search.until = options.until;
      if (options.subject) search.subject = options.subject;
      if (options.from) search.from = options.from;
      if (options.to) search.to = options.to;
      if (options.seen !== undefined) search.seen = options.seen;

      const messages = await this.imapClient.search(search, { limit: options.limit || 50 });

      const results: EmailInfo[] = [];

      for (const uid of messages) {
        const msg = await this.imapClient.fetchOne(uid, {
          envelope: true,
          flags: true,
          bodyStructure: true,
        });

        results.push({
          uid: uid as number,
          subject: msg.envelope?.subject || '',
          from: msg.envelope?.from?.[0]?.address || '',
          to: msg.envelope?.to?.map((t) => t.address || '') || [],
          date: msg.envelope?.date || new Date(),
          seen: msg.flags?.includes('\\Seen') || false,
          attachments: [],
        });
      }

      return results;
    } finally {
      lock.release();
    }
  }

  async getEmail(uid: number, folder: string = 'INBOX'): Promise<EmailInfo | null> {
    await this.initImap();
    if (!this.imapClient) throw new Error('IMAP not configured');

    const lock = await this.imapClient.getMailboxLock(folder);

    try {
      const msg = await this.imapClient.fetchOne(uid, {
        envelope: true,
        flags: true,
        bodyStructure: true,
        source: true,
      });

      if (!msg) return null;

      const textParts: string[] = [];
      const htmlParts: string[] = [];
      const attachments: EmailInfo['attachments'] = [];

      if (msg.bodyStructure) {
        this.parseBodyParts(msg.bodyStructure, textParts, htmlParts, attachments);
      }

      return {
        uid: uid as number,
        subject: msg.envelope?.subject || '',
        from: msg.envelope?.from?.[0]?.address || '',
        to: msg.envelope?.to?.map((t) => t.address || '') || [],
        date: msg.envelope?.date || new Date(),
        seen: msg.flags?.includes('\\Seen') || false,
        text: textParts.join('\n'),
        html: htmlParts.join('\n'),
        attachments,
      };
    } finally {
      lock.release();
    }
  }

  private parseBodyParts(
    part: any,
    textParts: string[],
    htmlParts: string[],
    attachments: EmailInfo['attachments']
  ): void {
    if (part.type === 'text') {
      if (part.subtype === 'plain') {
        textParts.push(part.partId || '');
      } else if (part.subtype === 'html') {
        htmlParts.push(part.partId || '');
      }
    }

    if (part.disposition === 'attachment') {
      attachments.push({
        filename: part.filename || 'unknown',
        size: part.size || 0,
        contentType: part.type || 'application/octet-stream',
      });
    }

    if (part.childNodes) {
      for (const child of part.childNodes) {
        this.parseBodyParts(child, textParts, htmlParts, attachments);
      }
    }
  }

  async markAsSeen(uid: number, folder: string = 'INBOX'): Promise<void> {
    await this.initImap();
    if (!this.imapClient) throw new Error('IMAP not configured');

    await this.imapClient.messageAddFlags(folder, uid, ['\\Seen']);
  }

  async deleteEmail(uid: number, folder: string = 'INBOX'): Promise<void> {
    await this.initImap();
    if (!this.imapClient) throw new Error('IMAP not configured');

    await this.imapClient.messageDelete(folder, uid);
  }

  async createFolder(name: string, parent?: string): Promise<void> {
    await this.initImap();
    if (!this.imapClient) throw new Error('IMAP not configured');

    const fullName = parent ? `${parent}/${name}` : name;
    await this.imapClient.folderCreate(fullName);
  }

  async listFolders(): Promise<string[]> {
    await this.initImap();
    if (!this.imapClient) throw new Error('IMAP not configured');

    const folders = await this.imapClient.list();
    return folders.map((f) => f.path);
  }

  async verifyConnection(): Promise<boolean> {
    try {
      if (this.transporter) {
        await this.transporter.verify();
      }
      if (this.imapClient) {
        await this.imapClient.noop();
      }
      return true;
    } catch {
      return false;
    }
  }

  async disconnect(): Promise<void> {
    if (this.imapClient) {
      await this.imapClient.logout();
      this.imapClient = null;
    }
  }
}

export function createEmailService(config: EmailConfig): EmailService {
  return new EmailService(config);
}
