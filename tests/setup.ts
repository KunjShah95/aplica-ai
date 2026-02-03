import { beforeAll, afterAll } from 'vitest';

beforeAll(async () => {
    process.env.NODE_ENV = 'test';
    process.env.DATABASE_URL = process.env.DATABASE_URL || 'postgresql://test:test@localhost:5432/sentinelbot_test';
    process.env.JWT_SECRET = 'test-jwt-secret-for-testing-purposes';
    process.env.ENCRYPTION_KEY = 'test-encryption-key-32chars!!';
});

afterAll(async () => {
});
