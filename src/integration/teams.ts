import { Client } from '@microsoft/microsoft-graph-client';

export interface TeamsConfig {
  clientId: string;
  clientSecret: string;
  tenantId: string;
  redirectUri: string;
  accessToken?: string;
}

export interface TeamsMessage {
  body: string;
  contentType?: 'text' | 'html';
  subject?: string;
  mentions?: Array<{
    id: string;
    mentionText: string;
    mentioned: {
      user: { id: string; displayName?: string };
    };
  }>;
}

export interface TeamsChannel {
  id: string;
  displayName: string;
  description?: string;
  webUrl?: string;
  membershipType: 'standard' | 'private' | 'unknownFutureValue';
}

export interface TeamsTeam {
  id: string;
  displayName: string;
  description?: string;
  visibility: 'private' | 'public';
  webUrl?: string;
}

export interface TeamsUser {
  id: string;
  displayName: string;
  email?: string;
  userPrincipalName?: string;
}

export class TeamsService {
  private client: Client | null = null;
  private config: TeamsConfig;

  constructor(config: TeamsConfig) {
    this.config = config;
    this.initClient();
  }

  private initClient(): void {
    this.client = Client.init({
      authProvider: (done) => {
        done(null, this.config.accessToken || '');
      },
    });
  }

  setAccessToken(token: string): void {
    this.config.accessToken = token;
    this.initClient();
  }

  getAuthUrl(scopes?: string[]): string {
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

  async getTokenFromCode(code: string): Promise<string> {
    const response = await fetch(
      `https://login.microsoftonline.com/${this.config.tenantId}/oauth2/v2.0/token`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          client_id: this.config.clientId,
          client_secret: this.config.clientSecret,
          code,
          redirect_uri: this.config.redirectUri,
          grant_type: 'authorization_code',
        }),
      }
    );

    const data = await response.json();
    this.config.accessToken = data.access_token;
    this.initClient();
    return data.access_token;
  }

  async listTeams(): Promise<TeamsTeam[]> {
    if (!this.client) throw new Error('Teams client not initialized');

    const response = await this.client
      .api('/groups')
      .filter('resourceProvisioningOptions/Any(x:x eq "Team")')
      .get();

    return (response.value || []).map((team: any) => ({
      id: team.id,
      displayName: team.displayName,
      description: team.description,
      visibility: team.visibility || 'private',
      webUrl: team.webUrl,
    }));
  }

  async getTeam(teamId: string): Promise<TeamsTeam> {
    if (!this.client) throw new Error('Teams client not initialized');

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

  async listChannels(teamId: string): Promise<TeamsChannel[]> {
    if (!this.client) throw new Error('Teams client not initialized');

    const response = await this.client.api(`/teams/${teamId}/channels`).get();

    return (response.value || []).map((channel: any) => ({
      id: channel.id,
      displayName: channel.displayName,
      description: channel.description,
      webUrl: channel.webUrl,
      membershipType: channel.membershipType || 'standard',
    }));
  }

  async getChannel(teamId: string, channelId: string): Promise<TeamsChannel> {
    if (!this.client) throw new Error('Teams client not initialized');

    const channel = await this.client.api(`/teams/${teamId}/channels/${channelId}`).get();

    return {
      id: channel.id,
      displayName: channel.displayName,
      description: channel.description,
      webUrl: channel.webUrl,
      membershipType: channel.membershipType || 'standard',
    };
  }

  async sendMessage(teamId: string, channelId: string, message: TeamsMessage): Promise<string> {
    if (!this.client) throw new Error('Teams client not initialized');

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

  async replyToMessage(
    teamId: string,
    channelId: string,
    messageId: string,
    message: TeamsMessage
  ): Promise<string> {
    if (!this.client) throw new Error('Teams client not initialized');

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

  async getMessage(teamId: string, channelId: string, messageId: string): Promise<any> {
    if (!this.client) throw new Error('Teams client not initialized');

    return this.client.api(`/teams/${teamId}/channels/${channelId}/messages/${messageId}`).get();
  }

  async listMessages(
    teamId: string,
    channelId: string,
    options?: {
      top?: number;
      skip?: number;
    }
  ): Promise<any[]> {
    if (!this.client) throw new Error('Teams client not initialized');

    const response = await this.client
      .api(`/teams/${teamId}/channels/${channelId}/messages`)
      .top(options?.top || 50)
      .skip(options?.skip || 0)
      .get();

    return response.value || [];
  }

  async createTeam(
    name: string,
    description?: string,
    visibility: 'private' | 'public' = 'private'
  ): Promise<string> {
    if (!this.client) throw new Error('Teams client not initialized');

    const response = await this.client.api('/teams').post({
      'template@odata.bind': "https://graph.microsoft.com/v1.0/teamsTemplates('standard')",
      'displayName': name,
      'description': description || '',
      visibility,
    });

    return response.id || '';
  }

  async createChannel(
    teamId: string,
    name: string,
    description?: string,
    membershipType: 'standard' | 'private' = 'standard'
  ): Promise<string> {
    if (!this.client) throw new Error('Teams client not initialized');

    const response = await this.client.api(`/teams/${teamId}/channels`).post({
      displayName: name,
      description: description || '',
      membershipType,
    });

    return response.id || '';
  }

  async addTeamMember(
    teamId: string,
    userEmail: string,
    role: 'member' | 'owner' = 'member'
  ): Promise<void> {
    if (!this.client) throw new Error('Teams client not initialized');

    const user = await this.client.api(`/users/${userEmail}`).get();

    await this.client.api(`/teams/${teamId}/members`).post({
      '@odata.type': '#microsoft.graph.aadUserConversationMember',
      'roles': [role],
      'user@odata.bind': `https://graph.microsoft.com/v1.0/users('${user.id}')`,
    });
  }

  async removeTeamMember(teamId: string, userId: string): Promise<void> {
    if (!this.client) throw new Error('Teams client not initialized');

    await this.client.api(`/teams/${teamId}/members/${userId}`).delete();
  }

  async listTeamMembers(teamId: string): Promise<TeamsUser[]> {
    if (!this.client) throw new Error('Teams client not initialized');

    const response = await this.client.api(`/teams/${teamId}/members`).get();

    return (response.value || []).map((member: any) => ({
      id: member.userId || member.id,
      displayName: member.displayName || '',
      email: member.email,
      userPrincipalName: member.userPrincipalName,
    }));
  }

  async getUser(userId: string): Promise<TeamsUser> {
    if (!this.client) throw new Error('Teams client not initialized');

    const user = await this.client.api(`/users/${userId}`).get();

    return {
      id: user.id,
      displayName: user.displayName,
      email: user.mail,
      userPrincipalName: user.userPrincipalName,
    };
  }

  async searchUsers(query: string): Promise<TeamsUser[]> {
    if (!this.client) throw new Error('Teams client not initialized');

    const response = await this.client
      .api('/users')
      .filter(`startswith(displayName,'${query}')`)
      .get();

    return (response.value || []).map((user: any) => ({
      id: user.id,
      displayName: user.displayName,
      email: user.mail,
      userPrincipalName: user.userPrincipalName,
    }));
  }

  async uploadFile(
    teamId: string,
    channelId: string,
    fileName: string,
    content: Buffer | Blob,
    conversationId?: string
  ): Promise<string> {
    if (!this.client) throw new Error('Teams client not initialized');

    const response = await this.client
      .api(`/teams/${teamId}/channels/${channelId}/messages/${conversationId || ''}/attachments`)
      .post({
        '@microsoft.graph.downloadUrl': '',
        'content': content.toString('base64'),
        'name': fileName,
      });

    return response.id || '';
  }

  async createOnlineMeeting(
    subject: string,
    startDateTime: string,
    endDateTime: string,
    attendees: string[]
  ): Promise<any> {
    if (!this.client) throw new Error('Teams client not initialized');

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

export function createTeamsService(config: TeamsConfig): TeamsService {
  return new TeamsService(config);
}
