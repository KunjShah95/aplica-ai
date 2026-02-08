import { createHash, randomBytes, timingSafeEqual } from 'crypto';
import { sign, verify } from 'jsonwebtoken';
export class AuthService {
    config;
    constructor(config) {
        this.config = {
            jwtExpiresIn: '1h',
            refreshExpiresIn: '7d',
            bcryptRounds: 12,
            ...config,
        };
    }
    hashPassword(password) {
        const salt = randomBytes(16).toString('hex');
        const hash = createHash('sha256')
            .update(password + salt)
            .digest('hex');
        return `${salt}:${hash}`;
    }
    verifyPassword(password, storedHash) {
        const [salt, hash] = storedHash.split(':');
        const computedHash = createHash('sha256')
            .update(password + salt)
            .digest('hex');
        return timingSafeEqual(Buffer.from(hash), Buffer.from(computedHash));
    }
    generateTokens(payload) {
        const accessToken = sign(payload, this.config.jwtSecret, {
            expiresIn: this.config.jwtExpiresIn,
        });
        const refreshToken = sign({ userId: payload.userId, type: 'refresh' }, this.config.refreshSecret, { expiresIn: this.config.refreshExpiresIn });
        return {
            accessToken,
            refreshToken,
            expiresIn: this.parseExpiresIn(this.config.jwtExpiresIn || '1h'),
            tokenType: 'Bearer',
        };
    }
    parseExpiresIn(expiresIn) {
        const match = expiresIn.match(/^(\d+)([smhd])$/);
        if (!match)
            return 3600;
        const value = parseInt(match[1]);
        const unit = match[2];
        switch (unit) {
            case 's':
                return value;
            case 'm':
                return value * 60;
            case 'h':
                return value * 3600;
            case 'd':
                return value * 86400;
            default:
                return 3600;
        }
    }
    verifyAccessToken(token) {
        try {
            return verify(token, this.config.jwtSecret);
        }
        catch {
            return null;
        }
    }
    verifyRefreshToken(token) {
        try {
            const decoded = verify(token, this.config.refreshSecret);
            if (decoded.type !== 'refresh') {
                return { valid: false };
            }
            return { valid: true, userId: decoded.userId };
        }
        catch {
            return { valid: false };
        }
    }
    refreshAccessToken(refreshToken) {
        const { valid, userId } = this.verifyRefreshToken(refreshToken);
        if (!valid || !userId) {
            return null;
        }
        const payload = { userId };
        const accessToken = sign(payload, this.config.jwtSecret, {
            expiresIn: this.config.jwtExpiresIn,
        });
        return {
            accessToken,
            expiresIn: this.parseExpiresIn(this.config.jwtExpiresIn || '1h'),
            tokenType: 'Bearer',
        };
    }
    generateApiKey(prefix = 'sb') {
        const random = randomBytes(32).toString('hex');
        const timestamp = Date.now().toString(36);
        return `${prefix}_${timestamp}_${random}`;
    }
    hashApiKey(apiKey) {
        return createHash('sha256').update(apiKey).digest('hex');
    }
    validateApiKey(apiKey, hashedKey) {
        return timingSafeEqual(Buffer.from(this.hashApiKey(apiKey)), Buffer.from(hashedKey));
    }
    extractTokenFromHeader(authHeader) {
        if (!authHeader)
            return null;
        const parts = authHeader.split(' ');
        if (parts.length !== 2 || parts[0] !== 'Bearer') {
            return null;
        }
        return parts[1];
    }
    generateSecureToken(length = 32) {
        return randomBytes(length).toString('hex');
    }
    generateOtp(length = 6) {
        return randomBytes(length)
            .toString('ascii')
            .replace(/[^0-9]/g, '')
            .slice(0, length);
    }
    verifyOtp(input, stored, window = 300) {
        if (!stored)
            return false;
        const [otp, timestamp] = stored.split(':');
        const otpTime = parseInt(timestamp);
        const now = Date.now();
        if (now - otpTime > window) {
            return false;
        }
        return timingSafeEqual(Buffer.from(input), Buffer.from(otp));
    }
    createOtpSession(otp) {
        const timestamp = Date.now().toString();
        return `${otp}:${timestamp}`;
    }
    createPasswordResetToken(userId) {
        return sign({ userId, type: 'password_reset' }, this.config.jwtSecret, {
            expiresIn: '1h',
        });
    }
    verifyPasswordResetToken(token) {
        try {
            const decoded = verify(token, this.config.jwtSecret);
            if (decoded.type !== 'password_reset') {
                return { valid: false };
            }
            return { valid: true, userId: decoded.userId };
        }
        catch {
            return { valid: false };
        }
    }
    hasPermission(userPermissions, requiredPermissions) {
        return requiredPermissions.every((p) => userPermissions.includes(p));
    }
    hasAnyPermission(userPermissions, requiredPermissions) {
        return requiredPermissions.some((p) => userPermissions.includes(p));
    }
}
export function createAuthService(config) {
    return new AuthService(config);
}
//# sourceMappingURL=auth.js.map