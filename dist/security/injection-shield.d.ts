export interface InjectionFlag {
    id: string;
    userId: string;
    message: string;
    type: InjectionType;
    confidence: number;
    quarantined: boolean;
    timestamp: Date;
    metadata: Record<string, unknown>;
}
export type InjectionType = 'prompt_injection' | 'jailbreak' | 'system_prompt_override' | 'delimiter_escape' | 'role_play_manipulation' | 'indirect_injection';
export interface InjectionCheckResult {
    flagged: boolean;
    type?: InjectionType;
    confidence: number;
    reason?: string;
    sanitized?: string;
}
export declare class InjectionShield {
    private patterns;
    private quarantinedMessages;
    constructor();
    private initializePatterns;
    check(message: string): Promise<InjectionCheckResult>;
    private sanitize;
    quarantine(userId: string, message: string, type: InjectionType, confidence: number): Promise<InjectionFlag>;
    logAttempt(userId: string, message: string, result: InjectionCheckResult): Promise<void>;
    getQuarantined(): InjectionFlag[];
}
export declare const injectionShield: InjectionShield;
export declare class PIIScrubber {
    private patterns;
    constructor();
    private initializePatterns;
    scrub(text: string, options?: ScrubOptions): string;
    scrubWithContext(text: string): {
        scrubbed: string;
        entities: PIIEntity[];
    };
    logScrub(userId: string, original: string, entities: PIIEntity[]): Promise<void>;
}
export interface ScrubOptions {
    types?: string[];
    preserveFormat?: boolean;
}
export interface PIIEntity {
    type: string;
    value: string;
    start: number;
    end: number;
}
export declare const piiScrubber: PIIScrubber;
export declare class E2EEncryption {
    private userKeys;
    generateKeyPair(): {
        publicKey: string;
        privateKey: string;
    };
    deriveKey(password: string, salt: Buffer): Buffer;
    encrypt(plaintext: string, key: string): string;
    decrypt(ciphertext: string, key: string): string;
    storeKeyPair(userId: string, publicKey: string, encryptedPrivateKey: string): Promise<void>;
    getPublicKey(userId: string): string | undefined;
    encryptMemory(userId: string, content: string): Promise<string>;
    decryptMemory(userId: string, encrypted: string): Promise<string>;
}
export interface UserKeyPair {
    publicKey: string;
    encryptedPrivateKey: string;
    createdAt: Date;
}
export declare const e2eEncryption: E2EEncryption;
//# sourceMappingURL=injection-shield.d.ts.map