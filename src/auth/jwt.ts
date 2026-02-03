import { createHmac } from 'crypto';
import { TokenPayload, AuthTokens } from './types.js';
import { Role } from '@prisma/client';

const JWT_SECRET = process.env.JWT_SECRET || 'default-secret-change-in-production';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';
const JWT_REFRESH_EXPIRES_IN = process.env.JWT_REFRESH_EXPIRES_IN || '30d';

function base64UrlEncode(data: string): string {
    return Buffer.from(data).toString('base64url');
}

function base64UrlDecode(data: string): string {
    return Buffer.from(data, 'base64url').toString('utf8');
}

function parseExpiration(exp: string): number {
    const match = exp.match(/^(\d+)([smhd])$/);
    if (!match) return 7 * 24 * 60 * 60;

    const value = parseInt(match[1]);
    const unit = match[2];

    switch (unit) {
        case 's': return value;
        case 'm': return value * 60;
        case 'h': return value * 60 * 60;
        case 'd': return value * 24 * 60 * 60;
        default: return 7 * 24 * 60 * 60;
    }
}

function sign(payload: object, expiresIn: string): string {
    const header = { alg: 'HS256', typ: 'JWT' };
    const now = Math.floor(Date.now() / 1000);
    const exp = now + parseExpiration(expiresIn);

    const fullPayload = {
        ...payload,
        iat: now,
        exp,
    };

    const headerEncoded = base64UrlEncode(JSON.stringify(header));
    const payloadEncoded = base64UrlEncode(JSON.stringify(fullPayload));

    const signature = createHmac('sha256', JWT_SECRET)
        .update(`${headerEncoded}.${payloadEncoded}`)
        .digest('base64url');

    return `${headerEncoded}.${payloadEncoded}.${signature}`;
}

function verify(token: string): TokenPayload | null {
    try {
        const [headerEncoded, payloadEncoded, signature] = token.split('.');

        if (!headerEncoded || !payloadEncoded || !signature) {
            return null;
        }

        const expectedSignature = createHmac('sha256', JWT_SECRET)
            .update(`${headerEncoded}.${payloadEncoded}`)
            .digest('base64url');

        if (signature !== expectedSignature) {
            return null;
        }

        const payload = JSON.parse(base64UrlDecode(payloadEncoded)) as TokenPayload;

        if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) {
            return null;
        }

        return payload;
    } catch {
        return null;
    }
}

export function generateTokens(userId: string, email: string, role: Role): AuthTokens {
    const accessPayload = {
        sub: userId,
        email,
        role,
        type: 'access' as const,
    };

    const refreshPayload = {
        sub: userId,
        email,
        role,
        type: 'refresh' as const,
    };

    const accessToken = sign(accessPayload, JWT_EXPIRES_IN);
    const refreshToken = sign(refreshPayload, JWT_REFRESH_EXPIRES_IN);

    return {
        accessToken,
        refreshToken,
        expiresIn: parseExpiration(JWT_EXPIRES_IN),
    };
}

export function verifyAccessToken(token: string): TokenPayload | null {
    const payload = verify(token);
    if (!payload || payload.type !== 'access') {
        return null;
    }
    return payload;
}

export function verifyRefreshToken(token: string): TokenPayload | null {
    const payload = verify(token);
    if (!payload || payload.type !== 'refresh') {
        return null;
    }
    return payload;
}

export function extractTokenFromHeader(authHeader: string | undefined): string | null {
    if (!authHeader?.startsWith('Bearer ')) {
        return null;
    }
    return authHeader.slice(7);
}

export function decodeToken(token: string): TokenPayload | null {
    try {
        const [, payloadEncoded] = token.split('.');
        if (!payloadEncoded) return null;
        return JSON.parse(base64UrlDecode(payloadEncoded)) as TokenPayload;
    } catch {
        return null;
    }
}
