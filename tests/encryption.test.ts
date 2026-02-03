import { describe, it, expect, beforeEach } from 'vitest';
import { Encryption, SecureStorage, maskEmail, maskApiKey, maskSensitiveData, sanitizeLogData } from '../src/security/encryption.js';

describe('Encryption', () => {
    let encryption: Encryption;

    beforeEach(() => {
        encryption = new Encryption('test-encryption-key-32chars!!');
    });

    describe('encrypt/decrypt', () => {
        it('should encrypt and decrypt strings', async () => {
            const original = 'Hello, World!';
            const encrypted = await encryption.encrypt(original);

            expect(encrypted).not.toBe(original);

            const decrypted = await encryption.decrypt(encrypted);
            expect(decrypted).toBe(original);
        });

        it('should produce different ciphertext for same input', async () => {
            const text = 'Same text';
            const encrypted1 = await encryption.encrypt(text);
            const encrypted2 = await encryption.encrypt(text);

            expect(encrypted1).not.toBe(encrypted2);
        });

        it('should handle empty strings', async () => {
            const encrypted = await encryption.encrypt('');
            const decrypted = await encryption.decrypt(encrypted);
            expect(decrypted).toBe('');
        });

        it('should handle unicode characters', async () => {
            const original = '你好世界 🌍 مرحبا';
            const encrypted = await encryption.encrypt(original);
            const decrypted = await encryption.decrypt(encrypted);
            expect(decrypted).toBe(original);
        });

        it('should throw on invalid ciphertext', async () => {
            await expect(encryption.decrypt('invalid')).rejects.toThrow();
        });
    });

    describe('encryptObject/decryptObject', () => {
        it('should encrypt and decrypt objects', async () => {
            const original = {
                name: 'Test',
                value: 123,
                nested: { key: 'value' },
            };

            const encrypted = await encryption.encryptObject(original);
            expect(typeof encrypted).toBe('string');

            const decrypted = await encryption.decryptObject(encrypted);
            expect(decrypted).toEqual(original);
        });

        it('should handle arrays', async () => {
            const original = [1, 'two', { three: 3 }];
            const encrypted = await encryption.encryptObject(original);
            const decrypted = await encryption.decryptObject(encrypted);
            expect(decrypted).toEqual(original);
        });
    });
});

describe('SecureStorage', () => {
    let storage: SecureStorage;

    beforeEach(() => {
        storage = new SecureStorage('storage-test-key-32characters!');
    });

    it('should store and retrieve values', async () => {
        await storage.set('key1', 'value1');
        expect(await storage.get('key1')).toBe('value1');
    });

    it('should return null for non-existent keys', async () => {
        expect(await storage.get('nonexistent')).toBeNull();
    });

    it('should delete values', async () => {
        await storage.set('toDelete', 'value');
        expect(await storage.get('toDelete')).toBe('value');

        await storage.delete('toDelete');
        expect(await storage.get('toDelete')).toBeNull();
    });

    it('should overwrite existing values', async () => {
        await storage.set('key', 'first');
        await storage.set('key', 'second');
        expect(await storage.get('key')).toBe('second');
    });
});

describe('Masking functions', () => {
    describe('maskEmail', () => {
        it('should mask email addresses', () => {
            expect(maskEmail('user@example.com')).toBe('u*r@example.com');
            expect(maskEmail('ab@test.org')).toBe('**@test.org');
        });

        it('should handle short local parts', () => {
            expect(maskEmail('a@example.com')).toBe('*@example.com');
        });
    });

    describe('maskApiKey', () => {
        it('should mask API keys showing prefix', () => {
            expect(maskApiKey('sk_live_1234567890abcdef')).toBe('sk_l**********cdef');
        });

        it('should handle short keys', () => {
            expect(maskApiKey('short')).toBe('*****');
        });
    });

    describe('maskSensitiveData', () => {
        it('should mask data with default settings', () => {
            const result = maskSensitiveData('secretvalue123');
            expect(result.startsWith('secr')).toBe(true);
            expect(result.endsWith('t123')).toBe(true);
            expect(result).toContain('*');
        });

        it('should handle short strings', () => {
            const result = maskSensitiveData('abc');
            expect(result).toBe('***');
        });
    });

    describe('sanitizeLogData', () => {
        it('should redact sensitive fields in objects', () => {
            const data = {
                username: 'user',
                password: 'secret123',
                token: 'abc123',
                normal: 'visible',
            };

            const masked = sanitizeLogData(data);

            expect(masked.username).toBe('user');
            expect(masked.password).toBe('[REDACTED]');
            expect(masked.token).toBe('[REDACTED]');
            expect(masked.normal).toBe('visible');
        });

        it('should handle nested objects', () => {
            const data = {
                user: {
                    password: 'secret',
                    apiKey: 'abc123',
                    name: 'John',
                },
            };

            const masked = sanitizeLogData(data);
            expect((masked.user as any).password).toBe('[REDACTED]');
            expect((masked.user as any).apiKey).toBe('[REDACTED]');
            expect((masked.user as any).name).toBe('John');
        });
    });
});
