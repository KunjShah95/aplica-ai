import { db } from '../db/index.js';
const DEFAULT_PREFERENCES = {
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
    async get(userId) {
        const pref = await db.userPreference.findUnique({
            where: { userId },
        });
        if (!pref) {
            return { ...DEFAULT_PREFERENCES };
        }
        return this.mergeWithDefaults(pref.preferences);
    }
    async update(userId, updates) {
        const current = await this.get(userId);
        const merged = this.deepMerge(current, updates);
        await db.userPreference.upsert({
            where: { userId },
            create: {
                userId,
                preferences: merged,
            },
            update: {
                preferences: merged,
            },
        });
        return merged;
    }
    async reset(userId) {
        await db.userPreference.upsert({
            where: { userId },
            create: {
                userId,
                preferences: DEFAULT_PREFERENCES,
            },
            update: {
                preferences: DEFAULT_PREFERENCES,
            },
        });
        return { ...DEFAULT_PREFERENCES };
    }
    async getTheme(userId) {
        const prefs = await this.get(userId);
        return prefs.theme;
    }
    async setTheme(userId, theme) {
        await this.update(userId, { theme });
    }
    async getLanguage(userId) {
        const prefs = await this.get(userId);
        return prefs.language;
    }
    async setLanguage(userId, language) {
        await this.update(userId, { language });
    }
    async getTimezone(userId) {
        const prefs = await this.get(userId);
        return prefs.timezone;
    }
    async setTimezone(userId, timezone) {
        await this.update(userId, { timezone });
    }
    async getNotificationSettings(userId) {
        const prefs = await this.get(userId);
        return prefs.notifications;
    }
    async updateNotificationSettings(userId, settings) {
        await this.update(userId, {
            notifications: { ...DEFAULT_PREFERENCES.notifications, ...settings }
        });
    }
    async getAISettings(userId) {
        const prefs = await this.get(userId);
        return prefs.ai;
    }
    async updateAISettings(userId, settings) {
        await this.update(userId, {
            ai: { ...DEFAULT_PREFERENCES.ai, ...settings }
        });
    }
    async getPrivacySettings(userId) {
        const prefs = await this.get(userId);
        return prefs.privacy;
    }
    async updatePrivacySettings(userId, settings) {
        await this.update(userId, {
            privacy: { ...DEFAULT_PREFERENCES.privacy, ...settings }
        });
    }
    async getUISettings(userId) {
        const prefs = await this.get(userId);
        return prefs.ui;
    }
    async updateUISettings(userId, settings) {
        await this.update(userId, {
            ui: { ...DEFAULT_PREFERENCES.ui, ...settings }
        });
    }
    mergeWithDefaults(partial) {
        return this.deepMerge({ ...DEFAULT_PREFERENCES }, partial);
    }
    deepMerge(target, source) {
        const result = { ...target };
        for (const key of Object.keys(source)) {
            const sourceValue = source[key];
            const targetValue = result[key];
            if (sourceValue !== undefined &&
                typeof sourceValue === 'object' &&
                sourceValue !== null &&
                !Array.isArray(sourceValue) &&
                typeof targetValue === 'object' &&
                targetValue !== null) {
                result[key] = this.deepMerge(targetValue, sourceValue);
            }
            else if (sourceValue !== undefined) {
                result[key] = sourceValue;
            }
        }
        return result;
    }
}
export const userPreferencesService = new UserPreferencesService();
//# sourceMappingURL=preferences.js.map