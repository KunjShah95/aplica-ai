import { Agent } from '../../core/agent.js';
import { AgentOptions } from '../../core/agent.js';
/**
 * Drafter Agent - Content creation and drafting
 */
export declare class DrafterAgent extends Agent {
    private draftHistory;
    private templateLibrary;
    constructor(options: AgentOptions);
    /**
     * Initialize default templates
     */
    private initializeTemplates;
    /**
     * Create a draft from a template
     */
    createDraft(templateName: string, content: Record<string, string>, options?: {
        multipleVersions?: number;
    }): Promise<DraftResult>;
    /**
     * Render a template with content
     */
    private renderTemplate;
    /**
     * Create an email draft
     */
    createEmailDraft(subject: string, recipient: string, body: string, options?: {
        tone?: 'professional' | 'casual' | 'friendly';
    }): Promise<DraftResult>;
    /**
     * Create a report draft
     */
    createReportDraft(title: string, summary: string, details: string, options?: {
        sections?: string[];
    }): Promise<DraftResult>;
    /**
     * Register a custom template
     */
    registerTemplate(name: string, template: string): void;
    /**
     * Get draft history
     */
    getHistory(): DraftRecord[];
    /**
     * Get template library
     */
    getTemplates(): string[];
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
export declare function createDrafterAgent(options: AgentOptions): DrafterAgent;
//# sourceMappingURL=drafter-agent.d.ts.map