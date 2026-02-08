export declare function hashPassword(password: string): Promise<string>;
export declare function verifyPassword(password: string, hash: string): Promise<boolean>;
export declare function generateApiKey(): string;
export declare function hashApiKey(key: string): string;
export declare function getApiKeyPrefix(key: string): string;
export declare function generateToken(length?: number): string;
export declare function generateShareToken(): string;
//# sourceMappingURL=password.d.ts.map