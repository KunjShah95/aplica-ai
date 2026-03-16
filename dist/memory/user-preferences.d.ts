export interface UserPreference {
    key: string;
    value: string;
    category: 'communication' | 'format' | 'behavior' | 'domain' | 'custom';
    confidence: number;
    learnedAt: Date;
    updatedAt: Date;
    occurrences: number;
}
export interface UserProfile {
    userId: string;
    preferences: UserPreference[];
    createdAt: Date;
    updatedAt: Date;
}
export interface PreferenceObservation {
    key: string;
    value: string;
    category?: UserPreference['category'];
    confidence?: number;
}
export declare class UserPreferenceLearner {
    private profilesDir;
    private profiles;
    constructor(profilesDir?: string);
    private ensureDir;
    private profilePath;
    loadProfile(userId: string): Promise<UserProfile>;
    saveProfile(profile: UserProfile): Promise<void>;
    observe(userId: string, observations: PreferenceObservation[]): Promise<void>;
    learnFromConversation(userId: string, userMessage: string): Promise<PreferenceObservation[]>;
    getPreferences(userId: string, category?: UserPreference['category']): Promise<UserPreference[]>;
    setPreference(userId: string, key: string, value: string, category?: UserPreference['category']): Promise<void>;
    deletePreference(userId: string, key: string): Promise<boolean>;
    buildContextString(userId: string): Promise<string>;
    clearProfile(userId: string): Promise<void>;
}
export declare const userPreferenceLearner: UserPreferenceLearner;
//# sourceMappingURL=user-preferences.d.ts.map