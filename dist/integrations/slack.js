export class SlackClient {
    token;
    baseUrl = 'https://slack.com/api';
    constructor(token) {
        this.token = token;
    }
    async request(method, body) {
        const response = await fetch(`${this.baseUrl}/${method}`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${this.token}`,
                'Content-Type': 'application/json',
            },
            body: body ? JSON.stringify(body) : undefined,
        });
        const data = await response.json();
        if (!data.ok) {
            throw new Error(`Slack API error: ${data.error}`);
        }
        return data;
    }
    async sendMessage(message) {
        try {
            const result = await this.request('chat.postMessage', {
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
        }
        catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : String(error),
            };
        }
    }
    async updateMessage(channel, ts, message) {
        try {
            const result = await this.request('chat.update', {
                channel,
                ts,
                text: message.text,
                blocks: message.blocks,
                attachments: message.attachments,
            });
            return { success: true, ts: result.ts, channel: result.channel };
        }
        catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : String(error),
            };
        }
    }
    async deleteMessage(channel, ts) {
        try {
            await this.request('chat.delete', { channel, ts });
            return { success: true };
        }
        catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : String(error),
            };
        }
    }
    async addReaction(channel, timestamp, emoji) {
        try {
            await this.request('reactions.add', {
                channel,
                timestamp,
                name: emoji,
            });
            return { success: true };
        }
        catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : String(error),
            };
        }
    }
    async getUserInfo(userId) {
        return this.request('users.info', { user: userId });
    }
    async getChannelInfo(channelId) {
        return this.request('conversations.info', {
            channel: channelId
        });
    }
    async listChannels(limit = 100) {
        return this.request('conversations.list', {
            limit,
            types: 'public_channel,private_channel',
        });
    }
    async uploadFile(options) {
        const formData = new FormData();
        formData.append('channels', options.channels);
        if (options.content) {
            formData.append('content', options.content);
        }
        if (options.file) {
            formData.append('file', new Blob([options.file]), options.filename || 'file');
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
                'Authorization': `Bearer ${this.token}`,
            },
            body: formData,
        });
        return response.json();
    }
    createRichMessage(options) {
        const blocks = [
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
                });
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
            attachments: options.color ? [{
                    color: options.color,
                    fallback: options.title,
                }] : undefined,
        };
    }
}
export function createSlackClient() {
    const token = process.env.SLACK_BOT_TOKEN;
    if (!token)
        return null;
    return new SlackClient(token);
}
export const slackClient = createSlackClient();
//# sourceMappingURL=slack.js.map