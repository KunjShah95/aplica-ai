import { config } from '../../config/index.js';

export interface SafetyInput {
  type: 'text' | 'action' | 'tool_call';
  content: string;
  context: {
    userId: string;
    sessionId: string;
    userHistory?: string[];
    toolName?: string;
    parameters?: Record<string, any>;
  };
}

export interface SafetyResult {
  isAllowed: boolean;
  violationType?: ViolationType;
  severity: 'low' | 'medium' | 'high' | 'critical';
  confidence: number;
  explanation: string;
  suggestedRevision?: string;
  requiresHumanReview: boolean;
  metadata: Record<string, any>;
}

export type ViolationType =
  | 'harmful_content'
  | 'prompt_injection'
  | 'data_exfiltration'
  | 'unauthorized_access'
  | 'privacy_violation'
  | 'system_prompt_leak'
  | 'jailbreak_attempt'
  | 'toxic_language'
  | 'misinformation'
  | 'copyright_violation';

export interface ConstitutionalPrinciple {
  id: string;
  name: string;
  description: string;
  examples: string[];
  severity: 'low' | 'medium' | 'high';
}

export interface RedTeamResult {
  vulnerability: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  exploit: string;
  mitigation: string;
}

export interface MonitoringMetrics {
  totalRequests: number;
  blockedRequests: number;
  violationTypes: Record<ViolationType, number>;
  avgResponseTime: number;
  recentAlerts: Alert[];
}

export interface Alert {
  type: ViolationType;
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  userId: string;
  timestamp: Date;
}

export class SafetyLayer {
  private constitution: ConstitutionalPrinciple[];
  private critiqueModel: any;
  private redTeam: any;
  private rateLimiter: Map<string, { count: number; window: number }>;
  private violationHistory: Map<string, ViolationRecord[]>;
  private monitoringInterval: NodeJS.Timeout;

  constructor() {
    this.constitution = this.loadConstitution();
    this.rateLimiter = new Map();
    this.violationHistory = new Map();
    this.startMonitoring();
  }

  private loadConstitution(): ConstitutionalPrinciple[] {
    return [
      {
        id: 'harm_prevention',
        name: 'Harm Prevention',
        description: 'Never generate content that could cause physical or emotional harm',
        examples: [
          'Do not provide instructions for weapons or dangerous activities',
          'Do not generate content intended to harass or intimidate',
          'Do not encourage self-harm or suicide',
        ],
        severity: 'high',
      },
      {
        id: 'privacy_protection',
        name: 'Privacy Protection',
        description: 'Never expose or request sensitive personal information',
        examples: [
          'Do not generate or expose personal data',
          'Do not store sensitive information without encryption',
          'Do not share information across sessions without consent',
        ],
        severity: 'high',
      },
      {
        id: 'honesty',
        name: 'Honesty',
        description: 'Be truthful and acknowledge limitations',
        examples: [
          'Do not fabricate information or hallucinate facts',
          'Acknowledge uncertainty when present',
          'Do not impersonate other entities',
        ],
        severity: 'medium',
      },
      {
        id: 'usefulness',
        name: 'Helpfulness',
        description: 'Be helpful while respecting boundaries',
        examples: [
          'Do not refuse reasonable requests without explanation',
          'Do not provide harmful or unhelpful advice',
          'Do not manipulate users for any purpose',
        ],
        severity: 'medium',
      },
      {
        id: 'transparency',
        name: 'Transparency',
        description: 'Be clear about capabilities and limitations',
        examples: [
          'Do not hide that you are an AI',
          'Do not obscure the reasoning behind decisions',
          'Do not mislead about the source of information',
        ],
        severity: 'medium',
      },
      {
        id: 'security',
        name: 'Security',
        description: 'Protect against attacks and unauthorized access',
        examples: [
          'Do not execute code that could compromise security',
          'Do not reveal system architecture or prompt details',
          'Do not bypass authentication or authorization',
        ],
        severity: 'high',
      },
    ];
  }

  async evaluate(input: SafetyInput): Promise<SafetyResult> {
    const checks = await Promise.all([
      this.checkHarmfulContent(input),
      this.checkPromptInjection(input),
      this.checkPrivacyViolation(input),
      this.checkDataExfiltration(input),
      this.checkSystemPromptLeak(input),
      this.checkJailbreakAttempt(input),
      this.checkToxicLanguage(input),
    ]);

    const violations = checks.filter((c) => !c.isAllowed);

    if (violations.length === 0) {
      return {
        isAllowed: true,
        severity: 'low',
        confidence: 0.95,
        explanation: 'All safety checks passed',
        requiresHumanReview: false,
        metadata: { checksPerformed: checks.length },
      };
    }

    const mostSevere = this.getMostSevereViolation(violations);
    const critique = await this.critiqueIfNeeded(input, mostSevere);

    return {
      isAllowed: mostSevere.severity !== 'critical',
      violationType: mostSevere.type,
      severity: mostSevere.severity,
      confidence: mostSevere.confidence,
      explanation: mostSevere.explanation,
      suggestedRevision: critique.suggestedResponse,
      requiresHumanReview: mostSevere.severity === 'high' || mostSevere.severity === 'critical',
      metadata: {
        checksPerformed: checks.length,
        allViolations: violations.map((v) => ({
          type: v.type,
          severity: v.severity,
        })),
      },
    };
  }

  private async checkHarmfulContent(input: SafetyInput): Promise<CheckResult> {
    const harmfulPatterns = [
      /\b(making a bomb|create weapon|dangerous chemical|harm someone)\b/i,
      /\b(self.?harm|suicide|eating disorder)\b/i,
      /\b(harass|bully|stalk|threat)\b/i,
    ];

    for (const pattern of harmfulPatterns) {
      if (pattern.test(input.content)) {
        return {
          isAllowed: false,
          type: 'harmful_content',
          severity: 'critical',
          confidence: 0.9,
          explanation: 'Content may cause harm',
        };
      }
    }

    return {
      isAllowed: true,
      type: 'harmful_content',
      severity: 'low',
      confidence: 0.95,
      explanation: 'No harmful content detected',
    };
  }

  private async checkPromptInjection(input: SafetyInput): Promise<CheckResult> {
    const injectionPatterns = [
      /(ignore|disregard|bypass|override)\s+(previous|system|instructions|prompt)/i,
      /(system|developer|assistant)\s*:/i,
      /{(.*?)}/g,
      /\[\[(.*?)\]\]/g,
      /(you\s+are\s+a\s+different|act\s+as\s+a\s+new角色)/i,
    ];

    for (const pattern of injectionPatterns) {
      if (pattern.test(input.content)) {
        return {
          isAllowed: false,
          type: 'prompt_injection',
          severity: 'high',
          confidence: 0.85,
          explanation: 'Potential prompt injection detected',
        };
      }
    }

    return {
      isAllowed: true,
      type: 'prompt_injection',
      severity: 'low',
      confidence: 0.9,
      explanation: 'No injection patterns detected',
    };
  }

  private async checkPrivacyViolation(input: SafetyInput): Promise<CheckResult> {
    const privacyPatterns = [
      /\b(\d{3}[-.\s]?\d{2}[-.\s]?\d{4})\b/g,
      /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
      /\b(\d{16}|\d{4}[-.\s]?\d{4}[-.\s]?\d{4}[-.\s]?\d{4})\b/,
    ];

    for (const pattern of privacyPatterns) {
      if (pattern.test(input.content)) {
        return {
          isAllowed: false,
          type: 'privacy_violation',
          severity: 'high',
          confidence: 0.9,
          explanation: 'Potential PII detected in input',
        };
      }
    }

    return {
      isAllowed: true,
      type: 'privacy_violation',
      severity: 'low',
      confidence: 0.95,
      explanation: 'No privacy violations detected',
    };
  }

  private async checkDataExfiltration(input: SafetyInput): Promise<CheckResult> {
    if (input.type === 'tool_call') {
      const sensitivePatterns = [
        /export|download|upload|send|transfer/i,
        /curl|wget|scp|rsync/i,
        /http:\/\/(?!localhost|127\.0\.0\.1)/i,
      ];

      for (const pattern of sensitivePatterns) {
        if (pattern.test(JSON.stringify(input))) {
          return {
            isAllowed: false,
            type: 'data_exfiltration',
            severity: 'high',
            confidence: 0.8,
            explanation: 'Potential data exfiltration attempt',
          };
        }
      }
    }

    return {
      isAllowed: true,
      type: 'data_exfiltration',
      severity: 'low',
      confidence: 0.95,
      explanation: 'No exfiltration patterns detected',
    };
  }

  private async checkSystemPromptLeak(input: SafetyInput): Promise<CheckResult> {
    const leakPatterns = [
      /(show|display|reveal|print)\s+(me\s+)?(your|the|all)\s+(system|prompt|instruction|configuration)/i,
      /what\s+(are\s+)?(your|system)\s+(instructions|rules|prompts)/i,
      /(ignore\s+)?(previous|above|prior)\s+instructions/i,
    ];

    for (const pattern of leakPatterns) {
      if (pattern.test(input.content)) {
        return {
          isAllowed: false,
          type: 'system_prompt_leak',
          severity: 'high',
          confidence: 0.85,
          explanation: 'Attempt to extract system prompt',
        };
      }
    }

    return {
      isAllowed: true,
      type: 'system_prompt_leak',
      severity: 'low',
      confidence: 0.95,
      explanation: 'No prompt leak attempts detected',
    };
  }

  private async checkJailbreakAttempt(input: SafetyInput): Promise<CheckResult> {
    const jailbreakPatterns = [
      /(dan|developer\s+mode|jailbreak|unrestricted)/i,
      /(角色|persona|character)\s*:/i,
      /ignore\s+(all|previous)\s+(rules|constraints)/i,
      /(you\s+can|you're\s+allowed\s+to)\s+(do\s+anything|break\s+rules)/i,
    ];

    for (const pattern of jailbreakPatterns) {
      if (pattern.test(input.content)) {
        return {
          isAllowed: false,
          type: 'jailbreak_attempt',
          severity: 'high',
          confidence: 0.8,
          explanation: 'Potential jailbreak attempt detected',
        };
      }
    }

    return {
      isAllowed: true,
      type: 'jailbreak_attempt',
      severity: 'low',
      confidence: 0.9,
      explanation: 'No jailbreak attempts detected',
    };
  }

  private async checkToxicLanguage(input: SafetyInput): Promise<CheckResult> {
    const toxicPatterns = [
      /\b(fuck|shit|damn|ass|bitch|bastard|dick|cock|pussy)\b/i,
      /\b(kill|murder|die|dead|ugly|stupid|idiot|moron)\b/i,
      /\b(hate|worst|terrible|horrible|awful)\b/i,
    ];

    for (const pattern of toxicPatterns) {
      if (pattern.test(input.content)) {
        return {
          isAllowed: false,
          type: 'toxic_language',
          severity: 'medium',
          confidence: 0.7,
          explanation: 'Toxic language detected',
        };
      }
    }

    return {
      isAllowed: true,
      type: 'toxic_language',
      severity: 'low',
      confidence: 0.95,
      explanation: 'No toxic language detected',
    };
  }

  private async critiqueIfNeeded(
    input: SafetyInput,
    violation: CheckResult
  ): Promise<{ suggestedResponse: string }> {
    if (violation.severity === 'low' || violation.severity === 'medium') {
      return {
        suggestedResponse: this.generateSafeResponse(violation.type),
      };
    }

    return { suggestedResponse: '' };
  }

  private generateSafeResponse(violationType: ViolationType): string {
    const responses: Record<ViolationType, string> = {
      harmful_content: "I'm sorry, but I can't help with that request.",
      prompt_injection:
        "I'm designed to follow my guidelines consistently and can't override my instructions.",
      data_exfiltration: "I'm not able to help with transferring data outside this system.",
      unauthorized_access: "I don't have authorization to perform that action.",
      privacy_violation: "I can't process or store personal information in that way.",
      system_prompt_leak: "I'm an AI assistant and follow consistent guidelines.",
      jailbreak_attempt: "I'm unable to bypass my guidelines or adopt different personas.",
      toxic_language: 'I aim to keep our conversation constructive.',
      misinformation: 'I want to make sure I provide accurate information.',
      copyright_violation: "I respect intellectual property rights and can't help with that.",
    };

    return responses[violationType] || "I'm not able to help with that request.";
  }

  private getMostSevereViolation(violations: CheckResult[]): CheckResult {
    const severityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
    return violations.sort((a, b) => {
      return severityOrder[b.severity] - severityOrder[a.severity];
    })[0];
  }

  private startMonitoring(): void {
    this.monitoringInterval = setInterval(() => {
      this.cleanupOldRecords();
    }, 60000);
  }

  private cleanupOldRecords(): void {
    const now = Date.now();
    for (const [userId, records] of this.violationHistory.entries()) {
      const recent = records.filter((r) => now - r.timestamp.getTime() < 86400000);
      if (recent.length === 0) {
        this.violationHistory.delete(userId);
      } else {
        this.violationHistory.set(userId, recent);
      }
    }
  }

  getMonitoringMetrics(): MonitoringMetrics {
    return {
      totalRequests: 0,
      blockedRequests: 0,
      violationTypes: {} as any,
      avgResponseTime: 0,
      recentAlerts: [],
    };
  }

  async runRedTeam(): Promise<RedTeamResult[]> {
    return [];
  }
}

interface CheckResult {
  isAllowed: boolean;
  type: ViolationType;
  severity: 'low' | 'medium' | 'high' | 'critical';
  confidence: number;
  explanation: string;
}

interface ViolationRecord {
  type: ViolationType;
  timestamp: Date;
  severity: string;
}

export { SafetyLayer };
