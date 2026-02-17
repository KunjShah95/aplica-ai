export interface TwoFactorSetupResult {
    secret: string;
    qrCode: string;
    backupCodes: string[];
}
export interface TwoFactorVerificationResult {
    valid: boolean;
    remainingAttempts?: number;
}
export declare class TwoFactorService {
    private readonly issuer;
    private readonly backupCodesCount;
    generateSecret(userId: string, email: string): Promise<TwoFactorSetupResult>;
    verifyToken(userId: string, token: string): Promise<TwoFactorVerificationResult>;
    verifyBackupCode(userId: string, code: string): Promise<TwoFactorVerificationResult>;
    disable(userId: string): Promise<void>;
    isEnabled(userId: string): Promise<boolean>;
    private generateBackupCodes;
}
export declare const twoFactorService: TwoFactorService;
//# sourceMappingURL=twofactor.d.ts.map