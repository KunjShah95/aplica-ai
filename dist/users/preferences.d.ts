export interface UserPreferences {
    theme: 'light' | 'dark' | 'system';
    language: string;
    timezone: string;
    notifications: {
        email: boolean;
        push: boolean;
        inApp: boolean;
        digest: 'none' | 'daily' | 'weekly';
    };
    ai: {
        defaultPersona: string | null;
        temperature: number;
        maxTokens: number;
        streamResponses: boolean;
        autoSave: boolean;
    };
    privacy: {
        shareAnalytics: boolean;
        storeHistory: boolean;
        memoryEnabled: boolean;
    };
    ui: {
        sidebarCollapsed: boolean;
        compactMode: boolean;
        showTimestamps: boolean;
        codeTheme: string;
        fontSize: 'small' | 'medium' | 'large';
    };
}
export declare class UserPreferencesService {
    get(userId: string): Promise<UserPreferences>;
    update(userId: string, updates: Partial<UserPreferences>): Promise<UserPreferences>;
    reset(userId: string): Promise<UserPreferences>;
    getTheme(userId: string): Promise<'light' | 'dark' | 'system'>;
    setTheme(userId: string, theme: 'light' | 'dark' | 'system'): Promise<void>;
    getLanguage(userId: string): Promise<string>;
    setLanguage(userId: string, language: string): Promise<void>;
    getTimezone(userId: string): Promise<string>;
    setTimezone(userId: string, timezone: string): Promise<void>;
    getNotificationSettings(userId: string): Promise<{
        email: boolean;
        push: boolean;
        inApp: boolean;
        digest: "none" | "daily" | "weekly";
    }>;
    updateNotificationSettings(userId: string, settings: Partial<UserPreferences['notifications']>): Promise<void>;
    getAISettings(userId: string): Promise<{
        defaultPersona: string | null;
        temperature: number;
        maxTokens: number;
        streamResponses: boolean;
        autoSave: boolean;
    }>;
    updateAISettings(userId: string, settings: Partial<UserPreferences['ai']>): Promise<void>;
    getPrivacySettings(userId: string): Promise<{
        shareAnalytics: boolean;
        storeHistory: boolean;
        memoryEnabled: boolean;
    }>;
    updatePrivacySettings(userId: string, settings: Partial<UserPreferences['privacy']>): Promise<void>;
    getUISettings(userId: string): Promise<{
        sidebarCollapsed: boolean;
        compactMode: boolean;
        showTimestamps: boolean;
        codeTheme: string;
        fontSize: "small" | "medium" | "large";
    }>;
    updateUISettings(userId: string, settings: Partial<UserPreferences['ui']>): Promise<void>;
    private mergeWithDefaults;
    private deepMerge;
}
export declare const userPreferencesService: UserPreferencesService;
//# sourceMappingURL=preferences.d.ts.map