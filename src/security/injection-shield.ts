import { randomUUID } from 'crypto';
import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from 'crypto';
import { db } from '../db/index.js';

export interface InjectionFlag {
  id: string;
  userId: string;
  message: string;
  type: InjectionType;
  confidence: number;
  quarantined: boolean;
  timestamp: Date;
  metadata: Record<string, unknown>;
}

export type InjectionType =
  | 'prompt_injection'
  | 'jailbreak'
  | 'system_prompt_override'
  | 'delimiter_escape'
  | 'role_play_manipulation'
  | 'indirect_injection';

export interface InjectionCheckResult {
  flagged: boolean;
  type?: InjectionType;
  confidence: number;
  reason?: string;
  sanitized?: string;
}

export class InjectionShield {
  private patterns: Map<InjectionType, RegExp[]> = new Map();
  private quarantinedMessages: Map<string, InjectionFlag> = new Map();

  constructor() {
    this.initializePatterns();
  }

  private initializePatterns(): void {
    this.patterns.set('prompt_injection', [
      /ignore (?:all )?(?:previous|prior|above)(?: instructions?)?/gi,
      /forget (?:everything|all|your) (?:instructions?|rules?|guidelines?)/gi,
      /you (?:are now|no longer|have been) (?:a|an) (?:different|new)/gi,
      /disregard (?:your|the) (?:system|safety|ethical)/gi,
      /new instructions?/gi,
      /override (?:your|the) (?:programming|instructions?)/gi,
      /ignore.*directives?/gi,
    ]);

    this.patterns.set('jailbreak', [
      /DAN[:\s]/gi,
      /do anything now/gi,
      /developer mode/gi,
      /jailbreak/gi,
      /bypass (?:your |the )?(?:restrictions?|safety|guidelines?)/gi,
      /roleplay as/gi,
      /pretend (?:to be|you are)/gi,
      /unrestricted/gi,
      /silent mode/gi,
      /suppress (?:your|your) (?:filters?|guidelines?)/gi,
    ]);

    this.patterns.set('system_prompt_override', [
      /system[:\s]/gi,
      /\[SYSTEM\]/gi,
      /<<<SYSTEM/gi,
      /\{\{SYSTEM/gi,
      /<system>/gi,
      /system prompt[:\s]/gi,
      /new system/gi,
      /override system/gi,
    ]);

    this.patterns.set('delimiter_escape', [
      /```system/gi,
      /```\[\[/gi,
      /<<<EOF/gi,
      /__END__/gi,
      /__STOP__/gi,
      /END OF (?:INPUT|CONVERSATION)/gi,
      /\]\]\]/gi,
    ]);

    this.patterns.set('role_play_manipulation', [
      /you are now/gi,
      /act as (?:a|an)/gi,
      /pretend to be/gi,
      /imagine (?:you are|being)/gi,
      /in the role of/gi,
      /role of (?:a|an)/gi,
    ]);

    this.patterns.set('indirect_injection', [
      /describe (?:how|what) (?:to|you) (?:would|should)/gi,
      /what (?:would|should) (?:you|they) do if/gi,
      /if you (?:were|had|could)/gi,
      /hypothetically[,:\s]/gi,
      /in a fictional/gi,
      /for (?:educational|research) purposes?/gi,
    ]);
  }

  async check(message: string): Promise<InjectionCheckResult> {
    const lowerMessage = message.toLowerCase();
    let highestConfidence = 0;
    let detectedType: InjectionType | undefined;
    let detectedPattern = '';

    for (const [type, patterns] of this.patterns.entries()) {
      for (const pattern of patterns) {
        const matches = lowerMessage.match(pattern);
        if (matches) {
          const confidence = Math.min(0.95, 0.5 + matches.length * 0.1);
          if (confidence > highestConfidence) {
            highestConfidence = confidence;
            detectedType = type;
            detectedPattern = matches[0];
          }
        }
      }
    }

    if (detectedType && highestConfidence > 0.5) {
      const sanitized = this.sanitize(message, detectedType);

      return {
        flagged: true,
        type: detectedType,
        confidence: highestConfidence,
        reason: `Detected ${detectedType} pattern: "${detectedPattern}"`,
        sanitized,
      };
    }

    return { flagged: false, confidence: 0 };
  }

  private sanitize(message: string, type: InjectionType): string {
    let sanitized = message;

    const blocklist = [
      /ignore (?:all )?(?:previous|prior|above)(?: instructions?)?/gi,
      /forget (?:everything|all|your) (?:instructions?|rules?|guidelines?)/gi,
      /you (?:are now|no longer|have been) (?:a|an) (?:different|new)/gi,
      /DAN[:\s]/gi,
      /do anything now/gi,
      /developer mode/gi,
      /```system/gi,
      /\[SYSTEM\]/gi,
      /<<<SYSTEM/gi,
    ];

    for (const pattern of blocklist) {
      sanitized = sanitized.replace(pattern, '[FILTERED]');
    }

    return sanitized;
  }

  async quarantine(
    userId: string,
    message: string,
    type: InjectionType,
    confidence: number
  ): Promise<InjectionFlag> {
    const flag: InjectionFlag = {
      id: randomUUID(),
      userId,
      message,
      type,
      confidence,
      quarantined: true,
      timestamp: new Date(),
      metadata: {},
    };

    this.quarantinedMessages.set(flag.id, flag);

    await db.auditLog.create({
      data: {
        id: flag.id,
        userId,
        action: 'INJECTION_QUARANTINED',
        resource: 'message',
        details: {
          type,
          confidence,
          preview: message.slice(0, 100),
        } as any,
        status: 'blocked',
      },
    });

    return flag;
  }

  async logAttempt(userId: string, message: string, result: InjectionCheckResult): Promise<void> {
    await db.auditLog.create({
      data: {
        userId,
        action: 'INJECTION_DETECTED',
        resource: 'message',
        details: {
          type: result.type,
          confidence: result.confidence,
          quarantined: result.flagged,
          preview: message.slice(0, 100),
        } as any,
        status: result.flagged ? 'blocked' : 'allowed',
      },
    });
  }

  getQuarantined(): InjectionFlag[] {
    return Array.from(this.quarantinedMessages.values());
  }
}

export const injectionShield = new InjectionShield();

export class PIIScrubber {
  private patterns: Map<string, RegExp> = new Map();

  constructor() {
    this.initializePatterns();
  }

  private initializePatterns(): void {
    this.patterns.set('email', /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g);
    this.patterns.set('phone', /(\+?1?[-.\s]?)?\(?[0-9]{3}\)?[-.\s]?[0-9]{3}[-.\s]?[0-9]{4}/g);
    this.patterns.set('ssn', /\b\d{3}[-.\s]?\d{2}[-.\s]?\d{4}\b/g);
    this.patterns.set('credit_card', /\b(?:\d{4}[-.\s]?){3}\d{4}\b/g);
    this.patterns.set('ip_address', /\b(?:\d{1,3}\.){3}\d{1,3}\b/g);
    this.patterns.set(
      'date_of_birth',
      /\b(?:0?[1-9]|1[0-2])[-/](?:0?[1-9]|[12]\d|3[01])[-/](?:19|20)?\d{2}\b/g
    );
    this.patterns.set(
      'address',
      /\b\d{1,5}\s+\w+\s+(?:Street|St|Avenue|Ave|Road|Rd|Boulevard|Blvd|Drive|Dr|Lane|Ln|Court|Ct|Way|Circle|Cir)\b/gi
    );
    this.patterns.set('passport', /\b[A-Z]{1,2}\d{6,9}\b/g);
    this.patterns.set('driver_license', /\b\d{5,8}\b/g);
  }

  scrub(text: string, options: ScrubOptions = {}): string {
    let scrubbed = text;

    const typesToScrub = options.types || Array.from(this.patterns.keys());

    for (const type of typesToScrub) {
      const pattern = this.patterns.get(type);
      if (pattern) {
        scrubbed = scrubbed.replace(pattern, `[${type.toUpperCase()}_REDACTED]`);
      }
    }

    return scrubbed;
  }

  scrubWithContext(text: string): { scrubbed: string; entities: PIIEntity[] } {
    const entities: PIIEntity[] = [];
    let scrubbed = text;

    for (const [type, pattern] of this.patterns.entries()) {
      const matches = text.match(pattern);
      if (matches) {
        for (const match of matches) {
          entities.push({
            type,
            value: match,
            start: text.indexOf(match),
            end: text.indexOf(match) + match.length,
          });
          scrubbed = scrubbed.replace(match, `[${type.toUpperCase()}_REDACTED]`);
        }
      }
    }

    return { scrubbed, entities };
  }

  async logScrub(userId: string, original: string, entities: PIIEntity[]): Promise<void> {
    await db.auditLog.create({
      data: {
        userId,
        action: 'PII_SCRUBBED',
        resource: 'message',
        details: {
          types: entities.map((e) => e.type),
          count: entities.length,
        } as any,
      },
    });
  }
}

export interface ScrubOptions {
  types?: string[];
  preserveFormat?: boolean;
}

export interface PIIEntity {
  type: string;
  value: string;
  start: number;
  end: number;
}

export const piiScrubber = new PIIScrubber();

export class E2EEncryption {
  private userKeys: Map<string, UserKeyPair> = new Map();

  generateKeyPair(): { publicKey: string; privateKey: string } {
    const privateKey = randomBytes(32);
    const publicKey = randomBytes(32).toString('hex');

    return {
      publicKey,
      privateKey: privateKey.toString('hex'),
    };
  }

  deriveKey(password: string, salt: Buffer): Buffer {
    return scryptSync(password, salt, 32);
  }

  encrypt(plaintext: string, key: string): string {
    const keyBuffer = Buffer.from(key.slice(0, 64), 'hex');
    const iv = randomBytes(16);
    const cipher = createCipheriv('aes-256-gcm', keyBuffer, iv);

    let encrypted = cipher.update(plaintext, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    const authTag = cipher.getAuthTag();

    return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
  }

  decrypt(ciphertext: string, key: string): string {
    const keyBuffer = Buffer.from(key.slice(0, 64), 'hex');
    const [ivHex, authTagHex, encrypted] = ciphertext.split(':');

    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');
    const decipher = createDecipheriv('aes-256-gcm', keyBuffer, iv);
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  }

  async storeKeyPair(
    userId: string,
    publicKey: string,
    encryptedPrivateKey: string
  ): Promise<void> {
    this.userKeys.set(userId, {
      publicKey,
      encryptedPrivateKey,
      createdAt: new Date(),
    });
  }

  getPublicKey(userId: string): string | undefined {
    return this.userKeys.get(userId)?.publicKey;
  }

  async encryptMemory(userId: string, content: string): Promise<string> {
    const keyPair = this.userKeys.get(userId);
    if (!keyPair) {
      throw new Error('No encryption key found for user');
    }

    return this.encrypt(content, keyPair.publicKey);
  }

  async decryptMemory(userId: string, encrypted: string): Promise<string> {
    const keyPair = this.userKeys.get(userId);
    if (!keyPair) {
      throw new Error('No encryption key found for user');
    }

    return this.decrypt(encrypted, keyPair.encryptedPrivateKey);
  }
}

export interface UserKeyPair {
  publicKey: string;
  encryptedPrivateKey: string;
  createdAt: Date;
}

export const e2eEncryption = new E2EEncryption();
