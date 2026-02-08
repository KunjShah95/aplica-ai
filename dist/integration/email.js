import nodemailer from 'nodemailer';
import { ImapFlow } from 'imapflow';
export class EmailService {
    transporter = null;
    imapClient = null;
    config;
    constructor(config) {
        this.config = config;
        this.initTransporter();
    }
    initTransporter() {
        this.transporter = nodemailer.createTransport({
            host: this.config.smtp.host,
            port: this.config.smtp.port,
            secure: this.config.smtp.secure,
            auth: {
                user: this.config.smtp.user,
                pass: this.config.smtp.pass,
            },
        });
    }
    async send(message) {
        if (!this.transporter)
            throw new Error('SMTP not configured');
        const to = Array.isArray(message.to) ? message.to.join(', ') : message.to;
        const cc = message.cc
            ? Array.isArray(message.cc)
                ? message.cc.join(', ')
                : message.cc
            : undefined;
        const bcc = message.bcc
            ? Array.isArray(message.bcc)
                ? message.bcc.join(', ')
                : message.bcc
            : undefined;
        const options = {
            from: this.config.smtp.from || this.config.smtp.user,
            to,
            cc,
            bcc,
            subject: message.subject,
            text: message.text,
            html: message.html,
            attachments: message.attachments?.map((att) => ({
                filename: att.filename,
                content: att.content,
                contentType: att.contentType,
            })),
            replyTo: message.replyTo,
        };
        const result = await this.transporter.sendMail(options);
        return { messageId: result.messageId || '' };
    }
    async sendTemplate(to, subject, template, data) {
        const html = this.renderTemplate(template, data);
        const text = this.stripHtml(html);
        return this.send({
            to,
            subject,
            html,
            text,
        });
    }
    renderTemplate(template, data) {
        let result = template;
        for (const [key, value] of Object.entries(data)) {
            result = result.replace(new RegExp(`{{${key}}}`, 'g'), String(value));
        }
        return result;
    }
    stripHtml(html) {
        return html
            .replace(/<[^>]*>/g, ' ')
            .replace(/\s+/g, ' ')
            .trim();
    }
    async initImap() {
        if (!this.config.imap || this.imapClient)
            return;
        this.imapClient = new ImapFlow({
            host: this.config.imap.host,
            port: this.config.imap.port,
            secure: this.config.imap.secure,
            auth: {
                user: this.config.imap.user,
                pass: this.config.imap.pass,
            },
        });
        await this.imapClient.connect();
    }
    async searchEmails(options) {
        await this.initImap();
        if (!this.imapClient)
            throw new Error('IMAP not configured');
        const folder = options.folder || 'INBOX';
        const lock = await this.imapClient.getMailboxLock(folder);
        try {
            const search = {};
            if (options.since)
                search.since = options.since;
            if (options.until)
                search.until = options.until;
            if (options.subject)
                search.subject = options.subject;
            if (options.from)
                search.from = options.from;
            if (options.to)
                search.to = options.to;
            if (options.seen !== undefined)
                search.seen = options.seen;
            const messages = (await this.imapClient.search(search, { uid: true }));
            const results = [];
            for (const uid of messages) {
                const msg = await this.imapClient.fetchOne(uid, {
                    envelope: true,
                    flags: true,
                    bodyStructure: true,
                });
                if (!msg || msg === false)
                    continue;
                const msgData = msg;
                results.push({
                    uid: uid,
                    subject: msgData.envelope?.subject || '',
                    from: msgData.envelope?.from?.[0]?.address || '',
                    to: msgData.envelope?.to?.map((t) => t.address || '') || [],
                    date: msgData.envelope?.date || new Date(),
                    seen: Array.from(msgData.flags || []).includes('\\Seen') || false,
                    attachments: [],
                });
            }
            return results;
        }
        finally {
            lock.release();
        }
    }
    async getEmail(uid, folder = 'INBOX') {
        await this.initImap();
        if (!this.imapClient)
            throw new Error('IMAP not configured');
        const lock = await this.imapClient.getMailboxLock(folder);
        try {
            const msg = (await this.imapClient.fetchOne(uid, {
                envelope: true,
                flags: true,
                bodyStructure: true,
                source: true,
            }));
            if (!msg)
                return null;
            const textParts = [];
            const htmlParts = [];
            const attachments = [];
            if (msg.bodyStructure) {
                this.parseBodyParts(msg.bodyStructure, textParts, htmlParts, attachments);
            }
            return {
                uid: uid,
                subject: msg.envelope?.subject || '',
                from: msg.envelope?.from?.[0]?.address || '',
                to: msg.envelope?.to?.map((t) => t.address || '') || [],
                date: msg.envelope?.date || new Date(),
                seen: Array.from(msg.flags || []).includes('\\Seen') || false,
                text: textParts.join('\n'),
                html: htmlParts.join('\n'),
                attachments,
            };
        }
        finally {
            lock.release();
        }
    }
    parseBodyParts(part, textParts, htmlParts, attachments) {
        if (part.type === 'text') {
            if (part.subtype === 'plain') {
                textParts.push(part.partId || '');
            }
            else if (part.subtype === 'html') {
                htmlParts.push(part.partId || '');
            }
        }
        if (part.disposition === 'attachment') {
            attachments.push({
                filename: part.filename || 'unknown',
                size: part.size || 0,
                contentType: part.type || 'application/octet-stream',
            });
        }
        if (part.childNodes) {
            for (const child of part.childNodes) {
                this.parseBodyParts(child, textParts, htmlParts, attachments);
            }
        }
    }
    async markAsSeen(uid, folder = 'INBOX') {
        await this.initImap();
        if (!this.imapClient)
            throw new Error('IMAP not configured');
        await this.imapClient.messageAddFlags(folder, uid, ['\\Seen']);
    }
    async deleteEmail(uid, folder = 'INBOX') {
        await this.initImap();
        if (!this.imapClient)
            throw new Error('IMAP not configured');
        await this.imapClient.messageDelete(folder, uid);
    }
    async createFolder(name, parent) {
        await this.initImap();
        if (!this.imapClient)
            throw new Error('IMAP not configured');
        const fullName = parent ? `${parent}/${name}` : name;
        await this.imapClient.folderCreate(fullName);
    }
    async listFolders() {
        await this.initImap();
        if (!this.imapClient)
            throw new Error('IMAP not configured');
        const folders = await this.imapClient.list();
        return folders.map((f) => f.path);
    }
    async verifyConnection() {
        try {
            if (this.transporter) {
                await this.transporter.verify();
            }
            if (this.imapClient) {
                await this.imapClient.noop();
            }
            return true;
        }
        catch {
            return false;
        }
    }
    async disconnect() {
        if (this.imapClient) {
            await this.imapClient.logout();
            this.imapClient = null;
        }
    }
}
export function createEmailService(config) {
    return new EmailService(config);
}
//# sourceMappingURL=email.js.map