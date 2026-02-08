import { JwtPayload } from 'jsonwebtoken';
export interface AuthConfig {
    jwtSecret: string;
    jwtExpiresIn?: string;
    refreshSecret: string;
    refreshExpiresIn?: string;
    bcryptRounds?: number;
}
export interface TokenPayload {
    userId: string;
    email?: string;
    role?: string;
    permissions?: string[];
}
export interface AuthResult {
    accessToken: string;
    refreshToken: string;
    expiresIn: number;
    tokenType: string;
}
export interface RefreshResult {
    accessToken: string;
    expiresIn: number;
    tokenType: string;
}
export declare class AuthService {
    private config;
    constructor(config: AuthConfig);
    hashPassword(password: string): string;
    verifyPassword(password: string, storedHash: string): boolean;
    generateTokens(payload: TokenPayload): AuthResult;
    private parseExpiresIn;
    verifyAccessToken(token: string): JwtPayload | null;
    verifyRefreshToken(token: string): {
        valid: boolean;
        userId?: string;
    };
    refreshAccessToken(refreshToken: string): RefreshResult | null;
    generateApiKey(prefix?: string): string;
    hashApiKey(apiKey: string): string;
    validateApiKey(apiKey: string, hashedKey: string): boolean;
    extractTokenFromHeader(authHeader: string | undefined): string | null;
    generateSecureToken(length?: number): string;
    generateOtp(length?: number): string;
    verifyOtp(input: string, stored: string, window?: number): boolean;
    createOtpSession(otp: string): string;
    createPasswordResetToken(userId: string): string;
    verifyPasswordResetToken(token: string): {
        valid: boolean;
        userId?: string;
    };
    hasPermission(userPermissions: string[], requiredPermissions: string[]): boolean;
    hasAnyPermission(userPermissions: string[], requiredPermissions: string[]): boolean;
}
export declare function createAuthService(config: AuthConfig): AuthService;
//# sourceMappingURL=auth.d.ts.map