export interface EmailOptions {
    to: string | string[];
    subject: string;
    text?: string;
    html?: string;
    from?: string;
    replyTo?: string;
    cc?: string[];
    bcc?: string[];
    attachments?: {
        filename: string;
        content: Buffer | string;
        contentType?: string;
    }[];
}
export interface EmailResult {
    success: boolean;
    messageId?: string;
    error?: string;
}
export interface EmailProvider {
    send(options: EmailOptions): Promise<EmailResult>;
}
export declare class SMTPProvider implements EmailProvider {
    private host;
    private port;
    private user;
    private pass;
    private from;
    constructor(config: {
        host: string;
        port: number;
        user: string;
        pass: string;
        from: string;
    });
    send(options: EmailOptions): Promise<EmailResult>;
}
export declare class ResendProvider implements EmailProvider {
    private apiKey;
    private from;
    constructor(apiKey: string, from: string);
    send(options: EmailOptions): Promise<EmailResult>;
}
export declare class SendGridProvider implements EmailProvider {
    private apiKey;
    private from;
    constructor(apiKey: string, from: string);
    send(options: EmailOptions): Promise<EmailResult>;
}
export declare class EmailService {
    private provider;
    constructor(provider: EmailProvider);
    send(options: EmailOptions): Promise<EmailResult>;
    sendTemplate(to: string | string[], templateName: string, variables: Record<string, string>): Promise<EmailResult>;
    private getTemplate;
}
export declare function createEmailService(): EmailService | null;
export declare const emailService: EmailService | null;
//# sourceMappingURL=email.d.ts.map