export interface ValidationRule {
    required?: boolean;
    type?: 'string' | 'number' | 'boolean' | 'array' | 'object' | 'email' | 'url' | 'date';
    minLength?: number;
    maxLength?: number;
    min?: number;
    max?: number;
    pattern?: RegExp;
    enum?: unknown[];
    custom?: (value: unknown) => boolean | string;
    items?: ValidationSchema;
}

export type ValidationSchema = Record<string, ValidationRule>;

export interface ValidationResult {
    valid: boolean;
    errors: ValidationError[];
}

export interface ValidationError {
    field: string;
    message: string;
    value?: unknown;
}

export function validate(
    data: Record<string, unknown>,
    schema: ValidationSchema
): ValidationResult {
    const errors: ValidationError[] = [];

    for (const [field, rule] of Object.entries(schema)) {
        const value = data[field];
        const fieldErrors = validateField(field, value, rule);
        errors.push(...fieldErrors);
    }

    return {
        valid: errors.length === 0,
        errors,
    };
}

function validateField(
    field: string,
    value: unknown,
    rule: ValidationRule
): ValidationError[] {
    const errors: ValidationError[] = [];

    if (rule.required && (value === undefined || value === null || value === '')) {
        errors.push({ field, message: `${field} is required`, value });
        return errors;
    }

    if (value === undefined || value === null) {
        return errors;
    }

    if (rule.type) {
        const typeValid = validateType(value, rule.type);
        if (!typeValid) {
            errors.push({ field, message: `${field} must be a valid ${rule.type}`, value });
            return errors;
        }
    }

    if (typeof value === 'string') {
        if (rule.minLength !== undefined && value.length < rule.minLength) {
            errors.push({
                field,
                message: `${field} must be at least ${rule.minLength} characters`,
                value
            });
        }
        if (rule.maxLength !== undefined && value.length > rule.maxLength) {
            errors.push({
                field,
                message: `${field} must be at most ${rule.maxLength} characters`,
                value
            });
        }
        if (rule.pattern && !rule.pattern.test(value)) {
            errors.push({ field, message: `${field} has invalid format`, value });
        }
    }

    if (typeof value === 'number') {
        if (rule.min !== undefined && value < rule.min) {
            errors.push({ field, message: `${field} must be at least ${rule.min}`, value });
        }
        if (rule.max !== undefined && value > rule.max) {
            errors.push({ field, message: `${field} must be at most ${rule.max}`, value });
        }
    }

    if (rule.enum && !rule.enum.includes(value)) {
        errors.push({
            field,
            message: `${field} must be one of: ${rule.enum.join(', ')}`,
            value
        });
    }

    if (Array.isArray(value) && rule.items) {
        value.forEach((item, index) => {
            const itemErrors = validateField(
                `${field}[${index}]`,
                item,
                rule.items as ValidationRule
            );
            errors.push(...itemErrors);
        });
    }

    if (rule.custom) {
        const result = rule.custom(value);
        if (result !== true) {
            errors.push({
                field,
                message: typeof result === 'string' ? result : `${field} is invalid`,
                value
            });
        }
    }

    return errors;
}

function validateType(value: unknown, type: string): boolean {
    switch (type) {
        case 'string':
            return typeof value === 'string';
        case 'number':
            return typeof value === 'number' && !isNaN(value);
        case 'boolean':
            return typeof value === 'boolean';
        case 'array':
            return Array.isArray(value);
        case 'object':
            return typeof value === 'object' && value !== null && !Array.isArray(value);
        case 'email':
            return typeof value === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
        case 'url':
            if (typeof value !== 'string') return false;
            try {
                new URL(value);
                return true;
            } catch {
                return false;
            }
        case 'date':
            if (value instanceof Date) return !isNaN(value.getTime());
            if (typeof value === 'string') return !isNaN(Date.parse(value));
            return false;
        default:
            return true;
    }
}

export const schemas = {
    register: {
        email: { required: true, type: 'email' as const },
        password: {
            required: true,
            type: 'string' as const,
            minLength: 8,
        },
        username: {
            required: true,
            type: 'string' as const,
            minLength: 3,
            maxLength: 30,
            pattern: /^[a-zA-Z0-9_-]+$/
        },
    },
    login: {
        email: { required: true, type: 'email' as const },
        password: { required: true, type: 'string' as const },
    },
    createConversation: {
        title: { type: 'string' as const, maxLength: 255 },
        workspaceId: { type: 'string' as const },
    },
    addMemory: {
        content: { required: true, type: 'string' as const, minLength: 1 },
        type: {
            required: true,
            enum: ['FACT', 'PREFERENCE', 'EXPERIENCE', 'SKILL', 'RELATIONSHIP', 'CONTEXT']
        },
        importance: { type: 'number' as const, min: 0, max: 1 },
        tags: { type: 'array' as const },
    },
    createTeam: {
        name: { required: true, type: 'string' as const, minLength: 1, maxLength: 100 },
        slug: {
            required: true,
            type: 'string' as const,
            minLength: 1,
            maxLength: 50,
            pattern: /^[a-z0-9-]+$/
        },
        description: { type: 'string' as const, maxLength: 500 },
    },
    createKnowledgeBase: {
        name: { required: true, type: 'string' as const, minLength: 1, maxLength: 100 },
        workspaceId: { required: true, type: 'string' as const },
        description: { type: 'string' as const, maxLength: 500 },
    },
    addDocument: {
        title: { required: true, type: 'string' as const, minLength: 1, maxLength: 255 },
        content: { required: true, type: 'string' as const, minLength: 1 },
        sourceType: { enum: ['TEXT', 'URL', 'FILE', 'API'] },
    },
    createWorkflow: {
        name: { required: true, type: 'string' as const, minLength: 1, maxLength: 100 },
        description: { type: 'string' as const, maxLength: 500 },
        triggers: { required: true, type: 'array' as const },
        steps: { required: true, type: 'array' as const },
    },
    createScheduledTask: {
        name: { required: true, type: 'string' as const, minLength: 1, maxLength: 100 },
        schedule: { required: true, type: 'object' as const },
    },
};

export function sanitizeInput(input: string | null | undefined): string {
    if (input == null) return '';
    return input
        .replace(/[<>]/g, '')
        .replace(/javascript:/gi, '')
        .replace(/on\w+=/gi, '')
        .trim();
}

export function sanitizeHTML(html: string): string {
    const allowedTags = new Set(['p', 'br', 'b', 'i', 'strong', 'em', 'a', 'ul', 'ol', 'li', 'code', 'pre']);
    // Attributes allowed on specific tags (strict allowlist)
    const allowedAttrs: Record<string, Set<string>> = {
        a: new Set(['href', 'title']),
    };

    const entityMap: Record<string, string> = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;',
    };

    // Escape all HTML entities first, then restore allowed tags with stripped attributes
    return html
        .replace(/[&<>"']/g, (char) => entityMap[char] ?? char)
        .replace(/&lt;(\/?)([\w-]+)([^]*?)&gt;/g, (match, slash, tagName, rawAttrs) => {
            const lowerTag = tagName.toLowerCase();
            if (allowedTags.has(lowerTag)) {
                const permittedAttrs = allowedAttrs[lowerTag];
                let safeAttrs = '';
                if (permittedAttrs && rawAttrs) {
                    // Only keep explicitly allowlisted attributes; filter out all others
                    const attrPattern = /\s+([\w-]+)\s*=\s*(?:&quot;([^&]*)&quot;|&#39;([^&]*)&#39;|(\S+))/gi;
                    let m: RegExpExecArray | null;
                    while ((m = attrPattern.exec(rawAttrs)) !== null) {
                        const attrName = m[1].toLowerCase();
                        const attrValue = m[2] ?? m[3] ?? m[4] ?? '';
                        if (
                            permittedAttrs.has(attrName) &&
                            !/^javascript:/i.test(attrValue)
                        ) {
                            safeAttrs += ` ${attrName}="&quot;${attrValue}&quot;"`;
                        }
                    }
                }
                return `<${slash}${lowerTag}${safeAttrs}>`;
            }
            return match;
        });
}

export function escapeSQL(value: string): string {
    return value.replace(/'/g, "''");
}
