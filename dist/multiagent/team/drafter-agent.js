import { randomUUID } from 'crypto';
import { Agent } from '../../core/agent.js';
/**
 * Drafter Agent - Content creation and drafting
 */
export class DrafterAgent extends Agent {
    draftHistory = [];
    templateLibrary = new Map();
    constructor(options) {
        super(options);
        this.initializeTemplates();
    }
    /**
     * Initialize default templates
     */
    initializeTemplates() {
        this.templateLibrary.set('email', `Subject: {subject}

Dear {recipient},

{body}

Best regards,
{signature}`);
        this.templateLibrary.set('report', `# {title}

## Executive Summary
{summary}

## Details
{details}

## Conclusion
{conclusion}`);
    }
    /**
     * Create a draft from a template
     */
    async createDraft(templateName, content, options) {
        const template = this.templateLibrary.get(templateName);
        if (!template) {
            throw new Error(`Unknown template: ${templateName}`);
        }
        const versions = options?.multipleVersions || 1;
        const drafts = [];
        for (let i = 0; i < versions; i++) {
            const version = String(i + 1);
            const draft = {
                id: randomUUID(),
                template: templateName,
                content: { ...content, version },
                rendered: this.renderTemplate(template, { ...content, version }),
                createdAt: new Date(),
            };
            drafts.push(draft);
        }
        this.draftHistory.push(...drafts.map((d) => ({ draft: d, version: 'draft' })));
        return { drafts };
    }
    /**
     * Render a template with content
     */
    renderTemplate(template, content) {
        return template.replace(/\{(\w+)\}/g, (_, key) => content[key] || `{${key}}`);
    }
    /**
     * Create an email draft
     */
    async createEmailDraft(subject, recipient, body, options) {
        const tonePrefix = options?.tone === 'casual' ? 'Hi' : options?.tone === 'friendly' ? 'Hello' : 'Dear';
        const signature = options?.tone === 'casual' ? 'Best' : options?.tone === 'friendly' ? 'Kind regards' : 'Sincerely';
        const draft = await this.createDraft('email', {
            subject,
            recipient,
            body,
            signature,
        });
        return draft;
    }
    /**
     * Create a report draft
     */
    async createReportDraft(title, summary, details, options) {
        const sections = options?.sections || ['introduction', 'findings', 'conclusion'];
        const draft = await this.createDraft('report', {
            title,
            summary,
            details: sections.map((s) => `## ${s.charAt(0).toUpperCase() + s.slice(1)}\n\n{${s}}`).join('\n\n'),
            conclusion: 'In conclusion...',
        });
        return draft;
    }
    /**
     * Register a custom template
     */
    registerTemplate(name, template) {
        this.templateLibrary.set(name, template);
    }
    /**
     * Get draft history
     */
    getHistory() {
        return this.draftHistory;
    }
    /**
     * Get template library
     */
    getTemplates() {
        return Array.from(this.templateLibrary.keys());
    }
}
/**
 * Factory function to create a drafter agent
 */
export function createDrafterAgent(options) {
    return new DrafterAgent(options);
}
//# sourceMappingURL=drafter-agent.js.map