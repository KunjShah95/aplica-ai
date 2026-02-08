import { db } from '../db/index.js';
import { hashPassword, verifyPassword, generateApiKey, hashApiKey, getApiKeyPrefix, generateToken, } from './password.js';
import { generateTokens, verifyAccessToken, verifyRefreshToken } from './jwt.js';
const USER_ROLE = 'USER';
const ADMIN_ROLE = 'ADMIN';
const ACTIVE_STATUS = 'ACTIVE';
const SUSPENDED_STATUS = 'SUSPENDED';
export class AuthService {
    async register(data) {
        const existingUser = await db.user.findFirst({
            where: {
                OR: [{ email: data.email }, { username: data.username }],
            },
        });
        if (existingUser) {
            if (existingUser.email === data.email) {
                throw new Error('Email already registered');
            }
            throw new Error('Username already taken');
        }
        const passwordHash = await hashPassword(data.password);
        const user = await db.user.create({
            data: {
                email: data.email,
                username: data.username,
                passwordHash,
                displayName: data.displayName || data.username,
                role: USER_ROLE,
                status: ACTIVE_STATUS,
            },
        });
        const tokens = generateTokens(user.id, user.email, user.role);
        await db.session.create({
            data: {
                userId: user.id,
                token: tokens.accessToken,
                refreshToken: tokens.refreshToken,
                expiresAt: new Date(Date.now() + tokens.expiresIn * 1000),
            },
        });
        return {
            user: {
                id: user.id,
                email: user.email,
                username: user.username,
                displayName: user.displayName,
                role: user.role,
                status: user.status,
            },
            tokens,
        };
    }
    async login(credentials) {
        const user = await db.user.findUnique({
            where: { email: credentials.email },
        });
        if (!user || !user.passwordHash) {
            throw new Error('Invalid email or password');
        }
        if (user.status !== ACTIVE_STATUS) {
            throw new Error('Account is not active');
        }
        const isValid = await verifyPassword(credentials.password, user.passwordHash);
        if (!isValid) {
            throw new Error('Invalid email or password');
        }
        const tokens = generateTokens(user.id, user.email, user.role);
        await db.session.create({
            data: {
                userId: user.id,
                token: tokens.accessToken,
                refreshToken: tokens.refreshToken,
                expiresAt: new Date(Date.now() + tokens.expiresIn * 1000),
            },
        });
        await db.user.update({
            where: { id: user.id },
            data: { lastLoginAt: new Date() },
        });
        return {
            user: {
                id: user.id,
                email: user.email,
                username: user.username,
                displayName: user.displayName,
                role: user.role,
                status: user.status,
            },
            tokens,
        };
    }
    async logout(token) {
        await db.session.deleteMany({
            where: { token },
        });
    }
    async logoutAll(userId) {
        await db.session.deleteMany({
            where: { userId },
        });
    }
    async refreshTokens(refreshToken) {
        const payload = verifyRefreshToken(refreshToken);
        if (!payload) {
            throw new Error('Invalid refresh token');
        }
        const session = await db.session.findFirst({
            where: { refreshToken },
            include: { user: true },
        });
        if (!session || session.user.status !== ACTIVE_STATUS) {
            throw new Error('Session not found or user inactive');
        }
        const tokens = generateTokens(session.user.id, session.user.email, session.user.role);
        await db.session.update({
            where: { id: session.id },
            data: {
                token: tokens.accessToken,
                refreshToken: tokens.refreshToken,
                expiresAt: new Date(Date.now() + tokens.expiresIn * 1000),
            },
        });
        return tokens;
    }
    async validateToken(token) {
        const payload = verifyAccessToken(token);
        if (!payload) {
            return null;
        }
        const user = await db.user.findUnique({
            where: { id: payload.sub },
        });
        if (!user || user.status !== ACTIVE_STATUS) {
            return null;
        }
        return {
            id: user.id,
            email: user.email,
            username: user.username,
            displayName: user.displayName,
            role: user.role,
            status: user.status,
        };
    }
    async oauthLogin(profile) {
        let oauthAccount = await db.oAuthAccount.findUnique({
            where: {
                provider_providerAccountId: {
                    provider: profile.provider,
                    providerAccountId: profile.providerAccountId,
                },
            },
            include: { user: true },
        });
        if (oauthAccount) {
            const user = oauthAccount.user;
            if (user.status !== ACTIVE_STATUS) {
                throw new Error('Account is not active');
            }
            const tokens = generateTokens(user.id, user.email, user.role);
            await db.session.create({
                data: {
                    userId: user.id,
                    token: tokens.accessToken,
                    refreshToken: tokens.refreshToken,
                    expiresAt: new Date(Date.now() + tokens.expiresIn * 1000),
                },
            });
            await db.user.update({
                where: { id: user.id },
                data: { lastLoginAt: new Date() },
            });
            return {
                user: {
                    id: user.id,
                    email: user.email,
                    username: user.username,
                    displayName: user.displayName,
                    role: user.role,
                    status: user.status,
                },
                tokens,
            };
        }
        const existingUser = await db.user.findUnique({
            where: { email: profile.email },
        });
        if (existingUser) {
            await db.oAuthAccount.create({
                data: {
                    userId: existingUser.id,
                    provider: profile.provider,
                    providerAccountId: profile.providerAccountId,
                },
            });
            const tokens = generateTokens(existingUser.id, existingUser.email, existingUser.role);
            await db.session.create({
                data: {
                    userId: existingUser.id,
                    token: tokens.accessToken,
                    refreshToken: tokens.refreshToken,
                    expiresAt: new Date(Date.now() + tokens.expiresIn * 1000),
                },
            });
            return {
                user: {
                    id: existingUser.id,
                    email: existingUser.email,
                    username: existingUser.username,
                    displayName: existingUser.displayName,
                    role: existingUser.role,
                    status: existingUser.status,
                },
                tokens,
            };
        }
        const username = profile.email.split('@')[0] + '_' + generateToken(4);
        const user = await db.user.create({
            data: {
                email: profile.email,
                username,
                displayName: profile.name || username,
                avatar: profile.avatar,
                role: USER_ROLE,
                status: ACTIVE_STATUS,
                emailVerified: true,
                oauthAccounts: {
                    create: {
                        provider: profile.provider,
                        providerAccountId: profile.providerAccountId,
                    },
                },
            },
        });
        const tokens = generateTokens(user.id, user.email, user.role);
        await db.session.create({
            data: {
                userId: user.id,
                token: tokens.accessToken,
                refreshToken: tokens.refreshToken,
                expiresAt: new Date(Date.now() + tokens.expiresIn * 1000),
            },
        });
        return {
            user: {
                id: user.id,
                email: user.email,
                username: user.username,
                displayName: user.displayName,
                role: user.role,
                status: user.status,
            },
            tokens,
        };
    }
    async createApiKey(userId, data) {
        const key = generateApiKey();
        const keyHash = hashApiKey(key);
        const keyPrefix = getApiKeyPrefix(key);
        const apiKey = await db.apiKey.create({
            data: {
                userId,
                name: data.name,
                keyHash,
                keyPrefix,
                scopes: data.scopes,
                expiresAt: data.expiresAt,
            },
        });
        return {
            key,
            data: {
                id: apiKey.id,
                name: apiKey.name,
                keyPrefix: apiKey.keyPrefix,
                scopes: apiKey.scopes,
                createdAt: apiKey.createdAt,
                lastUsedAt: apiKey.lastUsedAt,
                expiresAt: apiKey.expiresAt,
            },
        };
    }
    async validateApiKey(key) {
        const keyHash = hashApiKey(key);
        const apiKey = await db.apiKey.findUnique({
            where: { keyHash },
        });
        if (!apiKey) {
            return null;
        }
        if (apiKey.revokedAt) {
            return null;
        }
        if (apiKey.expiresAt && apiKey.expiresAt < new Date()) {
            return null;
        }
        await db.apiKey.update({
            where: { id: apiKey.id },
            data: { lastUsedAt: new Date() },
        });
        return {
            userId: apiKey.userId,
            scopes: apiKey.scopes,
        };
    }
    async listApiKeys(userId) {
        const keys = await db.apiKey.findMany({
            where: {
                userId,
                revokedAt: null,
            },
            orderBy: { createdAt: 'desc' },
        });
        return keys.map((k) => ({
            id: k.id,
            name: k.name,
            keyPrefix: k.keyPrefix,
            scopes: k.scopes,
            createdAt: k.createdAt,
            lastUsedAt: k.lastUsedAt,
            expiresAt: k.expiresAt,
        }));
    }
    async revokeApiKey(userId, keyId) {
        await db.apiKey.updateMany({
            where: { id: keyId, userId },
            data: { revokedAt: new Date() },
        });
    }
    async getUser(userId) {
        const user = await db.user.findUnique({
            where: { id: userId },
        });
        if (!user)
            return null;
        return {
            id: user.id,
            email: user.email,
            username: user.username,
            displayName: user.displayName,
            role: user.role,
            status: user.status,
        };
    }
    async updateUser(userId, data) {
        const user = await db.user.update({
            where: { id: userId },
            data,
        });
        return {
            id: user.id,
            email: user.email,
            username: user.username,
            displayName: user.displayName,
            role: user.role,
            status: user.status,
        };
    }
    async changePassword(userId, currentPassword, newPassword) {
        const user = await db.user.findUnique({
            where: { id: userId },
        });
        if (!user || !user.passwordHash) {
            throw new Error('User not found');
        }
        const isValid = await verifyPassword(currentPassword, user.passwordHash);
        if (!isValid) {
            throw new Error('Current password is incorrect');
        }
        const newHash = await hashPassword(newPassword);
        await db.user.update({
            where: { id: userId },
            data: { passwordHash: newHash },
        });
        await db.session.deleteMany({
            where: { userId },
        });
    }
}
export const authService = new AuthService();
//# sourceMappingURL=service.js.map