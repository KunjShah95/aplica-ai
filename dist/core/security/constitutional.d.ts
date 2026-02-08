import { AgentConfig } from '../orchestrator.js';
export interface SafetyCheckResult {
    safe: boolean;
    reason?: string;
    flag?: 'HARMFUL' | 'PII' | 'INJECTION' | 'POLICY_VIOLATION';
}
export declare class ConstitutionalAI {
    private static PII_PATTERNS;
    private static INJECTION_PATTERNS;
    private static DANGEROUS_TOOLS;
    /**
     * Analyzes input for safety violations before processing (Pre-Computation Check).
     * This is FASTER because it avoids costly LLM calls for obvious bad inputs.
     */
    static validateInput(text: string): Promise<SafetyCheckResult>;
    /**
     * Validates tool usage against strict policy (Constitutional AI).
     * Safer execution by verifying intent.
     */
    static validateToolUsage(toolName: string, args: any, userConfig: AgentConfig): Promise<SafetyCheckResult>;
    /**
     * Sanitizes output to ensure no leakage of internal system prompts or sensitive data.
     */
    static sanitizeOutput(text: string): string;
}
//# sourceMappingURL=constitutional.d.ts.map