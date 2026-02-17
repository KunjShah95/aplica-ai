export declare function sanitizeInput(input: string): string;
export declare function sanitizeHtml(input: string): string;
export declare function isValidEmail(email: string): boolean;
export declare function isValidUsername(username: string): boolean;
export declare function isValidPassword(password: string): boolean;
export declare function isValidUuid(uuid: string): boolean;
export declare function isValidApiKey(key: string): boolean;
export interface ValidationResult {
    valid: boolean;
    errors: string[];
}
export declare function validateRegistration(data: {
    email?: unknown;
    username?: unknown;
    password?: unknown;
    displayName?: unknown;
}): ValidationResult;
export declare function validateLogin(data: {
    email?: unknown;
    password?: unknown;
}): ValidationResult;
export declare function validateMessage(data: {
    role?: unknown;
    content?: unknown;
}): ValidationResult;
export declare function validateSearchQuery(data: {
    q?: unknown;
    limit?: unknown;
}): ValidationResult;
export declare function validateApiKeyInput(data: {
    name?: unknown;
    scopes?: unknown;
}): ValidationResult;
export declare function validateTeamInput(data: {
    name?: unknown;
    slug?: unknown;
    description?: unknown;
}): ValidationResult;
//# sourceMappingURL=validation.d.ts.map