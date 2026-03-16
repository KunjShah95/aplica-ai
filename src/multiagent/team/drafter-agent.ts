import { randomUUID } from 'crypto';
import { Agent } from '../../core/agent.js';
import { AgentOptions } from '../../core/agent.js';

/**
 * Drafter Agent - Content creation and drafting
 */
export class DrafterAgent extends Agent {
  private draftHistory: DraftRecord[] = [];
  private templateLibrary: Map<string, string> = new Map();

  constructor(options: AgentOptions) {
    super(options);
    this.initializeTemplates();
  }

  /**
   * Initialize default templates
   */
  private initializeTemplates(): void {
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
  async createDraft(
    templateName: string,
    content: Record<string, string>,
    options?: { multipleVersions?: number }
  ): Promise<DraftResult> {
    const template = this.templateLibrary.get(templateName);
    if (!template) {
      throw new Error(`Unknown template: ${templateName}`);
    }

    const versions = options?.multipleVersions || 1;
    const drafts: Draft[] = [];

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
  private renderTemplate(template: string, content: Record<string, string>): string {
    return template.replace(/\{(\w+)\}/g, (_, key) => content[key] || `{${key}}`);
  }

  /**
   * Create an email draft
   */
  async createEmailDraft(
    subject: string,
    recipient: string,
    body: string,
    options?: { tone?: 'professional' | 'casual' | 'friendly' }
  ): Promise<DraftResult> {
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
  async createReportDraft(
    title: string,
    summary: string,
    details: string,
    options?: { sections?: string[] }
  ): Promise<DraftResult> {
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
  registerTemplate(name: string, template: string): void {
    this.templateLibrary.set(name, template);
  }

  /**
   * Get draft history
   */
  getHistory(): DraftRecord[] {
    return this.draftHistory;
  }

  /**
   * Get template library
   */
  getTemplates(): string[] {
    return Array.from(this.templateLibrary.keys());
  }
}

export interface Draft {
  id: string;
  template: string;
  content: Record<string, string>;
  rendered: string;
  createdAt: Date;
}

export interface DraftResult {
  drafts: Draft[];
}

export interface DraftRecord {
  draft: Draft;
  version: string;
}

/**
 * Factory function to create a drafter agent
 */
export function createDrafterAgent(options: AgentOptions): DrafterAgent {
  return new DrafterAgent(options);
}
