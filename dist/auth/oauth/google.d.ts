export declare const googleOAuth: {
    getAuthUrl(): string;
    getTokens(code: string): Promise<import("google-auth-library").Credentials>;
    getUserInfo(accessToken: string): Promise<{
        provider: string;
        providerAccountId: string;
        email: string;
        name: string | undefined;
        avatar: string | undefined;
    }>;
};
export declare function handleGoogleOAuth(code: string): Promise<{
    user: import("../types.js").AuthUser;
    tokens: import("../types.js").AuthTokens;
}>;
//# sourceMappingURL=google.d.ts.map