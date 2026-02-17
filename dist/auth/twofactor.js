import { generateSecret, verify, generateURI } from 'otplib';
import * as QRCode from 'qrcode';
import { db } from '../db/index.js';
export class TwoFactorService {
    issuer = 'Alpicia';
    backupCodesCount = 10;
    async generateSecret(userId, email) {
        const secret = generateSecret();
        const otpauth = generateURI({
            secret,
            issuer: this.issuer,
            label: email,
        });
        const qrCode = await QRCode.toDataURL(otpauth);
        const backupCodes = this.generateBackupCodes();
        await db.$executeRaw `
      UPDATE "User" 
      SET "twoFactorSecret" = ${secret},
          "twoFactorBackupCodes" = ${JSON.stringify(backupCodes)},
          "updatedAt" = NOW()
      WHERE id = ${userId}
    `;
        return {
            secret,
            qrCode,
            backupCodes,
        };
    }
    async verifyToken(userId, token) {
        const result = await db.$queryRaw `
      SELECT "twoFactorSecret" FROM "User" WHERE id = ${userId}
    `;
        const user = result[0];
        if (!user || !user.twoFactorSecret) {
            return { valid: false };
        }
        const isValid = await verify({
            token,
            secret: user.twoFactorSecret,
        });
        if (isValid) {
            await db.$executeRaw `
        UPDATE "User" 
        SET "twoFactorEnabled" = true,
            "updatedAt" = NOW()
        WHERE id = ${userId}
      `;
        }
        return { valid: !!isValid };
    }
    async verifyBackupCode(userId, code) {
        const result = await db.$queryRaw `
      SELECT id, "twoFactorBackupCodes" FROM "User" WHERE id = ${userId}
    `;
        const user = result[0];
        if (!user || !user.twoFactorBackupCodes) {
            return { valid: false };
        }
        const backupCodes = JSON.parse(user.twoFactorBackupCodes);
        const codeIndex = backupCodes.indexOf(code);
        if (codeIndex === -1) {
            return { valid: false };
        }
        backupCodes.splice(codeIndex, 1);
        await db.$executeRaw `
      UPDATE "User" 
      SET "twoFactorBackupCodes" = ${JSON.stringify(backupCodes)},
          "updatedAt" = NOW()
      WHERE id = ${userId}
    `;
        return { valid: true };
    }
    async disable(userId) {
        await db.$executeRaw `
      UPDATE "User" 
      SET "twoFactorEnabled" = false,
          "twoFactorSecret" = NULL,
          "twoFactorBackupCodes" = NULL,
          "updatedAt" = NOW()
      WHERE id = ${userId}
    `;
    }
    async isEnabled(userId) {
        const result = await db.$queryRaw `
      SELECT "twoFactorEnabled" FROM "User" WHERE id = ${userId}
    `;
        return result[0]?.twoFactorEnabled ?? false;
    }
    generateBackupCodes() {
        const codes = [];
        for (let i = 0; i < this.backupCodesCount; i++) {
            const code = Math.random().toString(36).substring(2, 10).toUpperCase();
            codes.push(code);
        }
        return codes;
    }
}
export const twoFactorService = new TwoFactorService();
//# sourceMappingURL=twofactor.js.map