export interface SlackMessage {
  channel: string;
  text?: string;
  blocks?: SlackBlock[];
  attachments?: SlackAttachment[];
  threadTs?: string;
  mrkdwn?: boolean;
}

export interface SlackBlock {
  type: 'section' | 'divider' | 'header' | 'context' | 'actions' | 'image';
  text?: {
    type: 'plain_text' | 'mrkdwn';
    text: string;
    emoji?: boolean;
  };
  accessory?: unknown;
  elements?: unknown[];
  block_id?: string;
}

export interface SlackAttachment {
  color?: string;
  fallback?: string;
  pretext?: string;
  author_name?: string;
  author_link?: string;
  title?: string;
  title_link?: string;
  text?: string;
  fields?: { title: string; value: string; short?: boolean }[];
  footer?: string;
  ts?: number;
}

export interface SlackResult {
  success: boolean;
  ts?: string;
  channel?: string;
  error?: string;
}

export class SlackClient {
  private token: string;
  private baseUrl = 'https://slack.com/api';

  constructor(token: string) {
    this.token = token;
  }

  private async request<T>(method: string, body?: Record<string, unknown>): Promise<T> {
    const response = await fetch(`${this.baseUrl}/${method}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.token}`,
        'Content-Type': 'application/json',
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    const data = (await response.json()) as { ok: boolean; error?: string } & T;

    if (!data.ok) {
      throw new Error(`Slack API error: ${data.error}`);
    }

    return data;
  }

  async sendMessage(message: SlackMessage): Promise<SlackResult> {
    try {
      const result = await this.request<{ ts: string; channel: string }>('chat.postMessage', {
        channel: message.channel,
        text: message.text,
        blocks: message.blocks,
        attachments: message.attachments,
        thread_ts: message.threadTs,
        mrkdwn: message.mrkdwn ?? true,
      });

      return {
        success: true,
        ts: result.ts,
        channel: result.channel,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  async updateMessage(
    channel: string,
    ts: string,
    message: Omit<SlackMessage, 'channel'>
  ): Promise<SlackResult> {
    try {
      const result = await this.request<{ ts: string; channel: string }>('chat.update', {
        channel,
        ts,
        text: message.text,
        blocks: message.blocks,
        attachments: message.attachments,
      });

      return { success: true, ts: result.ts, channel: result.channel };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  async deleteMessage(channel: string, ts: string): Promise<SlackResult> {
    try {
      await this.request('chat.delete', { channel, ts });
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  async addReaction(channel: string, timestamp: string, emoji: string): Promise<SlackResult> {
    try {
      await this.request('reactions.add', {
        channel,
        timestamp,
        name: emoji,
      });
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  async getUserInfo(userId: string) {
    return this.request<{ user: any }>('users.info', { user: userId });
  }

  async getChannelInfo(channelId: string) {
    return this.request<{ channel: any }>('conversations.info', {
      channel: channelId,
    });
  }

  async listChannels(limit: number = 100) {
    return this.request<{ channels: any[] }>('conversations.list', {
      limit,
      types: 'public_channel,private_channel',
    });
  }

  async uploadFile(options: {
    channels: string;
    content?: string;
    file?: Buffer;
    filename?: string;
    title?: string;
    initialComment?: string;
  }) {
    const formData = new FormData();
    formData.append('channels', options.channels);

    if (options.content) {
      formData.append('content', options.content);
    }
    if (options.file) {
      formData.append('file', new Blob([new Uint8Array(options.file)]), options.filename || 'file');
    }
    if (options.title) {
      formData.append('title', options.title);
    }
    if (options.initialComment) {
      formData.append('initial_comment', options.initialComment);
    }

    const response = await fetch(`${this.baseUrl}/files.upload`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.token}`,
      },
      body: formData,
    });

    return response.json();
  }

  createRichMessage(options: {
    title: string;
    description?: string;
    fields?: { name: string; value: string; inline?: boolean }[];
    color?: string;
    footer?: string;
  }): SlackMessage {
    const blocks: SlackBlock[] = [
      {
        type: 'header',
        text: {
          type: 'plain_text',
          text: options.title,
          emoji: true,
        },
      },
    ];

    if (options.description) {
      blocks.push({
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: options.description,
        },
      });
    }

    if (options.fields && options.fields.length > 0) {
      blocks.push({ type: 'divider' });

      for (let i = 0; i < options.fields.length; i += 2) {
        const field1 = options.fields[i];
        const field2 = options.fields[i + 1];

        blocks.push({
          type: 'section',
          elements: [
            { type: 'mrkdwn', text: `*${field1.name}*\n${field1.value}` },
            ...(field2 ? [{ type: 'mrkdwn', text: `*${field2.name}*\n${field2.value}` }] : []),
          ],
        } as any);
      }
    }

    if (options.footer) {
      blocks.push({
        type: 'context',
        elements: [{ type: 'mrkdwn', text: options.footer }],
      });
    }

    return {
      channel: '',
      blocks,
      attachments: options.color
        ? [
            {
              color: options.color,
              fallback: options.title,
            },
          ]
        : undefined,
    };
  }
}

export function createSlackClient(): SlackClient | null {
  const token = process.env.SLACK_BOT_TOKEN;
  if (!token) return null;
  return new SlackClient(token);
}

export const slackClient = createSlackClient();
