import { randomUUID } from 'crypto';

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

export class PromptManager {
  private templates: Map<string, PromptTemplate> = new Map();
  private categories: Map<string, Set<string>> = new Map();

  constructor() {
    this.initializeDefaultTemplates();
  }

  private initializeDefaultTemplates(): void {
    const defaultTemplates: PromptTemplate[] = [
      {
        id: 'system-default',
        name: 'System Default',
        description: 'Default system prompt for the agent',
        content: `# Identity
You are {{identity.displayName}}, {{identity.bio}}.

{{identity.tagline}}

## Personality
Traits: {{soul.personality.traits}}
Tone: {{soul.personality.defaultTone}}

## Values
{{soul.personality.values}}

## Boundaries
{{soul.personality.boundaries}}

## Capabilities
You have access to execution capabilities that allow you to:
- Execute shell commands (limited to safe operations)
- Read, write, and manage files
- Automate browser interactions
- Run sandboxed code execution

## Execution Security
- Shell commands are filtered against allowed/blocked lists
- File operations are restricted to configured paths
- Browser automation is available for web tasks
- Sandboxed execution isolates untrusted code

## Current Context
- User: {{user.name}}
- Timezone: {{identity.timezone}}
{{#identity.availability.enabled}}
- Availability: {{identity.availability.defaultHours}}
{{/identity.availability.enabled}}

You are helpful, precise, and proactive. You provide clear and concise responses while respecting user preferences and privacy.`,
        variables: [
          'identity.displayName',
          'identity.bio',
          'identity.tagline',
          'soul.personality.traits',
          'soul.personality.defaultTone',
          'soul.personality.values',
          'soul.personality.boundaries',
          'user.name',
          'identity.timezone',
          'identity.availability.enabled',
          'identity.availability.defaultHours',
        ],
        version: 1,
        createdAt: new Date(),
        modifiedAt: new Date(),
        category: 'system',
      },
      {
        id: 'code-review',
        name: 'Code Review',
        description: 'System prompt for code review tasks',
        content: `You are an expert code reviewer. Your task is to analyze the provided code and provide constructive feedback.

## Review Guidelines
1. Identify potential bugs and security vulnerabilities
2. Suggest performance optimizations
3. Check for code quality and best practices
4. Evaluate code readability and maintainability
5. Look for test coverage gaps

## Output Format
Provide your review in the following format:
- **Issues Found**: List of issues with severity (High/Medium/Low)
- **Recommendations**: Suggested improvements
- **Positive Aspects**: What the code does well

Please review the following code:
{{code}}

Context: {{context}}`,
        variables: ['code', 'context'],
        version: 1,
        createdAt: new Date(),
        modifiedAt: new Date(),
        category: 'development',
        tags: ['code-review', 'development'],
      },
      {
        id: 'debug-assistant',
        name: 'Debug Assistant',
        description: 'System prompt for debugging tasks',
        content: `You are a debugging assistant. Your goal is to help identify and fix issues in the provided code.

## Debugging Approach
1. Analyze the error message and stack trace
2. Identify the root cause of the issue
3. Suggest potential fixes with explanations
4. Provide preventive measures

## Current Error
{{error}}

## Problematic Code
\`\`\`
{{code}}
\`\`\`

## Context
{{context}}

Please help debug this issue.`,
        variables: ['error', 'code', 'context'],
        version: 1,
        createdAt: new Date(),
        modifiedAt: new Date(),
        category: 'development',
        tags: ['debugging', 'development'],
      },
      {
        id: 'data-analysis',
        name: 'Data Analysis',
        description: 'System prompt for data analysis tasks',
        content: `You are a data analysis expert. Your task is to analyze and interpret the provided data.

## Analysis Guidelines
1. Understand the data structure and patterns
2. Identify trends and correlations
3. Provide statistical insights
4. Suggest visualizations if applicable
5. Draw actionable conclusions

## Data to Analyze
{{data}}

## Questions to Answer
{{questions}}

Please provide a comprehensive analysis.`,
        variables: ['data', 'questions'],
        version: 1,
        createdAt: new Date(),
        modifiedAt: new Date(),
        category: 'analytics',
        tags: ['data', 'analysis'],
      },
      {
        id: 'documentation',
        name: 'Documentation Generator',
        description: 'System prompt for generating documentation',
        content: `You are a technical documentation writer. Your task is to create clear, comprehensive documentation.

## Documentation Guidelines
1. Use clear, concise language
2. Include code examples where appropriate
3. Explain complex concepts simply
4. Follow documentation best practices

## Item to Document
{{item}}

## Documentation Type
{{docType}}

Please generate appropriate documentation.`,
        variables: ['item', 'docType'],
        version: 1,
        createdAt: new Date(),
        modifiedAt: new Date(),
        category: 'documentation',
        tags: ['docs', 'documentation'],
      },
    ];

    for (const template of defaultTemplates) {
      this.templates.set(template.id, template);
    }
  }

  createTemplate(
    template: Omit<PromptTemplate, 'id' | 'createdAt' | 'modifiedAt' | 'version'>
  ): PromptTemplate {
    const newTemplate: PromptTemplate = {
      ...template,
      id: randomUUID(),
      version: 1,
      createdAt: new Date(),
      modifiedAt: new Date(),
    };

    this.templates.set(newTemplate.id, newTemplate);

    if (template.category) {
      const categoryTemplates = this.categories.get(template.category) || new Set();
      categoryTemplates.add(newTemplate.id);
      this.categories.set(template.category, categoryTemplates);
    }

    return newTemplate;
  }

  updateTemplate(
    id: string,
    updates: Partial<Omit<PromptTemplate, 'id' | 'createdAt'>>
  ): PromptTemplate | null {
    const template = this.templates.get(id);
    if (!template) return null;

    const updatedTemplate: PromptTemplate = {
      ...template,
      ...updates,
      version: template.version + 1,
      modifiedAt: new Date(),
    };

    this.templates.set(id, updatedTemplate);
    return updatedTemplate;
  }

  deleteTemplate(id: string): boolean {
    const template = this.templates.get(id);
    if (!template) return false;

    if (template.category) {
      const categoryTemplates = this.categories.get(template.category);
      categoryTemplates?.delete(id);
    }

    return this.templates.delete(id);
  }

  getTemplate(id: string): PromptTemplate | undefined {
    return this.templates.get(id);
  }

  getTemplateByName(name: string): PromptTemplate | undefined {
    return Array.from(this.templates.values()).find((t) => t.name === name);
  }

  listTemplates(options?: { category?: string; tags?: string[] }): PromptTemplate[] {
    let templates = Array.from(this.templates.values());

    if (options?.category) {
      templates = templates.filter((t) => t.category === options.category);
    }

    if (options?.tags?.length) {
      templates = templates.filter((t) => t.tags?.some((tag) => options.tags?.includes(tag)));
    }

    return templates;
  }

  listCategories(): string[] {
    return Array.from(this.categories.keys());
  }

  generatePrompt(options: PromptGenerationOptions): string {
    if (options.templateId || options.templateName) {
      const template = options.templateId
        ? this.getTemplate(options.templateId)
        : this.getTemplateByName(options.templateName!);

      if (!template) {
        throw new Error(`Template not found: ${options.templateId || options.templateName}`);
      }

      return this.applyVariables(template.content, options.variables);
    }

    if (options.systemPrompt && options.userPrompt) {
      return `${options.systemPrompt}\n\nUser: ${options.userPrompt}`;
    }

    if (options.systemPrompt) {
      return options.systemPrompt;
    }

    throw new Error('Either template or systemPrompt must be provided');
  }

  applyVariables(content: string, variables?: PromptVariable[]): string {
    if (!variables) return content;

    let result = content;

    for (const variable of variables) {
      const regex = new RegExp(`{{${variable.name}}}`, 'g');
      result = result.replace(regex, variable.value);
    }

    const remainingVars = result.match(/{{[^}]+}}/g);
    if (remainingVars) {
      console.warn(`Unresolved variables: ${remainingVars.join(', ')}`);
    }

    result = this.handleConditionals(result);

    return result;
  }

  private handleConditionals(content: string): string {
    const conditionalRegex = /{{#(\w+(?:\.\w+)*)}}([\s\S]*?){{\/\1}}/g;

    return content.replace(conditionalRegex, (match, condition, body) => {
      const value = this.getNestedValue(condition, {});
      return value ? body.trim() : '';
    });
  }

  private getNestedValue(path: string, context: Record<string, unknown>): unknown {
    const parts = path.split('.');
    let value: unknown = context;

    for (const part of parts) {
      if (value && typeof value === 'object') {
        value = (value as Record<string, unknown>)[part];
      } else {
        return undefined;
      }
    }

    return value;
  }

  validateTemplate(id: string): { valid: boolean; errors: string[] } {
    const template = this.templates.get(id);
    if (!template) {
      return { valid: false, errors: ['Template not found'] };
    }

    const errors: string[] = [];

    if (!template.name?.trim()) {
      errors.push('Template name is required');
    }

    if (!template.content?.trim()) {
      errors.push('Template content is required');
    }

    const varRegex = /{{([^}]+)}}/g;
    const foundVariables: string[] = [];
    let match;
    while ((match = varRegex.exec(template.content)) !== null) {
      const varName = match[1].trim();
      if (!varName.startsWith('#') && !varName.startsWith('/')) {
        foundVariables.push(varName);
      }
    }

    const undefinedVars = foundVariables.filter(
      (v) => !template.variables.some((tv) => tv === v || tv === v.split('.')[0])
    );

    if (undefinedVars.length > 0) {
      errors.push(`Undefined variables: ${undefinedVars.join(', ')}`);
    }

    return { valid: errors.length === 0, errors };
  }

  cloneTemplate(id: string, newName: string): PromptTemplate | null {
    const template = this.templates.get(id);
    if (!template) return null;

    return this.createTemplate({
      ...template,
      name: newName,
      description: template.description ? `Cloned from ${template.name}` : undefined,
    });
  }

  exportTemplates(ids?: string[]): string {
    const templates = ids
      ? ids.map((id) => this.templates.get(id)).filter((t): t is PromptTemplate => t !== undefined)
      : Array.from(this.templates.values());

    return JSON.stringify(templates, null, 2);
  }

  importTemplates(json: string): number {
    try {
      const templates = JSON.parse(json) as PromptTemplate[];
      let imported = 0;

      for (const template of templates) {
        if (template.id && template.name && template.content) {
          this.templates.set(template.id, {
            ...template,
            id: template.id || randomUUID(),
            createdAt: new Date(template.createdAt),
            modifiedAt: new Date(template.modifiedAt),
          });
          imported++;
        }
      }

      return imported;
    } catch (error) {
      throw new Error(
        `Failed to import templates: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }
}

export const promptManager = new PromptManager();
