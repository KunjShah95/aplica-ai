export declare const githubOAuth: {
    getAuthUrl(): string;
    getTokens(code: string): Promise<any>;
    getUserInfo(accessToken: string): Promise<{
        provider: string;
        providerAccountId: string;
        email: any;
        name: any;
        avatar: any;
    }>;
};
export declare function handleGitHubOAuth(code: string): Promise<{
    user: import("../types.js").AuthUser;
    tokens: import("../types.js").AuthTokens;
}>;
//# sourceMappingURL=github.d.ts.map