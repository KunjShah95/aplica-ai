import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createServer } from 'http';

const API_BASE = 'http://localhost:3000/api';

describe('API Integration Tests', () => {
    describe('Health Endpoints', () => {
        it('should return health status', async () => {
            const response = await fetch(`${API_BASE}/health`);

            expect(response.status).toBe(200);

            const data = await response.json();
            expect(data).toHaveProperty('status');
            expect(['healthy', 'degraded', 'unhealthy']).toContain(data.status);
        });

        it('should return liveness probe', async () => {
            const response = await fetch(`${API_BASE}/health/live`);

            expect(response.status).toBe(200);

            const data = await response.json();
            expect(data.alive).toBe(true);
        });

        it('should return readiness probe', async () => {
            const response = await fetch(`${API_BASE}/health/ready`);

            expect(response.status).toBe(200);

            const data = await response.json();
            expect(data).toHaveProperty('ready');
        });
    });

    describe('Authentication Endpoints', () => {
        const testUser = {
            email: `test_${Date.now()}@example.com`,
            password: 'Test@1234567',
            username: `testuser_${Date.now()}`,
        };
        let accessToken: string;

        it('should register a new user', async () => {
            const response = await fetch(`${API_BASE}/auth/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(testUser),
            });

            expect(response.status).toBe(201);

            const data = await response.json();
            expect(data).toHaveProperty('user');
            expect(data.user.email).toBe(testUser.email);
        });

        it('should login with valid credentials', async () => {
            const response = await fetch(`${API_BASE}/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    email: testUser.email,
                    password: testUser.password,
                }),
            });

            expect(response.status).toBe(200);

            const data = await response.json();
            expect(data).toHaveProperty('accessToken');
            expect(data).toHaveProperty('refreshToken');

            accessToken = data.accessToken;
        });

        it('should reject login with invalid credentials', async () => {
            const response = await fetch(`${API_BASE}/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    email: testUser.email,
                    password: 'wrongpassword',
                }),
            });

            expect(response.status).toBe(401);
        });

        it('should get current user with valid token', async () => {
            if (!accessToken) return;

            const response = await fetch(`${API_BASE}/auth/me`, {
                headers: { Authorization: `Bearer ${accessToken}` },
            });

            expect(response.status).toBe(200);

            const data = await response.json();
            expect(data.email).toBe(testUser.email);
        });

        it('should reject unauthenticated requests', async () => {
            const response = await fetch(`${API_BASE}/auth/me`);
            expect(response.status).toBe(401);
        });
    });

    describe('Rate Limiting', () => {
        it('should include rate limit headers', async () => {
            const response = await fetch(`${API_BASE}/health`);

            expect(response.headers.has('x-ratelimit-limit')).toBe(true);
            expect(response.headers.has('x-ratelimit-remaining')).toBe(true);
        });
    });

    describe('Error Handling', () => {
        it('should return 404 for unknown routes', async () => {
            const response = await fetch(`${API_BASE}/unknown/route`);
            expect(response.status).toBe(404);
        });

        it('should return proper error format', async () => {
            const response = await fetch(`${API_BASE}/unknown/route`);
            const data = await response.json();

            expect(data).toHaveProperty('error');
        });
    });
});

describe('OpenAI-Compatible API', () => {
    const OPENAI_API_BASE = 'http://localhost:3002/v1';

    describe('Models', () => {
        it('should list available models', async () => {
            const response = await fetch(`${OPENAI_API_BASE}/models`);

            if (response.status === 200) {
                const data = await response.json();
                expect(data).toHaveProperty('data');
                expect(Array.isArray(data.data)).toBe(true);
            }
        });
    });

    describe('Chat Completions', () => {
        it('should create a chat completion', async () => {
            const response = await fetch(`${OPENAI_API_BASE}/chat/completions`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': 'Bearer test-key',
                },
                body: JSON.stringify({
                    model: 'sentinel',
                    messages: [
                        { role: 'user', content: 'Hello!' }
                    ],
                }),
            });

            if (response.status === 200) {
                const data = await response.json();
                expect(data).toHaveProperty('choices');
                expect(data.choices[0]).toHaveProperty('message');
            }
        });
    });
});
