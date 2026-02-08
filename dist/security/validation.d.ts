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
export declare function validate(data: Record<string, unknown>, schema: ValidationSchema): ValidationResult;
export declare const schemas: {
    register: {
        email: {
            required: boolean;
            type: "email";
        };
        password: {
            required: boolean;
            type: "string";
            minLength: number;
            custom: (v: unknown) => boolean | "Password must contain uppercase letter" | "Password must contain lowercase letter" | "Password must contain number";
        };
        username: {
            required: boolean;
            type: "string";
            minLength: number;
            maxLength: number;
            pattern: RegExp;
        };
    };
    login: {
        email: {
            required: boolean;
            type: "email";
        };
        password: {
            required: boolean;
            type: "string";
        };
    };
    createConversation: {
        title: {
            type: "string";
            maxLength: number;
        };
        workspaceId: {
            type: "string";
        };
    };
    addMemory: {
        content: {
            required: boolean;
            type: "string";
            minLength: number;
        };
        type: {
            required: boolean;
            enum: string[];
        };
        importance: {
            type: "number";
            min: number;
            max: number;
        };
        tags: {
            type: "array";
        };
    };
    createTeam: {
        name: {
            required: boolean;
            type: "string";
            minLength: number;
            maxLength: number;
        };
        slug: {
            required: boolean;
            type: "string";
            minLength: number;
            maxLength: number;
            pattern: RegExp;
        };
        description: {
            type: "string";
            maxLength: number;
        };
    };
    createKnowledgeBase: {
        name: {
            required: boolean;
            type: "string";
            minLength: number;
            maxLength: number;
        };
        workspaceId: {
            required: boolean;
            type: "string";
        };
        description: {
            type: "string";
            maxLength: number;
        };
    };
    addDocument: {
        title: {
            required: boolean;
            type: "string";
            minLength: number;
            maxLength: number;
        };
        content: {
            required: boolean;
            type: "string";
            minLength: number;
        };
        sourceType: {
            enum: string[];
        };
    };
    createWorkflow: {
        name: {
            required: boolean;
            type: "string";
            minLength: number;
            maxLength: number;
        };
        description: {
            type: "string";
            maxLength: number;
        };
        triggers: {
            required: boolean;
            type: "array";
        };
        steps: {
            required: boolean;
            type: "array";
        };
    };
    createScheduledTask: {
        name: {
            required: boolean;
            type: "string";
            minLength: number;
            maxLength: number;
        };
        schedule: {
            required: boolean;
            type: "object";
        };
    };
};
export declare function sanitizeInput(input: string): string;
export declare function sanitizeHTML(html: string): string;
export declare function escapeSQL(value: string): string;
//# sourceMappingURL=validation.d.ts.map