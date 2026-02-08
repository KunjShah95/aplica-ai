export class SMTPProvider {
    host;
    port;
    user;
    pass;
    from;
    constructor(config) {
        this.host = config.host;
        this.port = config.port;
        this.user = config.user;
        this.pass = config.pass;
        this.from = config.from;
    }
    async send(options) {
        const nodemailer = await import('nodemailer');
        const transporter = nodemailer.createTransport({
            host: this.host,
            port: this.port,
            secure: this.port === 465,
            auth: {
                user: this.user,
                pass: this.pass,
            },
        });
        try {
            const result = await transporter.sendMail({
                from: options.from || this.from,
                to: Array.isArray(options.to) ? options.to.join(', ') : options.to,
                subject: options.subject,
                text: options.text,
                html: options.html,
                cc: options.cc?.join(', '),
                bcc: options.bcc?.join(', '),
                replyTo: options.replyTo,
                attachments: options.attachments?.map(a => ({
                    filename: a.filename,
                    content: a.content,
                    contentType: a.contentType,
                })),
            });
            return {
                success: true,
                messageId: result.messageId,
            };
        }
        catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : String(error),
            };
        }
    }
}
export class ResendProvider {
    apiKey;
    from;
    constructor(apiKey, from) {
        this.apiKey = apiKey;
        this.from = from;
    }
    async send(options) {
        try {
            const response = await fetch('https://api.resend.com/emails', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.apiKey}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    from: options.from || this.from,
                    to: Array.isArray(options.to) ? options.to : [options.to],
                    subject: options.subject,
                    text: options.text,
                    html: options.html,
                    cc: options.cc,
                    bcc: options.bcc,
                    reply_to: options.replyTo,
                }),
            });
            if (!response.ok) {
                const error = await response.text();
                return { success: false, error };
            }
            const data = await response.json();
            return { success: true, messageId: data.id };
        }
        catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : String(error),
            };
        }
    }
}
export class SendGridProvider {
    apiKey;
    from;
    constructor(apiKey, from) {
        this.apiKey = apiKey;
        this.from = from;
    }
    async send(options) {
        try {
            const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.apiKey}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    personalizations: [{
                            to: (Array.isArray(options.to) ? options.to : [options.to]).map(email => ({ email })),
                            cc: options.cc?.map(email => ({ email })),
                            bcc: options.bcc?.map(email => ({ email })),
                        }],
                    from: { email: options.from || this.from },
                    reply_to: options.replyTo ? { email: options.replyTo } : undefined,
                    subject: options.subject,
                    content: [
                        options.text ? { type: 'text/plain', value: options.text } : null,
                        options.html ? { type: 'text/html', value: options.html } : null,
                    ].filter(Boolean),
                }),
            });
            if (!response.ok) {
                const error = await response.text();
                return { success: false, error };
            }
            const messageId = response.headers.get('x-message-id') || undefined;
            return { success: true, messageId };
        }
        catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : String(error),
            };
        }
    }
}
export class EmailService {
    provider;
    constructor(provider) {
        this.provider = provider;
    }
    async send(options) {
        return this.provider.send(options);
    }
    async sendTemplate(to, templateName, variables) {
        const template = await this.getTemplate(templateName);
        let subject = template.subject;
        let html = template.html;
        let text = template.text;
        for (const [key, value] of Object.entries(variables)) {
            const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
            subject = subject.replace(regex, value);
            html = html?.replace(regex, value);
            text = text?.replace(regex, value);
        }
        return this.send({ to, subject, html, text });
    }
    async getTemplate(name) {
        const templates = {
            welcome: {
                subject: 'Welcome to Alpicia, {{name}}!',
                html: `
          <h1>Welcome, {{name}}!</h1>
          <p>Thank you for joining Alpicia. We're excited to have you!</p>
          <p>Get started by exploring our features.</p>
        `,
                text: 'Welcome, {{name}}! Thank you for joining Alpicia.',
            },
            passwordReset: {
                subject: 'Reset Your Password',
                html: `
          <h1>Password Reset Request</h1>
          <p>Click the link below to reset your password:</p>
          <a href="{{resetLink}}">Reset Password</a>
          <p>This link expires in 1 hour.</p>
        `,
                text: 'Reset your password: {{resetLink}}',
            },
            notification: {
                subject: '{{title}}',
                html: `
          <h2>{{title}}</h2>
          <p>{{message}}</p>
        `,
                text: '{{title}}: {{message}}',
            },
        };
        return templates[name] || templates.notification;
    }
}
export function createEmailService() {
    const smtpHost = process.env.SMTP_HOST;
    const resendKey = process.env.RESEND_API_KEY;
    const sendgridKey = process.env.SENDGRID_API_KEY;
    const fromEmail = process.env.EMAIL_FROM || 'noreply@alpicia.app';
    if (resendKey) {
        return new EmailService(new ResendProvider(resendKey, fromEmail));
    }
    if (sendgridKey) {
        return new EmailService(new SendGridProvider(sendgridKey, fromEmail));
    }
    if (smtpHost) {
        return new EmailService(new SMTPProvider({
            host: smtpHost,
            port: parseInt(process.env.SMTP_PORT || '587'),
            user: process.env.SMTP_USER || '',
            pass: process.env.SMTP_PASS || '',
            from: fromEmail,
        }));
    }
    return null;
}
export const emailService = createEmailService();
//# sourceMappingURL=email.js.map