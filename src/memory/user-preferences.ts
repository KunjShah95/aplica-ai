import { randomUUID } from 'crypto';
import * as fs from 'fs';
import * as path from 'path';

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

const PREFERENCE_PATTERNS: { pattern: RegExp; key: string; category: UserPreference['category'] }[] = [
  {
    pattern: /\b(concise|brief|short)\b/i,
    key: 'response_length',
    category: 'communication',
  },
  {
    pattern: /\b(detailed|verbose|elaborate|thorough)\b/i,
    key: 'response_length',
    category: 'communication',
  },
  {
    pattern: /\b(metric|celsius|kilometers?|kilograms?)\b/i,
    key: 'measurement_system',
    category: 'domain',
  },
  {
    pattern: /\b(imperial|fahrenheit|miles?|pounds?)\b/i,
    key: 'measurement_system',
    category: 'domain',
  },
  {
    pattern: /\b(formal|professional|business)\b/i,
    key: 'tone',
    category: 'communication',
  },
  {
    pattern: /\b(casual|informal|friendly|relaxed)\b/i,
    key: 'tone',
    category: 'communication',
  },
  {
    pattern: /\b(bullet.?points?|lists?|structured)\b/i,
    key: 'output_format',
    category: 'format',
  },
  {
    pattern: /\b(prose|paragraph|narrative)\b/i,
    key: 'output_format',
    category: 'format',
  },
  {
    pattern: /\b(code.?first|show.?code|with.?code)\b/i,
    key: 'code_preference',
    category: 'domain',
  },
];

export class UserPreferenceLearner {
  private profilesDir: string;
  private profiles: Map<string, UserProfile> = new Map();

  constructor(profilesDir?: string) {
    this.profilesDir = profilesDir || process.env.USER_PROFILES_DIR || './memory/profiles';
    this.ensureDir();
  }

  private ensureDir(): void {
    if (!fs.existsSync(this.profilesDir)) {
      fs.mkdirSync(this.profilesDir, { recursive: true });
    }
  }

  private profilePath(userId: string): string {
    return path.join(this.profilesDir, `${userId}.json`);
  }

  async loadProfile(userId: string): Promise<UserProfile> {
    if (this.profiles.has(userId)) {
      return this.profiles.get(userId)!;
    }

    const filePath = this.profilePath(userId);
    if (fs.existsSync(filePath)) {
      try {
        const raw = fs.readFileSync(filePath, 'utf-8');
        const profile = JSON.parse(raw) as UserProfile;
        profile.createdAt = new Date(profile.createdAt);
        profile.updatedAt = new Date(profile.updatedAt);
        profile.preferences = profile.preferences.map((p) => ({
          ...p,
          learnedAt: new Date(p.learnedAt),
          updatedAt: new Date(p.updatedAt),
        }));
        this.profiles.set(userId, profile);
        return profile;
      } catch {
        // Fall through to create new profile
      }
    }

    const newProfile: UserProfile = {
      userId,
      preferences: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.profiles.set(userId, newProfile);
    return newProfile;
  }

  async saveProfile(profile: UserProfile): Promise<void> {
    profile.updatedAt = new Date();
    this.profiles.set(profile.userId, profile);

    const filePath = this.profilePath(profile.userId);
    fs.writeFileSync(filePath, JSON.stringify(profile, null, 2), 'utf-8');
  }

  async observe(userId: string, observations: PreferenceObservation[]): Promise<void> {
    const profile = await this.loadProfile(userId);

    for (const obs of observations) {
      const existing = profile.preferences.find((p) => p.key === obs.key);
      if (existing) {
        if (existing.value !== obs.value) {
          existing.value = obs.value;
          existing.confidence = Math.min(1, (obs.confidence ?? existing.confidence) + 0.1);
        } else {
          existing.confidence = Math.min(1, existing.confidence + 0.05);
          existing.occurrences += 1;
        }
        existing.updatedAt = new Date();
      } else {
        profile.preferences.push({
          key: obs.key,
          value: obs.value,
          category: obs.category ?? 'custom',
          confidence: obs.confidence ?? 0.5,
          learnedAt: new Date(),
          updatedAt: new Date(),
          occurrences: 1,
        });
      }
    }

    await this.saveProfile(profile);
  }

  async learnFromConversation(userId: string, userMessage: string): Promise<PreferenceObservation[]> {
    const discovered: PreferenceObservation[] = [];

    for (const { pattern, key, category } of PREFERENCE_PATTERNS) {
      if (pattern.test(userMessage)) {
        const match = userMessage.match(pattern);
        if (match) {
          discovered.push({
            key,
            value: match[0].toLowerCase(),
            category,
            confidence: 0.6,
          });
        }
      }
    }

    if (discovered.length > 0) {
      await this.observe(userId, discovered);
    }

    return discovered;
  }

  async getPreferences(userId: string, category?: UserPreference['category']): Promise<UserPreference[]> {
    const profile = await this.loadProfile(userId);
    const prefs = category
      ? profile.preferences.filter((p) => p.category === category)
      : profile.preferences;

    return prefs.sort((a, b) => b.confidence - a.confidence);
  }

  async setPreference(
    userId: string,
    key: string,
    value: string,
    category: UserPreference['category'] = 'custom'
  ): Promise<void> {
    await this.observe(userId, [{ key, value, category, confidence: 1.0 }]);
  }

  async deletePreference(userId: string, key: string): Promise<boolean> {
    const profile = await this.loadProfile(userId);
    const index = profile.preferences.findIndex((p) => p.key === key);
    if (index === -1) return false;

    profile.preferences.splice(index, 1);
    await this.saveProfile(profile);
    return true;
  }

  async buildContextString(userId: string): Promise<string> {
    const prefs = await this.getPreferences(userId);
    if (prefs.length === 0) return '';

    const highConfidence = prefs.filter((p) => p.confidence >= 0.6);
    if (highConfidence.length === 0) return '';

    const lines = highConfidence.map(
      (p) => `- ${p.key}: ${p.value} (confidence: ${Math.round(p.confidence * 100)}%)`
    );

    return `User preferences:\n${lines.join('\n')}`;
  }

  async clearProfile(userId: string): Promise<void> {
    const profile = await this.loadProfile(userId);
    profile.preferences = [];
    await this.saveProfile(profile);
  }
}

export const userPreferenceLearner = new UserPreferenceLearner();
