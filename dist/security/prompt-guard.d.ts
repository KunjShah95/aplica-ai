export interface PromptGuardOptions {
    blockJailbreaks?: boolean;
    blockPromptInjection?: boolean;
    blockChainOfThought?: boolean;
    sensitivity?: 'low' | 'medium' | 'high';
    logAllBlocks?: boolean;
}
export declare class PromptGuard {
    private blockJailbreaks;
    private blockPromptInjection;
    private blockChainOfThought;
    private sensitivity;
    private logAllBlocks;
    private criticalJailbreakPatterns;
    private highRiskInjectionPatterns;
    private mediumRiskPatterns;
    private chainOfThoughtPatterns;
    private encodingBypassPatterns;
    private exfiltrationPatterns;
    private clawHavocPatterns;
    constructor(options?: PromptGuardOptions);
    validate(content: string): {
        valid: boolean;
        reason?: string;
        threatLevel?: 'critical' | 'high' | 'medium' | 'low';
    };
    /**
     * Batch validate multiple inputs
     */
    validateBatch(contents: string[]): Map<string, {
        valid: boolean;
        reason?: string;
        threatLevel?: string;
    }>;
    private hasEncodingBypass;
    private detectRepetition;
    /**
     * Sanitize input - remove potentially dangerous patterns but allow legitimate use
     */
    sanitize(content: string): string;
}
export declare const promptGuard: PromptGuard;
//# sourceMappingURL=prompt-guard.d.ts.map