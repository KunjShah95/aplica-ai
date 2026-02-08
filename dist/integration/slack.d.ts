import { ChatPostMessageResponse } from '@slack/web-api';
export interface SlackConfig {
    botToken: string;
    appToken?: string;
    signingSecret?: string;
}
export interface SlackMessage {
    channel: string;
    text: string;
    blocks?: any[];
    attachments?: any[];
    threadTs?: string;
    mrkdwn?: boolean;
}
export interface SlackChannel {
    id: string;
    name: string;
    isPrivate: boolean;
    isMember: boolean;
    topic?: string;
    purpose?: string;
    numMembers: number;
}
export interface SlackUser {
    id: string;
    name: string;
    realName: string;
    email?: string;
    isBot: boolean;
    status?: string;
}
export interface SlackReaction {
    name: string;
    count: number;
}
export declare class SlackService {
    private client;
    private defaultChannel;
    constructor(config: SlackConfig);
    postMessage(message: SlackMessage): Promise<ChatPostMessageResponse>;
    updateMessage(channel: string, ts: string, text: string, blocks?: any[]): Promise<void>;
    deleteMessage(channel: string, ts: string): Promise<void>;
    getChannelInfo(channelId: string): Promise<SlackChannel>;
    listChannels(options?: {
        types?: ('public' | 'private' | 'mpim' | 'im')[];
        limit?: number;
        cursor?: string;
    }): Promise<{
        channels: SlackChannel[];
        nextCursor?: string;
    }>;
    joinChannel(channelId: string): Promise<void>;
    leaveChannel(channelId: string): Promise<void>;
    inviteToChannel(channelId: string, userIds: string[]): Promise<void>;
    getUserInfo(userId: string): Promise<SlackUser>;
    listUsers(): Promise<SlackUser[]>;
    addReaction(channel: string, timestamp: string, emoji: string): Promise<void>;
    removeReaction(channel: string, timestamp: string, emoji: string): Promise<void>;
    getReactions(channel: string, timestamp: string): Promise<SlackReaction[]>;
    uploadFile(options: {
        file: Buffer | string;
        filename: string;
        fileType?: string;
        title?: string;
        initialComment?: string;
        channels?: string[];
    }): Promise<void>;
    startConversation(userId: string): Promise<{
        channelId: string;
    }>;
    getConversationHistory(channelId: string, options?: {
        limit?: number;
        oldest?: string;
        latest?: string;
    }): Promise<any[]>;
    scheduleMessage(options: {
        channel: string;
        text: string;
        postAt: number;
        blocks?: any[];
    }): Promise<{
        scheduledMessageId: string;
    }>;
    listScheduledMessages(channel: string): Promise<any[]>;
    deleteScheduledMessage(channel: string, scheduledMessageId: string): Promise<void>;
    setDefaultChannel(channel: string): void;
    sendDefault(text: string, blocks?: any[]): Promise<ChatPostMessageResponse | null>;
}
export declare function createSlackService(config: SlackConfig): SlackService;
//# sourceMappingURL=slack.d.ts.map