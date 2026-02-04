import { Role, UserStatus } from '../types/prisma-types.js';

export interface AuthUser {
    id: string;
    email: string;
    username: string;
    displayName: string | null;
    role: Role;
    status: UserStatus;
}

export interface TokenPayload {
    sub: string;
    email: string;
    role: Role;
    type: 'access' | 'refresh';
    iat: number;
    exp: number;
}

export interface AuthTokens {
    accessToken: string;
    refreshToken: string;
    expiresIn: number;
}

export interface LoginCredentials {
    email: string;
    password: string;
}

export interface RegisterData {
    email: string;
    username: string;
    password: string;
    displayName?: string;
}

export interface OAuthProfile {
    provider: string;
    providerAccountId: string;
    email: string;
    name?: string;
    avatar?: string;
}

export interface ApiKeyData {
    id: string;
    name: string;
    keyPrefix: string;
    scopes: string[];
    createdAt: Date;
    lastUsedAt: Date | null;
    expiresAt: Date | null;
}

export interface CreateApiKeyData {
    name: string;
    scopes: string[];
    expiresAt?: Date;
}

export interface ApiKeyResult {
    key: string;
    data: ApiKeyData;
}

export const API_SCOPES = {
    READ: 'read',
    WRITE: 'write',
    ADMIN: 'admin',
    CONVERSATIONS_READ: 'conversations:read',
    CONVERSATIONS_WRITE: 'conversations:write',
    MEMORY_READ: 'memory:read',
    MEMORY_WRITE: 'memory:write',
    WORKFLOWS_READ: 'workflows:read',
    WORKFLOWS_WRITE: 'workflows:write',
    EXECUTE: 'execute',
} as const;

export type ApiScope = typeof API_SCOPES[keyof typeof API_SCOPES];
