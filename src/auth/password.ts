import { createHash, randomBytes, timingSafeEqual } from 'crypto';

const ITERATIONS = 100000;
const KEY_LENGTH = 64;
const SALT_LENGTH = 32;
const DIGEST = 'sha512';

export async function hashPassword(password: string): Promise<string> {
    return new Promise((resolve, reject) => {
        const salt = randomBytes(SALT_LENGTH);

        import('crypto').then(({ pbkdf2 }) => {
            pbkdf2(password, salt, ITERATIONS, KEY_LENGTH, DIGEST, (err, derivedKey) => {
                if (err) reject(err);
                resolve(`${ITERATIONS}:${salt.toString('hex')}:${derivedKey.toString('hex')}`);
            });
        });
    });
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
    return new Promise((resolve, reject) => {
        const [iterations, salt, storedHash] = hash.split(':');
        const saltBuffer = Buffer.from(salt, 'hex');
        const storedHashBuffer = Buffer.from(storedHash, 'hex');

        import('crypto').then(({ pbkdf2 }) => {
            pbkdf2(password, saltBuffer, parseInt(iterations), KEY_LENGTH, DIGEST, (err, derivedKey) => {
                if (err) reject(err);
                resolve(timingSafeEqual(derivedKey, storedHashBuffer));
            });
        });
    });
}

export function generateApiKey(): string {
    const prefix = 'sk_' + (process.env.NODE_ENV === 'production' ? 'live_' : 'test_');
    const key = randomBytes(32).toString('base64url');
    return prefix + key;
}

export function hashApiKey(key: string): string {
    return createHash('sha256').update(key).digest('hex');
}

export function getApiKeyPrefix(key: string): string {
    return key.substring(0, 12);
}

export function generateToken(length: number = 32): string {
    return randomBytes(length).toString('base64url');
}

export function generateShareToken(): string {
    return randomBytes(16).toString('base64url');
}
