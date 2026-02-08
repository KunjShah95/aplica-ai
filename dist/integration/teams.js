import { Client } from '@microsoft/microsoft-graph-client';
export class TeamsService {
    client = null;
    config;
    constructor(config) {
        this.config = config;
        this.initClient();
    }
    initClient() {
        this.client = Client.init({
            authProvider: (done) => {
                done(null, this.config.accessToken || '');
            },
        });
    }
    setAccessToken(token) {
        this.config.accessToken = token;
        this.initClient();
    }
    getAuthUrl(scopes) {
        const baseUrl = `https://login.microsoftonline.com/${this.config.tenantId}/oauth2/v2.0/authorize`;
        const params = new URLSearchParams({
            client_id: this.config.clientId,
            response_type: 'code',
            redirect_uri: this.config.redirectUri,
            scope: (scopes || ['https://graph.microsoft.com/.default']).join(' '),
            response_mode: 'query',
        });
        return `${baseUrl}?${params.toString()}`;
    }
    async getTokenFromCode(code) {
        const response = await fetch(`https://login.microsoftonline.com/${this.config.tenantId}/oauth2/v2.0/token`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
                client_id: this.config.clientId,
                client_secret: this.config.clientSecret,
                code,
                redirect_uri: this.config.redirectUri,
                grant_type: 'authorization_code',
            }),
        });
        const data = (await response.json());
        this.config.accessToken = data.access_token || '';
        this.initClient();
        return data.access_token || '';
    }
    async listTeams() {
        if (!this.client)
            throw new Error('Teams client not initialized');
        const response = await this.client
            .api('/groups')
            .filter('resourceProvisioningOptions/Any(x:x eq "Team")')
            .get();
        return (response.value || []).map((team) => ({
            id: team.id,
            displayName: team.displayName,
            description: team.description,
            visibility: team.visibility || 'private',
            webUrl: team.webUrl,
        }));
    }
    async getTeam(teamId) {
        if (!this.client)
            throw new Error('Teams client not initialized');
        const team = await this.client.api(`/teams/${teamId}`).get();
        const response = await this.client.api(`/teams/${teamId}/channels`).get();
        return {
            id: team.id,
            displayName: team.displayName,
            description: team.description,
            visibility: team.visibility || 'private',
            webUrl: team.webUrl,
        };
    }
    async listChannels(teamId) {
        if (!this.client)
            throw new Error('Teams client not initialized');
        const response = await this.client.api(`/teams/${teamId}/channels`).get();
        return (response.value || []).map((channel) => ({
            id: channel.id,
            displayName: channel.displayName,
            description: channel.description,
            webUrl: channel.webUrl,
            membershipType: channel.membershipType || 'standard',
        }));
    }
    async getChannel(teamId, channelId) {
        if (!this.client)
            throw new Error('Teams client not initialized');
        const channel = await this.client.api(`/teams/${teamId}/channels/${channelId}`).get();
        return {
            id: channel.id,
            displayName: channel.displayName,
            description: channel.description,
            webUrl: channel.webUrl,
            membershipType: channel.membershipType || 'standard',
        };
    }
    async sendMessage(teamId, channelId, message) {
        if (!this.client)
            throw new Error('Teams client not initialized');
        const response = await this.client.api(`/teams/${teamId}/channels/${channelId}/messages`).post({
            body: {
                content: message.body,
                contentType: message.contentType || 'text',
            },
            subject: message.subject,
            mentions: message.mentions,
        });
        return response.id || '';
    }
    async replyToMessage(teamId, channelId, messageId, message) {
        if (!this.client)
            throw new Error('Teams client not initialized');
        const response = await this.client
            .api(`/teams/${teamId}/channels/${channelId}/messages/${messageId}/replies`)
            .post({
            body: {
                content: message.body,
                contentType: message.contentType || 'text',
            },
        });
        return response.id || '';
    }
    async getMessage(teamId, channelId, messageId) {
        if (!this.client)
            throw new Error('Teams client not initialized');
        return this.client.api(`/teams/${teamId}/channels/${channelId}/messages/${messageId}`).get();
    }
    async listMessages(teamId, channelId, options) {
        if (!this.client)
            throw new Error('Teams client not initialized');
        const response = await this.client
            .api(`/teams/${teamId}/channels/${channelId}/messages`)
            .top(options?.top || 50)
            .skip(options?.skip || 0)
            .get();
        return response.value || [];
    }
    async createTeam(name, description, visibility = 'private') {
        if (!this.client)
            throw new Error('Teams client not initialized');
        const response = await this.client.api('/teams').post({
            'template@odata.bind': "https://graph.microsoft.com/v1.0/teamsTemplates('standard')",
            'displayName': name,
            'description': description || '',
            visibility,
        });
        return response.id || '';
    }
    async createChannel(teamId, name, description, membershipType = 'standard') {
        if (!this.client)
            throw new Error('Teams client not initialized');
        const response = await this.client.api(`/teams/${teamId}/channels`).post({
            displayName: name,
            description: description || '',
            membershipType,
        });
        return response.id || '';
    }
    async addTeamMember(teamId, userEmail, role = 'member') {
        if (!this.client)
            throw new Error('Teams client not initialized');
        const user = await this.client.api(`/users/${userEmail}`).get();
        await this.client.api(`/teams/${teamId}/members`).post({
            '@odata.type': '#microsoft.graph.aadUserConversationMember',
            'roles': [role],
            'user@odata.bind': `https://graph.microsoft.com/v1.0/users('${user.id}')`,
        });
    }
    async removeTeamMember(teamId, userId) {
        if (!this.client)
            throw new Error('Teams client not initialized');
        await this.client.api(`/teams/${teamId}/members/${userId}`).delete();
    }
    async listTeamMembers(teamId) {
        if (!this.client)
            throw new Error('Teams client not initialized');
        const response = await this.client.api(`/teams/${teamId}/members`).get();
        return (response.value || []).map((member) => ({
            id: member.userId || member.id,
            displayName: member.displayName || '',
            email: member.email,
            userPrincipalName: member.userPrincipalName,
        }));
    }
    async getUser(userId) {
        if (!this.client)
            throw new Error('Teams client not initialized');
        const user = await this.client.api(`/users/${userId}`).get();
        return {
            id: user.id,
            displayName: user.displayName,
            email: user.mail,
            userPrincipalName: user.userPrincipalName,
        };
    }
    async searchUsers(query) {
        if (!this.client)
            throw new Error('Teams client not initialized');
        const response = await this.client
            .api('/users')
            .filter(`startswith(displayName,'${query}')`)
            .get();
        return (response.value || []).map((user) => ({
            id: user.id,
            displayName: user.displayName,
            email: user.mail,
            userPrincipalName: user.userPrincipalName,
        }));
    }
    async uploadFile(teamId, channelId, fileName, content, conversationId) {
        if (!this.client)
            throw new Error('Teams client not initialized');
        const response = await this.client
            .api(`/teams/${teamId}/channels/${channelId}/messages/${conversationId || ''}/attachments`)
            .post({
            '@microsoft.graph.downloadUrl': '',
            'content': content.toString('base64'),
            'name': fileName,
        });
        return response.id || '';
    }
    async createOnlineMeeting(subject, startDateTime, endDateTime, attendees) {
        if (!this.client)
            throw new Error('Teams client not initialized');
        return this.client.api('/me/onlineMeetings').post({
            subject,
            startDateTime,
            endDateTime,
            participants: {
                attendees: attendees.map((email) => ({
                    upn: email,
                    role: 'attendee',
                })),
            },
        });
    }
}
export function createTeamsService(config) {
    return new TeamsService(config);
}
//# sourceMappingURL=teams.js.map