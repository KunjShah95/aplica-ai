export const manifest = {
    name: 'email',
    version: '1.0.0',
    description: 'Email automation skill for reading, drafting, and sending emails',
    triggers: [
        { type: 'keyword', value: 'send email', description: 'Send an email' },
        { type: 'keyword', value: 'draft email', description: 'Draft an email' },
        { type: 'keyword', value: 'read email', description: 'Read recent emails' },
        { type: 'keyword', value: 'check inbox', description: 'Check inbox' },
        { type: 'command', value: '/email', description: 'Email command' },
    ],
    parameters: [
        {
            name: 'action',
            type: 'string',
            required: true,
            description: 'Email action',
            enum: ['send', 'draft', 'read', 'list', 'search'],
        },
        { name: 'to', type: 'string', required: false, description: 'Recipient email' },
        { name: 'subject', type: 'string', required: false, description: 'Email subject' },
        { name: 'body', type: 'string', required: false, description: 'Email body' },
        { name: 'cc', type: 'array', required: false, description: 'CC recipients' },
        { name: 'bcc', type: 'array', required: false, description: 'BCC recipients' },
        { name: 'attachments', type: 'array', required: false, description: 'File paths to attach' },
        {
            name: 'folder',
            type: 'string',
            required: false,
            description: 'Email folder',
            default: 'inbox',
        },
        {
            name: 'limit',
            type: 'number',
            required: false,
            description: 'Max emails to return',
            default: 10,
        },
        { name: 'query', type: 'string', required: false, description: 'Search query' },
    ],
    permissions: ['email'],
    examples: [
        'send email to john@example.com about the meeting',
        'draft email to team about project update',
        'read last 5 emails',
        'search emails about invoice',
    ],
};
export class EmailSkill {
    manifest = manifest;
    mockEmails = new Map();
    async execute(context) {
        const { parameters } = context;
        const action = parameters.action;
        try {
            switch (action) {
                case 'send':
                    return await this.sendEmail(parameters);
                case 'draft':
                    return await this.draftEmail(parameters);
                case 'read':
                    return await this.readEmails(parameters, context.userId);
                case 'list':
                    return await this.listEmails(parameters, context.userId);
                case 'search':
                    return await this.searchEmails(parameters, context.userId);
                default:
                    return { success: false, output: `Unknown email action: ${action}` };
            }
        }
        catch (error) {
            return {
                success: false,
                output: `Email error: ${error instanceof Error ? error.message : String(error)}`,
            };
        }
    }
    async sendEmail(params) {
        const to = params.to;
        const subject = params.subject;
        const body = params.body;
        if (!to || !subject || !body) {
            return { success: false, output: 'To, subject, and body are required' };
        }
        const email = {
            id: Date.now().toString(),
            from: 'user@example.com',
            to,
            subject,
            body,
            date: new Date(),
            sent: true,
        };
        console.log(`Email sent to ${to}: ${subject}`);
        return {
            success: true,
            output: `Email sent to ${to}\nSubject: ${subject}\n\n${body}`,
            data: { email },
        };
    }
    async draftEmail(params) {
        const to = params.to;
        const subject = params.subject;
        const body = params.body;
        const draft = {
            id: Date.now().toString(),
            to: to || '',
            subject: subject || '',
            body: body || '',
            date: new Date(),
            status: 'draft',
        };
        console.log(`Email drafted: ${subject || '(no subject)'}`);
        return {
            success: true,
            output: `Draft saved:\nTo: ${to || '(no recipient)'}\nSubject: ${subject || '(no subject)'}\n\n${body || '(no body)'}`,
            data: { draft },
        };
    }
    async readEmails(params, userId) {
        const limit = params.limit || 5;
        const emails = this.getEmails(userId).slice(-limit);
        if (emails.length === 0) {
            return { success: true, output: 'No emails found', data: { emails: [] } };
        }
        const formatted = emails
            .map((e) => `[${e.date.toISOString()}] From: ${e.from}\nSubject: ${e.subject}\n${e.body.slice(0, 100)}...`)
            .join('\n---\n');
        return {
            success: true,
            output: `Found ${emails.length} email(s):\n\n${formatted}`,
            data: { emails },
        };
    }
    async listEmails(params, userId) {
        const folder = params.folder || 'inbox';
        const limit = params.limit || 20;
        const emails = this.getEmails(userId).slice(-limit);
        const summary = emails
            .map((e) => `• [${e.date.toLocaleDateString()}] ${e.from} - ${e.subject}`)
            .join('\n');
        return {
            success: true,
            output: `Emails in ${folder} (${emails.length}):\n${summary || 'No emails'}`,
            data: { emails, folder },
        };
    }
    async searchEmails(params, userId) {
        const query = params.query;
        if (!query) {
            return { success: false, output: 'Search query is required' };
        }
        const emails = this.getEmails(userId).filter((e) => e.subject.toLowerCase().includes(query.toLowerCase()) ||
            e.body.toLowerCase().includes(query.toLowerCase()) ||
            e.from.toLowerCase().includes(query.toLowerCase()));
        const formatted = emails
            .map((e) => `[${e.date.toISOString()}] ${e.from} - ${e.subject}`)
            .join('\n');
        return {
            success: true,
            output: `Found ${emails.length} email(s) matching "${query}":\n\n${formatted || 'No matches'}`,
            data: { emails, query },
        };
    }
    getEmails(userId) {
        if (!this.mockEmails.has(userId)) {
            this.mockEmails.set(userId, [
                {
                    id: '1',
                    from: 'alice@example.com',
                    to: 'user@example.com',
                    subject: 'Meeting Tomorrow',
                    body: 'Hi, just wanted to confirm our meeting tomorrow at 2pm.',
                    date: new Date(Date.now() - 3600000),
                },
                {
                    id: '2',
                    from: 'bob@example.com',
                    to: 'user@example.com',
                    subject: 'Project Update',
                    body: 'The project is on track. Latest version deployed to staging.',
                    date: new Date(Date.now() - 86400000),
                },
            ]);
        }
        return this.mockEmails.get(userId) || [];
    }
}
//# sourceMappingURL=email.js.map