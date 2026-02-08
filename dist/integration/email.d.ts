export interface EmailConfig {
    smtp: {
        host: string;
        port: number;
        secure: boolean;
        user: string;
        pass: string;
        from?: string;
    };
    imap?: {
        host: string;
        port: number;
        secure: boolean;
        user: string;
        pass: string;
    };
}
export interface EmailMessage {
    to: string | string[];
    cc?: string | string[];
    bcc?: string | string[];
    subject: string;
    text?: string;
    html?: string;
    attachments?: Array<{
        filename: string;
        content: Buffer | string;
        contentType?: string;
    }>;
    replyTo?: string;
}
export interface EmailSearchOptions {
    folder?: string;
    since?: Date;
    until?: Date;
    subject?: string;
    from?: string;
    to?: string;
    seen?: boolean;
    limit?: number;
}
export interface EmailInfo {
    uid: number;
    subject: string;
    from: string;
    to: string[];
    date: Date;
    seen: boolean;
    text?: string;
    html?: string;
    attachments: Array<{
        filename: string;
        size: number;
        contentType: string;
    }>;
}
export declare class EmailService {
    private transporter;
    private imapClient;
    private config;
    constructor(config: EmailConfig);
    private initTransporter;
    send(message: EmailMessage): Promise<{
        messageId: string;
    }>;
    sendTemplate(to: string | string[], subject: string, template: string, data: Record<string, any>): Promise<{
        messageId: string;
    }>;
    private renderTemplate;
    private stripHtml;
    private initImap;
    searchEmails(options: EmailSearchOptions): Promise<EmailInfo[]>;
    getEmail(uid: number, folder?: string): Promise<EmailInfo | null>;
    private parseBodyParts;
    markAsSeen(uid: number, folder?: string): Promise<void>;
    deleteEmail(uid: number, folder?: string): Promise<void>;
    createFolder(name: string, parent?: string): Promise<void>;
    listFolders(): Promise<string[]>;
    verifyConnection(): Promise<boolean>;
    disconnect(): Promise<void>;
}
export declare function createEmailService(config: EmailConfig): EmailService;
//# sourceMappingURL=email.d.ts.map