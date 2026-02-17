export declare const discordOAuth: {
    getAuthUrl(): string;
    getTokens(code: string): Promise<any>;
    getUserInfo(accessToken: string): Promise<{
        provider: string;
        providerAccountId: string;
        email: any;
        name: any;
        avatar: string | undefined;
    }>;
};
export declare function handleDiscordOAuth(code: string): Promise<{
    user: import("../types.js").AuthUser;
    tokens: import("../types.js").AuthTokens;
}>;
//# sourceMappingURL=discord.d.ts.map