import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { UserPreferenceLearner } from '../src/memory/user-preferences.js';
import * as fs from 'fs';
import * as path from 'path';

describe('UserPreferenceLearner', () => {
    const testDir = './test-profiles';
    let learner: UserPreferenceLearner;

    beforeEach(() => {
        learner = new UserPreferenceLearner(testDir);
    });

    afterEach(async () => {
        try {
            fs.rmSync(testDir, { recursive: true, force: true });
        } catch (err) {
            // Ignore cleanup errors (directory may not have been created)
            if (err instanceof Error && !err.message.includes('ENOENT')) {
                console.warn('Cleanup warning:', err.message);
            }
        }
    });

    describe('loadProfile', () => {
        it('should create a new profile for unknown user', async () => {
            const profile = await learner.loadProfile('user-1');
            expect(profile.userId).toBe('user-1');
            expect(profile.preferences).toEqual([]);
        });

        it('should persist profile to disk', async () => {
            await learner.setPreference('user-1', 'tone', 'formal');

            // New instance should load from disk
            const newLearner = new UserPreferenceLearner(testDir);
            const profile = await newLearner.loadProfile('user-1');
            expect(profile.preferences).toHaveLength(1);
            expect(profile.preferences[0].key).toBe('tone');
            expect(profile.preferences[0].value).toBe('formal');
        });
    });

    describe('observe', () => {
        it('should add new preferences', async () => {
            await learner.observe('user-1', [
                { key: 'tone', value: 'formal', category: 'communication', confidence: 0.8 },
            ]);

            const prefs = await learner.getPreferences('user-1');
            expect(prefs).toHaveLength(1);
            expect(prefs[0].key).toBe('tone');
            expect(prefs[0].value).toBe('formal');
            expect(prefs[0].confidence).toBe(0.8);
        });

        it('should update existing preference confidence when same value observed', async () => {
            await learner.observe('user-1', [
                { key: 'tone', value: 'formal', confidence: 0.6 },
            ]);
            await learner.observe('user-1', [
                { key: 'tone', value: 'formal', confidence: 0.6 },
            ]);

            const prefs = await learner.getPreferences('user-1');
            expect(prefs[0].confidence).toBeGreaterThan(0.6);
            expect(prefs[0].occurrences).toBe(2);
        });

        it('should update value when different value observed for same key', async () => {
            await learner.observe('user-1', [
                { key: 'tone', value: 'formal', confidence: 0.6 },
            ]);
            await learner.observe('user-1', [
                { key: 'tone', value: 'casual', confidence: 0.7 },
            ]);

            const prefs = await learner.getPreferences('user-1');
            const tonePref = prefs.find((p) => p.key === 'tone');
            expect(tonePref?.value).toBe('casual');
        });
    });

    describe('learnFromConversation', () => {
        it('should detect concise preference from user message', async () => {
            const discovered = await learner.learnFromConversation(
                'user-1',
                'Please keep responses brief and concise'
            );
            expect(discovered.length).toBeGreaterThan(0);
            const responseLength = discovered.find((d) => d.key === 'response_length');
            expect(responseLength).toBeDefined();
        });

        it('should detect metric units preference', async () => {
            const discovered = await learner.learnFromConversation(
                'user-1',
                'I prefer metric units like kilometers and kilograms'
            );
            const measurement = discovered.find((d) => d.key === 'measurement_system');
            expect(measurement).toBeDefined();
        });

        it('should return empty array when no patterns match', async () => {
            const discovered = await learner.learnFromConversation(
                'user-1',
                'What is the weather today?'
            );
            expect(discovered).toEqual([]);
        });
    });

    describe('setPreference', () => {
        it('should set a preference with full confidence', async () => {
            await learner.setPreference('user-1', 'language', 'Python', 'domain');
            const prefs = await learner.getPreferences('user-1');
            const langPref = prefs.find((p) => p.key === 'language');
            expect(langPref?.value).toBe('Python');
            expect(langPref?.confidence).toBe(1.0);
            expect(langPref?.category).toBe('domain');
        });
    });

    describe('deletePreference', () => {
        it('should delete an existing preference', async () => {
            await learner.setPreference('user-1', 'tone', 'formal');
            const deleted = await learner.deletePreference('user-1', 'tone');
            expect(deleted).toBe(true);

            const prefs = await learner.getPreferences('user-1');
            expect(prefs.find((p) => p.key === 'tone')).toBeUndefined();
        });

        it('should return false for non-existent preference', async () => {
            const deleted = await learner.deletePreference('user-1', 'nonexistent');
            expect(deleted).toBe(false);
        });
    });

    describe('buildContextString', () => {
        it('should return empty string when no preferences', async () => {
            const ctx = await learner.buildContextString('user-1');
            expect(ctx).toBe('');
        });

        it('should include high-confidence preferences', async () => {
            await learner.setPreference('user-1', 'tone', 'formal');
            const ctx = await learner.buildContextString('user-1');
            expect(ctx).toContain('tone');
            expect(ctx).toContain('formal');
        });

        it('should exclude low-confidence preferences', async () => {
            await learner.observe('user-1', [
                { key: 'uncertain', value: 'maybe', confidence: 0.3 },
            ]);
            const ctx = await learner.buildContextString('user-1');
            expect(ctx).not.toContain('uncertain');
        });
    });

    describe('getPreferences', () => {
        it('should filter by category', async () => {
            await learner.observe('user-1', [
                { key: 'tone', value: 'formal', category: 'communication' },
                { key: 'format', value: 'bullet', category: 'format' },
            ]);

            const commPrefs = await learner.getPreferences('user-1', 'communication');
            expect(commPrefs).toHaveLength(1);
            expect(commPrefs[0].key).toBe('tone');
        });
    });

    describe('clearProfile', () => {
        it('should remove all preferences', async () => {
            await learner.setPreference('user-1', 'tone', 'formal');
            await learner.clearProfile('user-1');

            const prefs = await learner.getPreferences('user-1');
            expect(prefs).toHaveLength(0);
        });
    });
});
