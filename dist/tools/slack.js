import { WebClient, } from '@slack/web-api';
export class SlackTool {
    client;
    defaultChannel = '';
    constructor(config) {
        this.client = new WebClient(config.token, {
            slackApiUrl: 'https://slackapi.com/',
        });
    }
    setDefaultChannel(channelId) {
        this.defaultChannel = channelId;
    }
    async sendMessage(options) {
        try {
            const result = await this.client.chat.postMessage({
                channel: options.channel,
                text: options.text,
                blocks: options.blocks,
                attachments: options.attachments,
                thread_ts: options.threadTs,
                unfurl_links: options.unfurlLinks,
                unfurl_media: options.unfurlMedia,
                metadata: options.metadata,
            });
            const slackResult = result;
            return {
                ts: slackResult.ts || '',
                channel: slackResult.channel || '',
                text: slackResult.text || '',
                threadTs: slackResult.thread_ts,
            };
        }
        catch (error) {
            console.error('Failed to send message:', error);
            return null;
        }
    }
    async sendDirectMessage(userId, text, blocks) {
        try {
            const conversation = await this.client.conversations.open({
                users: userId,
            });
            if (!conversation.channel?.id)
                return null;
            return this.sendMessage({
                channel: conversation.channel.id,
                text,
                blocks,
            });
        }
        catch (error) {
            console.error('Failed to send DM:', error);
            return null;
        }
    }
    async replyToThread(channel, threadTs, text, blocks) {
        try {
            const result = await this.client.chat.postMessage({
                channel,
                text,
                thread_ts: threadTs,
                blocks,
            });
            const replyResult = result;
            return {
                ts: replyResult.ts || '',
                channel: replyResult.channel || '',
                text: replyResult.text || '',
                threadTs: replyResult.thread_ts,
            };
        }
        catch (error) {
            console.error('Failed to reply to thread:', error);
            return null;
        }
    }
    async updateMessage(channel, ts, text, blocks) {
        try {
            await this.client.chat.update({
                channel,
                ts,
                text,
                blocks,
            });
            return true;
        }
        catch (error) {
            console.error('Failed to update message:', error);
            return false;
        }
    }
    async deleteMessage(channel, ts) {
        try {
            await this.client.chat.delete({
                channel,
                ts,
            });
            return true;
        }
        catch (error) {
            console.error('Failed to delete message:', error);
            return false;
        }
    }
    async addReaction(channel, ts, emoji) {
        try {
            await this.client.reactions.add({
                channel,
                timestamp: ts,
                name: emoji,
            });
            return true;
        }
        catch (error) {
            console.error('Failed to add reaction:', error);
            return false;
        }
    }
    async removeReaction(channel, ts, emoji) {
        try {
            await this.client.reactions.remove({
                channel,
                timestamp: ts,
                name: emoji,
            });
            return true;
        }
        catch (error) {
            console.error('Failed to remove reaction:', error);
            return false;
        }
    }
    async getMessage(channel, ts) {
        try {
            const result = await this.client.conversations.history({
                channel,
                latest: ts,
                inclusive: true,
                limit: 1,
            });
            const message = result.messages?.[0];
            if (!message)
                return null;
            return {
                ts: message.ts || '',
                channel,
                text: message.text || '',
                user: message.user,
                threadTs: message.thread_ts,
                reactions: (message.reactions || []).map((r) => ({
                    name: r.name || '',
                    count: r.count || 0,
                })),
                replyCount: message.reply_count,
                replyUsers: message.reply_users,
                edited: message.edited
                    ? {
                        ts: message.edited.ts || '',
                        user: message.edited.user || '',
                    }
                    : undefined,
                deleted: message.subtype === 'message_deleted',
            };
        }
        catch (error) {
            console.error('Failed to get message:', error);
            return null;
        }
    }
    async listChannels(options) {
        try {
            const result = await this.client.conversations.list({
                types: options?.types || 'public_channel,private_channel',
                exclude_archived: options?.excludeArchived ?? true,
                limit: options?.limit || 100,
            });
            return (result.channels || []).map((channel) => ({
                id: channel.id,
                name: channel.name,
                isPrivate: channel.is_private,
                isMember: channel.is_member,
                numMembers: channel.num_members || 0,
                topic: channel.topic?.value,
                purpose: channel.purpose?.value,
                created: channel.created || '',
                updated: channel.updated || '',
            }));
        }
        catch (error) {
            console.error('Failed to list channels:', error);
            return [];
        }
    }
    async joinChannel(channelId) {
        try {
            await this.client.conversations.join({
                channel: channelId,
            });
            return true;
        }
        catch (error) {
            console.error('Failed to join channel:', error);
            return false;
        }
    }
    async leaveChannel(channelId) {
        try {
            await this.client.conversations.leave({
                channel: channelId,
            });
            return true;
        }
        catch (error) {
            console.error('Failed to leave channel:', error);
            return false;
        }
    }
    async getUser(userId) {
        try {
            const result = (await this.client.users.info({
                user: userId,
            }));
            if (!result.user)
                return null;
            return {
                id: result.user.id || '',
                name: result.user.name || '',
                realName: result.user.real_name || '',
                email: result.user.profile?.email,
                isBot: result.user.is_bot || false,
                isAdmin: result.user.is_admin || false,
                isWorkflowBot: result.user.is_workflow_bot || false,
                status: result.user.profile?.status_text,
                avatarUrl: result.user.profile?.image_192 || '',
            };
        }
        catch (error) {
            console.error('Failed to get user:', error);
            return null;
        }
    }
    async listUsers() {
        try {
            const result = await this.client.users.list({
                limit: 100,
            });
            return (result.members || []).map((user) => ({
                id: user.id || '',
                name: user.name || '',
                realName: user.real_name || '',
                email: user.profile?.email,
                isBot: user.is_bot || false,
                isAdmin: user.is_admin || false,
                isWorkflowBot: user.is_workflow_bot || false,
                status: user.profile?.status_text,
                avatarUrl: user.profile?.image_192 || '',
            }));
        }
        catch (error) {
            console.error('Failed to list users:', error);
            return [];
        }
    }
    async searchMessages(query, options) {
        try {
            const result = await this.client.search.messages({
                query,
                count: options?.count || 20,
                sort: options?.sort || 'score',
                sort_dir: options?.sortDir || 'desc',
            });
            return {
                ok: result.ok || false,
                query,
                messages: {
                    total: result.messages?.total || 0,
                    matches: (result.messages?.matches || []).map((m) => ({
                        ts: m.ts || '',
                        channel: m.channel?.id || '',
                        text: m.text || '',
                        user: m.user,
                    })),
                },
                files: {
                    total: result.files?.total || 0,
                    matches: result.files?.matches || [],
                },
            };
        }
        catch (error) {
            console.error('Failed to search messages:', error);
            return { ok: false, query };
        }
    }
    async uploadFile(channels, file, filename, options) {
        try {
            await this.client.files.uploadV2({
                channel_id: channels[0],
                file,
                filename,
                title: options?.title,
                initial_comment: options?.initialComment,
                thread_ts: options?.threadTs,
            });
            return true;
        }
        catch (error) {
            console.error('Failed to upload file:', error);
            return false;
        }
    }
    async setChannelPurpose(channelId, purpose) {
        try {
            await this.client.conversations.setPurpose({
                channel: channelId,
                purpose,
            });
            return true;
        }
        catch (error) {
            console.error('Failed to set channel purpose:', error);
            return false;
        }
    }
    async setChannelTopic(channelId, topic) {
        try {
            await this.client.conversations.setTopic({
                channel: channelId,
                topic,
            });
            return true;
        }
        catch (error) {
            console.error('Failed to set channel topic:', error);
            return false;
        }
    }
    async getChannelInfo(channelId) {
        try {
            const result = await this.client.conversations.info({
                channel: channelId,
            });
            if (!result.channel)
                return null;
            const channelInfo = result.channel;
            return {
                id: channelInfo.id || '',
                name: channelInfo.name || '',
                isPrivate: channelInfo.is_private || false,
                isMember: channelInfo.is_member || false,
                numMembers: channelInfo.num_members || 0,
                topic: channelInfo.topic?.value || '',
                purpose: channelInfo.purpose?.value || '',
                created: String(channelInfo.created || ''),
                updated: String(channelInfo.updated || ''),
            };
        }
        catch (error) {
            console.error('Failed to get channel info:', error);
            return null;
        }
    }
}
//# sourceMappingURL=slack.js.map