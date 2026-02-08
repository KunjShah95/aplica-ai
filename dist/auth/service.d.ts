import { AuthUser, AuthTokens, LoginCredentials, RegisterData, OAuthProfile, ApiKeyData, CreateApiKeyData, ApiKeyResult } from './types.js';
export declare class AuthService {
    register(data: RegisterData): Promise<{
        user: AuthUser;
        tokens: AuthTokens;
    }>;
    login(credentials: LoginCredentials): Promise<{
        user: AuthUser;
        tokens: AuthTokens;
    }>;
    logout(token: string): Promise<void>;
    logoutAll(userId: string): Promise<void>;
    refreshTokens(refreshToken: string): Promise<AuthTokens>;
    validateToken(token: string): Promise<AuthUser | null>;
    oauthLogin(profile: OAuthProfile): Promise<{
        user: AuthUser;
        tokens: AuthTokens;
    }>;
    createApiKey(userId: string, data: CreateApiKeyData): Promise<ApiKeyResult>;
    validateApiKey(key: string): Promise<{
        userId: string;
        scopes: string[];
    } | null>;
    listApiKeys(userId: string): Promise<ApiKeyData[]>;
    revokeApiKey(userId: string, keyId: string): Promise<void>;
    getUser(userId: string): Promise<AuthUser | null>;
    updateUser(userId: string, data: Partial<{
        displayName: string;
        avatar: string;
        bio: string;
        timezone: string;
    }>): Promise<AuthUser>;
    changePassword(userId: string, currentPassword: string, newPassword: string): Promise<void>;
}
export declare const authService: AuthService;
//# sourceMappingURL=service.d.ts.map