import { createCipheriv, createDecipheriv, randomBytes, scrypt } from 'crypto';
import { promisify } from 'util';
const scryptAsync = promisify(scrypt);
const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const SALT_LENGTH = 32;
const TAG_LENGTH = 16;
const KEY_LENGTH = 32;
export class Encryption {
    masterKey;
    constructor(masterKey) {
        this.masterKey = masterKey || process.env.ENCRYPTION_KEY || 'default-key-change-in-production';
    }
    async encrypt(data) {
        const salt = randomBytes(SALT_LENGTH);
        const iv = randomBytes(IV_LENGTH);
        const key = await this.deriveKey(salt);
        const cipher = createCipheriv(ALGORITHM, key, iv);
        let encrypted = cipher.update(data, 'utf8', 'hex');
        encrypted += cipher.final('hex');
        const tag = cipher.getAuthTag();
        const result = {
            encrypted,
            iv: iv.toString('hex'),
            salt: salt.toString('hex'),
            tag: tag.toString('hex'),
        };
        return Buffer.from(JSON.stringify(result)).toString('base64');
    }
    async decrypt(encryptedString) {
        const data = JSON.parse(Buffer.from(encryptedString, 'base64').toString('utf8'));
        const salt = Buffer.from(data.salt, 'hex');
        const iv = Buffer.from(data.iv, 'hex');
        const tag = Buffer.from(data.tag, 'hex');
        const key = await this.deriveKey(salt);
        const decipher = createDecipheriv(ALGORITHM, key, iv);
        decipher.setAuthTag(tag);
        let decrypted = decipher.update(data.encrypted, 'hex', 'utf8');
        decrypted += decipher.final('utf8');
        return decrypted;
    }
    async encryptObject(obj) {
        return this.encrypt(JSON.stringify(obj));
    }
    async decryptObject(encryptedString) {
        const decrypted = await this.decrypt(encryptedString);
        return JSON.parse(decrypted);
    }
    async deriveKey(salt) {
        return scryptAsync(this.masterKey, salt, KEY_LENGTH);
    }
    static generateKey() {
        return randomBytes(32).toString('hex');
    }
}
export class SecureStorage {
    encryption;
    storage = new Map();
    constructor(masterKey) {
        this.encryption = new Encryption(masterKey);
    }
    async set(key, value) {
        const encrypted = await this.encryption.encryptObject(value);
        this.storage.set(key, encrypted);
    }
    async get(key) {
        const encrypted = this.storage.get(key);
        if (!encrypted)
            return null;
        return this.encryption.decryptObject(encrypted);
    }
    async delete(key) {
        return this.storage.delete(key);
    }
    has(key) {
        return this.storage.has(key);
    }
    keys() {
        return Array.from(this.storage.keys());
    }
}
export function maskSensitiveData(data, visibleStart = 4, visibleEnd = 4, maskChar = '*') {
    if (data.length <= visibleStart + visibleEnd) {
        return maskChar.repeat(data.length);
    }
    const start = data.slice(0, visibleStart);
    const end = data.slice(-visibleEnd);
    const masked = maskChar.repeat(data.length - visibleStart - visibleEnd);
    return `${start}${masked}${end}`;
}
export function maskEmail(email) {
    const [local, domain] = email.split('@');
    if (!domain)
        return maskSensitiveData(email);
    const maskedLocal = local.length > 2
        ? local[0] + '*'.repeat(local.length - 2) + local[local.length - 1]
        : '*'.repeat(local.length);
    return `${maskedLocal}@${domain}`;
}
export function maskApiKey(key) {
    if (key.length <= 8)
        return '*'.repeat(key.length);
    return key.slice(0, 4) + '*'.repeat(key.length - 8) + key.slice(-4);
}
export function sanitizeHeaders(headers) {
    const sensitiveHeaders = [
        'authorization',
        'cookie',
        'x-api-key',
        'x-auth-token',
        'x-csrf-token',
    ];
    const sanitized = {};
    for (const [key, value] of Object.entries(headers)) {
        const lowerKey = key.toLowerCase();
        if (sensitiveHeaders.includes(lowerKey)) {
            sanitized[key] = '[REDACTED]';
        }
        else if (value !== undefined) {
            sanitized[key] = Array.isArray(value) ? value.join(', ') : value;
        }
    }
    return sanitized;
}
export function sanitizeLogData(data, sensitiveKeys = ['password', 'token', 'secret', 'apiKey', 'key', 'authorization']) {
    const result = { ...data };
    for (const key of Object.keys(result)) {
        const lowerKey = key.toLowerCase();
        if (sensitiveKeys.some(sk => lowerKey.includes(sk.toLowerCase()))) {
            result[key] = '[REDACTED]';
        }
        else if (typeof result[key] === 'object' && result[key] !== null) {
            result[key] = sanitizeLogData(result[key], sensitiveKeys);
        }
    }
    return result;
}
export const encryption = new Encryption();
export const secureStorage = new SecureStorage();
//# sourceMappingURL=encryption.js.map