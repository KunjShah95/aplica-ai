import { TokenPayload, AuthTokens } from './types.js';
import { Role } from '@prisma/client';
export declare function generateTokens(userId: string, email: string, role: Role): AuthTokens;
export declare function verifyAccessToken(token: string): TokenPayload | null;
export declare function verifyRefreshToken(token: string): TokenPayload | null;
export declare function extractTokenFromHeader(authHeader: string | undefined): string | null;
export declare function decodeToken(token: string): TokenPayload | null;
//# sourceMappingURL=jwt.d.ts.map