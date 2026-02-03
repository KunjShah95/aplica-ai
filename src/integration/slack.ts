import {
  WebClient,
  ChatPostMessageResponse,
  ConversationsInfoResponse,
  UsersInfoResponse,
} from '@slack/web-api';

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

export class SlackService {
  private client: WebClient;
  private defaultChannel: string | null = null;

  constructor(config: SlackConfig) {
    this.client = new WebClient(config.botToken);
  }

  async postMessage(message: SlackMessage): Promise<ChatPostMessageResponse> {
    return this.client.chat.postMessage({
      channel: message.channel,
      text: message.text,
      blocks: message.blocks,
      attachments: message.attachments,
      thread_ts: message.threadTs,
      mrkdwn: message.mrkdwn ?? true,
    });
  }

  async updateMessage(channel: string, ts: string, text: string, blocks?: any[]): Promise<void> {
    await this.client.chat.update({
      channel,
      ts,
      text,
      blocks,
    });
  }

  async deleteMessage(channel: string, ts: string): Promise<void> {
    await this.client.chat.delete({
      channel,
      ts,
    });
  }

  async getChannelInfo(channelId: string): Promise<SlackChannel> {
    const response = (await this.client.conversations.info({
      channel: channelId,
    })) as ConversationsInfoResponse;
    const channel = response.channel!;

    return {
      id: channel.id || '',
      name: channel.name || '',
      isPrivate: channel.is_private || false,
      isMember: channel.is_member || false,
      topic: channel.topic?.value,
      purpose: channel.purpose?.value,
      numMembers: channel.num_members || 0,
    };
  }

  async listChannels(options?: {
    types?: ('public' | 'private' | 'mpim' | 'im')[];
    limit?: number;
    cursor?: string;
  }): Promise<{ channels: SlackChannel[]; nextCursor?: string }> {
    const response = await this.client.conversations.list({
      types: options?.types?.join(',') || 'public_channel,private_channel',
      limit: options?.limit || 100,
      cursor: options?.cursor,
    });

    return {
      channels: (response.channels || []).map((c: any) => ({
        id: c.id || '',
        name: c.name || '',
        isPrivate: c.is_private || false,
        isMember: c.is_member || false,
        numMembers: c.num_members || 0,
      })),
      nextCursor: response.response_metadata?.next_cursor,
    };
  }

  async joinChannel(channelId: string): Promise<void> {
    await this.client.conversations.join({ channel: channelId });
  }

  async leaveChannel(channelId: string): Promise<void> {
    await this.client.conversations.leave({ channel: channelId });
  }

  async inviteToChannel(channelId: string, userIds: string[]): Promise<void> {
    await this.client.conversations.invite({ channel: channelId, users: userIds.join(',') });
  }

  async getUserInfo(userId: string): Promise<SlackUser> {
    const response = (await this.client.users.info({ user: userId })) as UsersInfoResponse;
    const user = response.user!;

    return {
      id: user.id || '',
      name: user.name || '',
      realName: user.real_name || '',
      email: user.profile?.email,
      isBot: user.is_bot || false,
      status: user.profile?.status_text,
    };
  }

  async listUsers(): Promise<SlackUser[]> {
    const response = await this.client.users.list();

    return (response.members || []).map((m: any) => ({
      id: m.id || '',
      name: m.name || '',
      realName: m.real_name || '',
      email: m.profile?.email,
      isBot: m.is_bot || false,
    }));
  }

  async addReaction(channel: string, timestamp: string, emoji: string): Promise<void> {
    await this.client.reactions.add({
      channel,
      timestamp,
      name: emoji,
    });
  }

  async removeReaction(channel: string, timestamp: string, emoji: string): Promise<void> {
    await this.client.reactions.remove({
      channel,
      timestamp,
      name: emoji,
    });
  }

  async getReactions(channel: string, timestamp: string): Promise<SlackReaction[]> {
    const response = await this.client.reactions.get({
      channel,
      timestamp,
    });

    return (response.message?.reactions || []).map((r: any) => ({
      name: r.name || '',
      count: r.count || 0,
    }));
  }

  async uploadFile(options: {
    file: Buffer | string;
    filename: string;
    fileType?: string;
    title?: string;
    initialComment?: string;
    channels?: string[];
  }): Promise<void> {
    await this.client.files.uploadV2({
      file: options.file,
      filename: options.filename,
      filetype: options.fileType,
      title: options.title,
      initial_comment: options.initialComment,
      channels: options.channels?.join(','),
    });
  }

  async startConversation(userId: string): Promise<{ channelId: string }> {
    const response = await this.client.conversations.open({ users: userId });
    return { channelId: response.channel?.id || '' };
  }

  async getConversationHistory(
    channelId: string,
    options?: {
      limit?: number;
      oldest?: string;
      latest?: string;
    }
  ): Promise<any[]> {
    const response = await this.client.conversations.history({
      channel: channelId,
      limit: options?.limit || 100,
      oldest: options?.oldest,
      latest: options?.latest,
    });

    return response.messages || [];
  }

  async scheduleMessage(options: {
    channel: string;
    text: string;
    postAt: number;
    blocks?: any[];
  }): Promise<{ scheduledMessageId: string }> {
    const response = await this.client.chat.scheduleMessage({
      channel: options.channel,
      text: options.text,
      post_at: options.postAt,
      blocks: options.blocks,
    });

    return { scheduledMessageId: response.scheduled_message_id || '' };
  }

  async listScheduledMessages(channel: string): Promise<any[]> {
    const response = await this.client.chat.scheduledMessages.list({
      channel,
    });

    return response.scheduled_messages || [];
  }

  async deleteScheduledMessage(channel: string, scheduledMessageId: string): Promise<void> {
    await this.client.chat.deleteScheduledMessage({
      channel,
      scheduled_message_id: scheduledMessageId,
    });
  }

  setDefaultChannel(channel: string): void {
    this.defaultChannel = channel;
  }

  async sendDefault(text: string, blocks?: any[]): Promise<ChatPostMessageResponse | null> {
    if (!this.defaultChannel) return null;
    return this.postMessage({ channel: this.defaultChannel, text, blocks });
  }
}

export function createSlackService(config: SlackConfig): SlackService {
  return new SlackService(config);
}
