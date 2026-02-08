export interface SlackConfig {
    token: string;
    signingSecret?: string;
    appToken?: string;
}
export interface Channel {
    id: string;
    name: string;
    isPrivate: boolean;
    isMember: boolean;
    numMembers: number;
    topic?: string;
    purpose?: string;
    created: string;
    updated: string;
}
export interface User {
    id: string;
    name: string;
    realName: string;
    email?: string;
    isBot: boolean;
    isAdmin: boolean;
    isWorkflowBot: boolean;
    status?: string;
    avatarUrl: string;
}
export interface Message {
    ts: string;
    threadTs?: string;
    channel: string;
    text: string;
    user?: string;
    botId?: string;
    subtype?: string;
    attachments?: any[];
    blocks?: any[];
    reactions?: {
        name: string;
        count: number;
    }[];
    replyCount?: number;
    replyUsers?: string[];
    edited?: {
        ts: string;
        user: string;
    };
    deleted?: boolean;
    file?: any;
}
export interface SendMessageOptions {
    channel: string;
    text: string;
    blocks?: any[];
    attachments?: any[];
    threadTs?: string;
    unfurlLinks?: boolean;
    unfurlMedia?: boolean;
    metadata?: {
        eventType: string;
        eventPayload: Record<string, any>;
    };
}
export interface SearchResult {
    ok: boolean;
    query: string;
    messages?: {
        total: number;
        matches: Message[];
    };
    files?: {
        total: number;
        matches: any[];
    };
}
export declare class SlackTool {
    private client;
    private defaultChannel;
    constructor(config: SlackConfig);
    setDefaultChannel(channelId: string): void;
    sendMessage(options: SendMessageOptions): Promise<Message | null>;
    sendDirectMessage(userId: string, text: string, blocks?: any[]): Promise<Message | null>;
    replyToThread(channel: string, threadTs: string, text: string, blocks?: any[]): Promise<Message | null>;
    updateMessage(channel: string, ts: string, text: string, blocks?: any[]): Promise<boolean>;
    deleteMessage(channel: string, ts: string): Promise<boolean>;
    addReaction(channel: string, ts: string, emoji: string): Promise<boolean>;
    removeReaction(channel: string, ts: string, emoji: string): Promise<boolean>;
    getMessage(channel: string, ts: string): Promise<Message | null>;
    listChannels(options?: {
        types?: 'public_channel' | 'private_channel' | 'mpim' | 'im';
        excludeArchived?: boolean;
        limit?: number;
    }): Promise<Channel[]>;
    joinChannel(channelId: string): Promise<boolean>;
    leaveChannel(channelId: string): Promise<boolean>;
    getUser(userId: string): Promise<User | null>;
    listUsers(): Promise<User[]>;
    searchMessages(query: string, options?: {
        count?: number;
        sort?: 'score' | 'recent';
        sortDir?: 'asc' | 'desc';
    }): Promise<SearchResult>;
    uploadFile(channels: string[], file: Buffer, filename: string, options?: {
        title?: string;
        initialComment?: string;
        threadTs?: string;
    }): Promise<boolean>;
    setChannelPurpose(channelId: string, purpose: string): Promise<boolean>;
    setChannelTopic(channelId: string, topic: string): Promise<boolean>;
    getChannelInfo(channelId: string): Promise<Channel | null>;
}
//# sourceMappingURL=slack.d.ts.map