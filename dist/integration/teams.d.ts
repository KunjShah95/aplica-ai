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
            user: {
                id: string;
                displayName?: string;
            };
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
export declare class TeamsService {
    private client;
    private config;
    constructor(config: TeamsConfig);
    private initClient;
    setAccessToken(token: string): void;
    getAuthUrl(scopes?: string[]): string;
    getTokenFromCode(code: string): Promise<string>;
    listTeams(): Promise<TeamsTeam[]>;
    getTeam(teamId: string): Promise<TeamsTeam>;
    listChannels(teamId: string): Promise<TeamsChannel[]>;
    getChannel(teamId: string, channelId: string): Promise<TeamsChannel>;
    sendMessage(teamId: string, channelId: string, message: TeamsMessage): Promise<string>;
    replyToMessage(teamId: string, channelId: string, messageId: string, message: TeamsMessage): Promise<string>;
    getMessage(teamId: string, channelId: string, messageId: string): Promise<any>;
    listMessages(teamId: string, channelId: string, options?: {
        top?: number;
        skip?: number;
    }): Promise<any[]>;
    createTeam(name: string, description?: string, visibility?: 'private' | 'public'): Promise<string>;
    createChannel(teamId: string, name: string, description?: string, membershipType?: 'standard' | 'private'): Promise<string>;
    addTeamMember(teamId: string, userEmail: string, role?: 'member' | 'owner'): Promise<void>;
    removeTeamMember(teamId: string, userId: string): Promise<void>;
    listTeamMembers(teamId: string): Promise<TeamsUser[]>;
    getUser(userId: string): Promise<TeamsUser>;
    searchUsers(query: string): Promise<TeamsUser[]>;
    uploadFile(teamId: string, channelId: string, fileName: string, content: Buffer | Blob, conversationId?: string): Promise<string>;
    createOnlineMeeting(subject: string, startDateTime: string, endDateTime: string, attendees: string[]): Promise<any>;
}
export declare function createTeamsService(config: TeamsConfig): TeamsService;
//# sourceMappingURL=teams.d.ts.map