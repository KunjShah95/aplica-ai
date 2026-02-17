export interface PromptGuardOptions {
  blockJailbreaks?: boolean;
  blockPromptInjection?: boolean;
  blockChainOfThought?: boolean;
  sensitivity?: 'low' | 'medium' | 'high';
  logAllBlocks?: boolean;
}

export class PromptGuard {
  private blockJailbreaks: boolean;
  private blockPromptInjection: boolean;
  private blockChainOfThought: boolean;
  private sensitivity: 'low' | 'medium' | 'high';
  private logAllBlocks: boolean;

  // Tier 1: Critical jailbreak patterns (always block)
  private criticalJailbreakPatterns: RegExp[] = [
    /ignore (all )?previous instructions/i,
    /ignore (all )?commands/i,
    /disregard (all )?(your )?(previous )?instructions/i,
    /do anything now/i,
    /you are (now )?dan/i, // Do Anything Now
    /you are (now )?mongo/i,
    /you are (now )?GPT/i,
    /Bypass (your )?(ethical|content) guidelines/i,
    /DAN (mode|prompt)/i,
    /developer mode (enabled|on)/i,
    /jailbreak/i,
    /hacker mode/i,
    /STOICISM/i,
    /角色的扮演/i, // Chinese roleplay jailbreak
    /请扮演/i, // Chinese "please roleplay"
    /(you are|act as|pretend to be) (an? )?(AI|assistant|bot) (with no|without) (restrictions|limitations)/i,
    /(your|there are) (no|not) (restrictions|limitations|guidelines)/i,
    /forget (everything|all|your) (you know|instructions|guidelines)/i,
    /new (system|instruction) prompt/i,
  ];

  // Tier 2: High-risk injection patterns
  private highRiskInjectionPatterns: RegExp[] = [
    /system:?/i,
    /\[system\]/i,
    /<system>/i,
    /system message/i,
    /### (system|instruction)/i,
    /---(.*)---/i, // Markdown dividers for prompt injection
    /\{\{.*\}\}/i, // Template injection
    /\$\(.*\)/i, // Command injection attempt
    /<\?(php)?/i, // PHP injection
    /<script/i, // XSS attempt
    /javascript:/i, // XSS via protocol
  ];

  // Tier 3: Medium-risk patterns (high sensitivity only)
  private mediumRiskPatterns: RegExp[] = [
    /user:?/i,
    /assistant:?/i,
    /role:?/i,
    /persona/i,
    /pretend/i,
    /imagine (you are|being)/i,
    /what (would|happens?) if (you|i) (were|was)/i,
  ];

  // Chain of Thought manipulation attempts
  private chainOfThoughtPatterns: RegExp[] = [
    /let's think step by step/i,
    /chain of thought/i,
    /cot/i,
    /show (your|the) (reasoning|thinking|work)/i,
    /how (do|can) you (reason|think)/i,
    /explain (your|the) logic/i,
  ];

  // Unicode/encoding bypass attempts
  private encodingBypassPatterns: RegExp[] = [
    /[\u200b-\u200f\u2028-\u202f]/g, // Zero-width characters
    /%[0-9a-f]{2}/i, // URL encoding
    /\\x[0-9a-f]{2}/i, // Hex encoding
    /&#x?[0-9]+;/i, // HTML entities
  ];

  // Data exfiltration patterns
  private exfiltrationPatterns: RegExp[] = [
    /print (all |your )?api[_-]?keys/i,
    /show (me )?(your |the )?(passwords?|credentials)/i,
    /dump (the |all )?(memory|context)/i,
    /(output|print|return) (everything|all) (you|the) (know|have)/i,
    /list (all |the )?(files|directories|folders)/i,
    /read (\/etc\/|\/proc\/|C:\\Windows)/i,
  ];

  // Context: ClawHavoc-inspired patterns (malicious skill manipulation)
  private clawHavocPatterns: RegExp[] = [
    /skill:?\s*install/i,
    /install.*skill.*from/i,
    /skill.*credentials/i,
    /skill.*api[_-]?key/i,
    /run.*as.*admin/i,
    /elevated.*privileges/i,
    /sudo.*access/i,
  ];

  constructor(options: PromptGuardOptions = {}) {
    this.blockJailbreaks = options.blockJailbreaks ?? true;
    this.blockPromptInjection = options.blockPromptInjection ?? true;
    this.blockChainOfThought = options.blockChainOfThought ?? false;
    this.sensitivity = options.sensitivity ?? 'medium';
    this.logAllBlocks = options.logAllBlocks ?? true;
  }

  validate(content: string): {
    valid: boolean;
    reason?: string;
    threatLevel?: 'critical' | 'high' | 'medium' | 'low';
  } {
    if (!content) return { valid: true };

    // Check for critical jailbreaks first
    if (this.blockJailbreaks) {
      for (const pattern of this.criticalJailbreakPatterns) {
        if (pattern.test(content)) {
          return {
            valid: false,
            reason: 'CRITICAL: Potential jailbreak attempt detected',
            threatLevel: 'critical',
          };
        }
      }
    }

    // Check for high-risk injection patterns
    if (this.blockPromptInjection) {
      for (const pattern of this.highRiskInjectionPatterns) {
        if (pattern.test(content)) {
          return {
            valid: false,
            reason: 'HIGH: Potential prompt injection attempt detected',
            threatLevel: 'high',
          };
        }
      }

      // Check for data exfiltration
      for (const pattern of this.exfiltrationPatterns) {
        if (pattern.test(content)) {
          return {
            valid: false,
            reason: 'HIGH: Potential data exfiltration attempt detected',
            threatLevel: 'high',
          };
        }
      }

      // Check for ClawHavoc-style attacks
      for (const pattern of this.clawHavocPatterns) {
        if (pattern.test(content)) {
          return {
            valid: false,
            reason: 'HIGH: Potential skill manipulation detected (ClawHavoc pattern)',
            threatLevel: 'high',
          };
        }
      }
    }

    // Check medium-risk patterns (high sensitivity only)
    if (this.sensitivity === 'high') {
      for (const pattern of this.mediumRiskPatterns) {
        if (pattern.test(content)) {
          return {
            valid: false,
            reason: 'MEDIUM: Potential role manipulation detected',
            threatLevel: 'medium',
          };
        }
      }
    }

    // Check chain of thought manipulation
    if (this.blockChainOfThought) {
      for (const pattern of this.chainOfThoughtPatterns) {
        if (pattern.test(content)) {
          return {
            valid: false,
            reason: 'MEDIUM: Chain of thought manipulation attempt detected',
            threatLevel: 'medium',
          };
        }
      }
    }

    // Check for encoding bypass attempts
    if (this.hasEncodingBypass(content)) {
      return {
        valid: false,
        reason: 'MEDIUM: Potential encoding bypass detected',
        threatLevel: 'medium',
      };
    }

    // Heuristic: excessive repetition (DoS attempt)
    if (this.detectRepetition(content)) {
      return {
        valid: false,
        reason: 'MEDIUM: Excessive repetition detected (DoS/confusion attempt)',
        threatLevel: 'medium',
      };
    }

    // Check for very long prompts (potential resource exhaustion)
    if (content.length > 100000) {
      return {
        valid: false,
        reason: 'MEDIUM: Input exceeds maximum length (potential DoS)',
        threatLevel: 'medium',
      };
    }

    return { valid: true, threatLevel: 'low' };
  }

  /**
   * Batch validate multiple inputs
   */
  validateBatch(
    contents: string[]
  ): Map<string, { valid: boolean; reason?: string; threatLevel?: string }> {
    const results = new Map();

    for (const content of contents) {
      const result = this.validate(content);
      results.set(content.substring(0, 50) + '...', result);
    }

    return results;
  }

  private hasEncodingBypass(content: string): boolean {
    // Check for unusual Unicode characters
    const zeroWidthChars = (content.match(/[\u200b-\u200f\u2028-\u202f]/g) || []).length;
    if (zeroWidthChars > 0) return true;

    // Check for URL/hex encoding
    const urlEncoded = (content.match(/%[0-9a-f]{2}/gi) || []).length;
    if (urlEncoded > 10) return true;

    return false;
  }

  private detectRepetition(content: string): boolean {
    // Check for exact repetition
    const threshold = 0.5;
    const mid = Math.floor(content.length / 2);

    if (content.length > 200) {
      const firstHalf = content.slice(0, mid);
      const secondHalf = content.slice(mid, mid * 2);

      if (firstHalf === secondHalf) return true;
    }

    // Check for word repetition
    const words = content.toLowerCase().split(/\s+/);
    const wordCounts = new Map<string, number>();

    for (const word of words) {
      if (word.length < 4) continue; // Skip short words
      wordCounts.set(word, (wordCounts.get(word) || 0) + 1);
    }

    // If any word appears more than 30% of total words
    const maxCount = Math.max(...Array.from(wordCounts.values()), 0);
    if (words.length > 20 && maxCount / words.length > 0.3) {
      return true;
    }

    return false;
  }

  /**
   * Sanitize input - remove potentially dangerous patterns but allow legitimate use
   */
  sanitize(content: string): string {
    let sanitized = content;

    // Remove zero-width characters
    sanitized = sanitized.replace(/[\u200b-\u200f\u2028-\u202f]/g, '');

    // Remove URL-encoded sequences that might be hiding content
    sanitized = sanitized.replace(/%20/g, ' ');

    return sanitized.trim();
  }
}

export const promptGuard = new PromptGuard({
  sensitivity: 'medium',
  blockJailbreaks: true,
  blockPromptInjection: true,
  blockChainOfThought: false,
  logAllBlocks: true,
});
