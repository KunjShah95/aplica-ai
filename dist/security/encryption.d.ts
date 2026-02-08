export interface EncryptedData {
    encrypted: string;
    iv: string;
    salt: string;
    tag: string;
}
export declare class Encryption {
    private masterKey;
    constructor(masterKey?: string);
    encrypt(data: string): Promise<string>;
    decrypt(encryptedString: string): Promise<string>;
    encryptObject<T>(obj: T): Promise<string>;
    decryptObject<T>(encryptedString: string): Promise<T>;
    private deriveKey;
    static generateKey(): string;
}
export declare class SecureStorage {
    private encryption;
    private storage;
    constructor(masterKey?: string);
    set(key: string, value: unknown): Promise<void>;
    get<T>(key: string): Promise<T | null>;
    delete(key: string): Promise<boolean>;
    has(key: string): boolean;
    keys(): string[];
}
export declare function maskSensitiveData(data: string, visibleStart?: number, visibleEnd?: number, maskChar?: string): string;
export declare function maskEmail(email: string): string;
export declare function maskApiKey(key: string): string;
export declare function sanitizeHeaders(headers: Record<string, string | string[] | undefined>): Record<string, string>;
export declare function sanitizeLogData<T extends Record<string, unknown>>(data: T, sensitiveKeys?: string[]): T;
export declare const encryption: Encryption;
export declare const secureStorage: SecureStorage;
//# sourceMappingURL=encryption.d.ts.map