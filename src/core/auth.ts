import { createHash, randomBytes, timingSafeEqual } from 'crypto';
import { sign, verify, JwtPayload, Secret } from 'jsonwebtoken';

export interface AuthConfig {
  jwtSecret: string;
  jwtExpiresIn?: string;
  refreshSecret: string;
  refreshExpiresIn?: string;
  bcryptRounds?: number;
}

export interface TokenPayload {
  userId: string;
  email?: string;
  role?: string;
  permissions?: string[];
}

export interface AuthResult {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  tokenType: string;
}

export interface RefreshResult {
  accessToken: string;
  expiresIn: number;
  tokenType: string;
}

export class AuthService {
  private config: AuthConfig;

  constructor(config: AuthConfig) {
    this.config = {
      jwtExpiresIn: '1h',
      refreshExpiresIn: '7d',
      bcryptRounds: 12,
      ...config,
    };
  }

  hashPassword(password: string): string {
    const salt = randomBytes(16).toString('hex');
    const hash = createHash('sha256')
      .update(password + salt)
      .digest('hex');
    return `${salt}:${hash}`;
  }

  verifyPassword(password: string, storedHash: string): boolean {
    const [salt, hash] = storedHash.split(':');
    const computedHash = createHash('sha256')
      .update(password + salt)
      .digest('hex');
    return timingSafeEqual(Buffer.from(hash), Buffer.from(computedHash));
  }

  generateTokens(payload: TokenPayload): AuthResult {
    const accessToken = sign(payload, this.config.jwtSecret as Secret, {
      expiresIn: this.config.jwtExpiresIn,
    });

    const refreshToken = sign(
      { userId: payload.userId, type: 'refresh' },
      this.config.refreshSecret as Secret,
      { expiresIn: this.config.refreshExpiresIn }
    );

    return {
      accessToken,
      refreshToken,
      expiresIn: this.parseExpiresIn(this.config.jwtExpiresIn || '1h'),
      tokenType: 'Bearer',
    };
  }

  private parseExpiresIn(expiresIn: string): number {
    const match = expiresIn.match(/^(\d+)([smhd])$/);
    if (!match) return 3600;

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

  verifyAccessToken(token: string): JwtPayload | null {
    try {
      return verify(token, this.config.jwtSecret as Secret) as JwtPayload;
    } catch {
      return null;
    }
  }

  verifyRefreshToken(token: string): { valid: boolean; userId?: string } {
    try {
      const decoded = verify(token, this.config.refreshSecret as Secret) as JwtPayload;
      if (decoded.type !== 'refresh') {
        return { valid: false };
      }
      return { valid: true, userId: decoded.userId };
    } catch {
      return { valid: false };
    }
  }

  refreshAccessToken(refreshToken: string): RefreshResult | null {
    const { valid, userId } = this.verifyRefreshToken(refreshToken);
    if (!valid || !userId) {
      return null;
    }

    const payload: TokenPayload = { userId };
    const accessToken = sign(payload, this.config.jwtSecret as Secret, {
      expiresIn: this.config.jwtExpiresIn,
    });

    return {
      accessToken,
      expiresIn: this.parseExpiresIn(this.config.jwtExpiresIn || '1h'),
      tokenType: 'Bearer',
    };
  }

  generateApiKey(prefix: string = 'sb'): string {
    const random = randomBytes(32).toString('hex');
    const timestamp = Date.now().toString(36);
    return `${prefix}_${timestamp}_${random}`;
  }

  hashApiKey(apiKey: string): string {
    return createHash('sha256').update(apiKey).digest('hex');
  }

  validateApiKey(apiKey: string, hashedKey: string): boolean {
    return timingSafeEqual(Buffer.from(this.hashApiKey(apiKey)), Buffer.from(hashedKey));
  }

  extractTokenFromHeader(authHeader: string | undefined): string | null {
    if (!authHeader) return null;

    const parts = authHeader.split(' ');
    if (parts.length !== 2 || parts[0] !== 'Bearer') {
      return null;
    }

    return parts[1];
  }

  generateSecureToken(length: number = 32): string {
    return randomBytes(length).toString('hex');
  }

  generateOtp(length: number = 6): string {
    return randomBytes(length)
      .toString('ascii')
      .replace(/[^0-9]/g, '')
      .slice(0, length);
  }

  verifyOtp(input: string, stored: string, window: number = 300): boolean {
    if (!stored) return false;

    const [otp, timestamp] = stored.split(':');
    const otpTime = parseInt(timestamp);
    const now = Date.now();

    if (now - otpTime > window) {
      return false;
    }

    return timingSafeEqual(Buffer.from(input), Buffer.from(otp));
  }

  createOtpSession(otp: string): string {
    const timestamp = Date.now().toString();
    return `${otp}:${timestamp}`;
  }

  createPasswordResetToken(userId: string): string {
    return sign({ userId, type: 'password_reset' }, this.config.jwtSecret as Secret, {
      expiresIn: '1h',
    });
  }

  verifyPasswordResetToken(token: string): { valid: boolean; userId?: string } {
    try {
      const decoded = verify(token, this.config.jwtSecret as Secret) as JwtPayload;
      if (decoded.type !== 'password_reset') {
        return { valid: false };
      }
      return { valid: true, userId: decoded.userId };
    } catch {
      return { valid: false };
    }
  }

  hasPermission(userPermissions: string[], requiredPermissions: string[]): boolean {
    return requiredPermissions.every((p) => userPermissions.includes(p));
  }

  hasAnyPermission(userPermissions: string[], requiredPermissions: string[]): boolean {
    return requiredPermissions.some((p) => userPermissions.includes(p));
  }
}

export function createAuthService(config: AuthConfig): AuthService {
  return new AuthService(config);
}
