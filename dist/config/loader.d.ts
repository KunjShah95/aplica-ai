import { AppConfig } from './types';
export declare class ConfigLoader {
    private config;
    private envConfig;
    load(): Promise<AppConfig>;
    private logConfigSummary;
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