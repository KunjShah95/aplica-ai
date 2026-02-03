import { db } from '../db/index.js';

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

const DEFAULT_PREFERENCES: UserPreferences = {
    theme: 'system',
    language: 'en',
    timezone: 'UTC',
    notifications: {
        email: true,
        push: true,
        inApp: true,
        digest: 'daily',
    },
    ai: {
        defaultPersona: null,
        temperature: 0.7,
        maxTokens: 4096,
        streamResponses: true,
        autoSave: true,
    },
    privacy: {
        shareAnalytics: false,
        storeHistory: true,
        memoryEnabled: true,
    },
    ui: {
        sidebarCollapsed: false,
        compactMode: false,
        showTimestamps: true,
        codeTheme: 'github-dark',
        fontSize: 'medium',
    },
};

export class UserPreferencesService {
    async get(userId: string): Promise<UserPreferences> {
        const pref = await db.userPreference.findUnique({
            where: { userId },
        });

        if (!pref) {
            return { ...DEFAULT_PREFERENCES };
        }

        return this.mergeWithDefaults(pref.preferences as Partial<UserPreferences>);
    }

    async update(
        userId: string,
        updates: Partial<UserPreferences>
    ): Promise<UserPreferences> {
        const current = await this.get(userId);
        const merged = this.deepMerge(current, updates);

        await db.userPreference.upsert({
            where: { userId },
            create: {
                userId,
                preferences: merged as any,
            },
            update: {
                preferences: merged as any,
            },
        });

        return merged;
    }

    async reset(userId: string): Promise<UserPreferences> {
        await db.userPreference.upsert({
            where: { userId },
            create: {
                userId,
                preferences: DEFAULT_PREFERENCES as any,
            },
            update: {
                preferences: DEFAULT_PREFERENCES as any,
            },
        });

        return { ...DEFAULT_PREFERENCES };
    }

    async getTheme(userId: string): Promise<'light' | 'dark' | 'system'> {
        const prefs = await this.get(userId);
        return prefs.theme;
    }

    async setTheme(userId: string, theme: 'light' | 'dark' | 'system'): Promise<void> {
        await this.update(userId, { theme });
    }

    async getLanguage(userId: string): Promise<string> {
        const prefs = await this.get(userId);
        return prefs.language;
    }

    async setLanguage(userId: string, language: string): Promise<void> {
        await this.update(userId, { language });
    }

    async getTimezone(userId: string): Promise<string> {
        const prefs = await this.get(userId);
        return prefs.timezone;
    }

    async setTimezone(userId: string, timezone: string): Promise<void> {
        await this.update(userId, { timezone });
    }

    async getNotificationSettings(userId: string) {
        const prefs = await this.get(userId);
        return prefs.notifications;
    }

    async updateNotificationSettings(
        userId: string,
        settings: Partial<UserPreferences['notifications']>
    ): Promise<void> {
        await this.update(userId, {
            notifications: { ...DEFAULT_PREFERENCES.notifications, ...settings }
        });
    }

    async getAISettings(userId: string) {
        const prefs = await this.get(userId);
        return prefs.ai;
    }

    async updateAISettings(
        userId: string,
        settings: Partial<UserPreferences['ai']>
    ): Promise<void> {
        await this.update(userId, {
            ai: { ...DEFAULT_PREFERENCES.ai, ...settings }
        });
    }

    async getPrivacySettings(userId: string) {
        const prefs = await this.get(userId);
        return prefs.privacy;
    }

    async updatePrivacySettings(
        userId: string,
        settings: Partial<UserPreferences['privacy']>
    ): Promise<void> {
        await this.update(userId, {
            privacy: { ...DEFAULT_PREFERENCES.privacy, ...settings }
        });
    }

    async getUISettings(userId: string) {
        const prefs = await this.get(userId);
        return prefs.ui;
    }

    async updateUISettings(
        userId: string,
        settings: Partial<UserPreferences['ui']>
    ): Promise<void> {
        await this.update(userId, {
            ui: { ...DEFAULT_PREFERENCES.ui, ...settings }
        });
    }

    private mergeWithDefaults(partial: Partial<UserPreferences>): UserPreferences {
        return this.deepMerge({ ...DEFAULT_PREFERENCES }, partial);
    }

    private deepMerge<T extends Record<string, any>>(target: T, source: Partial<T>): T {
        const result = { ...target };

        for (const key of Object.keys(source) as (keyof T)[]) {
            const sourceValue = source[key];
            const targetValue = result[key];

            if (
                sourceValue !== undefined &&
                typeof sourceValue === 'object' &&
                sourceValue !== null &&
                !Array.isArray(sourceValue) &&
                typeof targetValue === 'object' &&
                targetValue !== null
            ) {
                result[key] = this.deepMerge(
                    targetValue as Record<string, any>,
                    sourceValue as Record<string, any>
                ) as T[keyof T];
            } else if (sourceValue !== undefined) {
                result[key] = sourceValue as T[keyof T];
            }
        }

        return result;
    }
}

export const userPreferencesService = new UserPreferencesService();
