import { AppConfig } from './types';
export declare class ConfigLoader {
    private config;
    load(): Promise<AppConfig>;
    private loadSoulConfig;
    private loadIdentityConfig;
    private loadUserContext;
    private loadLLMConfig;
    private loadMessagingConfig;
    private loadMemoryConfig;
    private loadSecurityConfig;
    private extractFrontmatter;
    private getDefaultIdentity;
    private getDefaultUser;
    getConfig(): AppConfig | null;
}
export declare const configLoader: ConfigLoader;
//# sourceMappingURL=loader.d.ts.map