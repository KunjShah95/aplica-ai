import { WebClient, } from '@slack/web-api';
export class SlackService {
    client;
    defaultChannel = null;
    constructor(config) {
        this.client = new WebClient(config.botToken);
    }
    async postMessage(message) {
        return this.client.chat.postMessage({
            channel: message.channel,
            text: message.text,
            blocks: message.blocks,
            attachments: message.attachments,
            thread_ts: message.threadTs,
            mrkdwn: message.mrkdwn ?? true,
        });
    }
    async updateMessage(channel, ts, text, blocks) {
        await this.client.chat.update({
            channel,
            ts,
            text,
            blocks,
        });
    }
    async deleteMessage(channel, ts) {
        await this.client.chat.delete({
            channel,
            ts,
        });
    }
    async getChannelInfo(channelId) {
        const response = (await this.client.conversations.info({
            channel: channelId,
        }));
        const channel = response.channel;
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
    async listChannels(options) {
        const response = await this.client.conversations.list({
            types: options?.types?.join(',') || 'public_channel,private_channel',
            limit: options?.limit || 100,
            cursor: options?.cursor,
        });
        return {
            channels: (response.channels || []).map((c) => ({
                id: c.id || '',
                name: c.name || '',
                isPrivate: c.is_private || false,
                isMember: c.is_member || false,
                numMembers: c.num_members || 0,
            })),
            nextCursor: response.response_metadata?.next_cursor,
        };
    }
    async joinChannel(channelId) {
        await this.client.conversations.join({ channel: channelId });
    }
    async leaveChannel(channelId) {
        await this.client.conversations.leave({ channel: channelId });
    }
    async inviteToChannel(channelId, userIds) {
        await this.client.conversations.invite({ channel: channelId, users: userIds.join(',') });
    }
    async getUserInfo(userId) {
        const response = (await this.client.users.info({ user: userId }));
        const user = response.user;
        return {
            id: user.id || '',
            name: user.name || '',
            realName: user.real_name || '',
            email: user.profile?.email,
            isBot: user.is_bot || false,
            status: user.profile?.status_text,
        };
    }
    async listUsers() {
        const response = await this.client.users.list({});
        return (response.members || []).map((m) => ({
            id: m.id || '',
            name: m.name || '',
            realName: m.real_name || '',
            email: m.profile?.email,
            isBot: m.is_bot || false,
        }));
    }
    async addReaction(channel, timestamp, emoji) {
        await this.client.reactions.add({
            channel,
            timestamp,
            name: emoji,
        });
    }
    async removeReaction(channel, timestamp, emoji) {
        await this.client.reactions.remove({
            channel,
            timestamp,
            name: emoji,
        });
    }
    async getReactions(channel, timestamp) {
        const response = await this.client.reactions.get({
            channel,
            timestamp,
        });
        return (response.message?.reactions || []).map((r) => ({
            name: r.name || '',
            count: r.count || 0,
        }));
    }
    async uploadFile(options) {
        await this.client.files.uploadV2({
            file: options.file,
            filename: options.filename,
            filetype: options.fileType,
            title: options.title,
            initial_comment: options.initialComment,
            channels: options.channels?.join(','),
        });
    }
    async startConversation(userId) {
        const response = await this.client.conversations.open({ users: userId });
        return { channelId: response.channel?.id || '' };
    }
    async getConversationHistory(channelId, options) {
        const response = await this.client.conversations.history({
            channel: channelId,
            limit: options?.limit || 100,
            oldest: options?.oldest,
            latest: options?.latest,
        });
        return response.messages || [];
    }
    async scheduleMessage(options) {
        const response = await this.client.chat.scheduleMessage({
            channel: options.channel,
            text: options.text,
            post_at: options.postAt,
            blocks: options.blocks,
        });
        return { scheduledMessageId: response.scheduled_message_id || '' };
    }
    async listScheduledMessages(channel) {
        const response = await this.client.chat.scheduledMessages.list({
            channel,
        });
        return response.scheduled_messages || [];
    }
    async deleteScheduledMessage(channel, scheduledMessageId) {
        await this.client.chat.deleteScheduledMessage({
            channel,
            scheduled_message_id: scheduledMessageId,
        });
    }
    setDefaultChannel(channel) {
        this.defaultChannel = channel;
    }
    async sendDefault(text, blocks) {
        if (!this.defaultChannel)
            return null;
        return this.postMessage({ channel: this.defaultChannel, text, blocks });
    }
}
export function createSlackService(config) {
    return new SlackService(config);
}
//# sourceMappingURL=slack.js.map