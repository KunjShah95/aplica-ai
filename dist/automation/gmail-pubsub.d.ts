export interface GmailPubSubConfig {
    projectId: string;
    subscriptionId: string;
    topicId: string;
    credentials: {
        clientEmail: string;
        privateKey: string;
    };
    watchOptions: {
        labelFilter?: string;
        topicName?: string;
    };
}
export interface GmailMessage {
    id: string;
    threadId: string;
    labelIds: string[];
    snippet: string;
    body: {
        data?: string;
    };
    from?: {
        email: string;
        name?: string;
    };
    subject?: string;
    date?: string;
}
export declare class GmailPubSub {
    private config;
    private isRunning;
    private watchTimeout?;
    private emailBuffer;
    constructor(config: GmailPubSubConfig);
    start(): Promise<void>;
    stop(): Promise<void>;
    isActive(): boolean;
    private startWatch;
    private setupWatch;
    private scheduleWatchRefresh;
    private processEmailBuffer;
    handlePushNotification(message: Record<string, unknown>): Promise<void>;
    private fetchEmailDetails;
    private handleEmail;
    private parseGmailMessage;
    private extractHeaders;
    private getAccessToken;
    private createJWT;
    private base64UrlEncode;
    sendEmail(to: string, subject: string, body: string, options?: {
        cc?: string;
        bcc?: string;
        replyTo?: string;
        inReplyTo?: string;
        references?: string;
    }): Promise<string | null>;
    searchEmails(query: string, maxResults?: number): Promise<GmailMessage[]>;
}
export declare const createGmailPubSub: (config: GmailPubSubConfig) => GmailPubSub;
//# sourceMappingURL=gmail-pubsub.d.ts.map