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
    fields?: {
        title: string;
        value: string;
        short?: boolean;
    }[];
    footer?: string;
    ts?: number;
}
export interface SlackResult {
    success: boolean;
    ts?: string;
    channel?: string;
    error?: string;
}
export declare class SlackClient {
    private token;
    private baseUrl;
    constructor(token: string);
    private request;
    sendMessage(message: SlackMessage): Promise<SlackResult>;
    updateMessage(channel: string, ts: string, message: Omit<SlackMessage, 'channel'>): Promise<SlackResult>;
    deleteMessage(channel: string, ts: string): Promise<SlackResult>;
    addReaction(channel: string, timestamp: string, emoji: string): Promise<SlackResult>;
    getUserInfo(userId: string): Promise<{
        user: any;
    }>;
    getChannelInfo(channelId: string): Promise<{
        channel: any;
    }>;
    listChannels(limit?: number): Promise<{
        channels: any[];
    }>;
    uploadFile(options: {
        channels: string;
        content?: string;
        file?: Buffer;
        filename?: string;
        title?: string;
        initialComment?: string;
    }): Promise<any>;
    createRichMessage(options: {
        title: string;
        description?: string;
        fields?: {
            name: string;
            value: string;
            inline?: boolean;
        }[];
        color?: string;
        footer?: string;
    }): SlackMessage;
}
export declare function createSlackClient(): SlackClient | null;
export declare const slackClient: SlackClient | null;
//# sourceMappingURL=slack.d.ts.map