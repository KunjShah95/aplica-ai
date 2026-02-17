export interface PromptTemplate {
    id: string;
    name: string;
    description?: string;
    content: string;
    variables: string[];
    version: number;
    createdAt: Date;
    modifiedAt: Date;
    category?: string;
    tags?: string[];
}
export interface PromptVariable {
    name: string;
    value: string;
    description?: string;
}
export interface PromptGenerationOptions {
    templateId?: string;
    templateName?: string;
    variables?: PromptVariable[];
    systemPrompt?: string;
    userPrompt?: string;
}
export declare class PromptManager {
    private templates;
    private categories;
    constructor();
    private initializeDefaultTemplates;
    createTemplate(template: Omit<PromptTemplate, 'id' | 'createdAt' | 'modifiedAt' | 'version'>): PromptTemplate;
    updateTemplate(id: string, updates: Partial<Omit<PromptTemplate, 'id' | 'createdAt'>>): PromptTemplate | null;
    deleteTemplate(id: string): boolean;
    getTemplate(id: string): PromptTemplate | undefined;
    getTemplateByName(name: string): PromptTemplate | undefined;
    listTemplates(options?: {
        category?: string;
        tags?: string[];
    }): PromptTemplate[];
    listCategories(): string[];
    generatePrompt(options: PromptGenerationOptions): string;
    applyVariables(content: string, variables?: PromptVariable[]): string;
    private handleConditionals;
    private getNestedValue;
    validateTemplate(id: string): {
        valid: boolean;
        errors: string[];
    };
    cloneTemplate(id: string, newName: string): PromptTemplate | null;
    exportTemplates(ids?: string[]): string;
    importTemplates(json: string): number;
}
export declare const promptManager: PromptManager;
//# sourceMappingURL=prompt-manager.d.ts.map