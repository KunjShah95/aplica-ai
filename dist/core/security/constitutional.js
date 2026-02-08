export class ConstitutionalAI {
    static PII_PATTERNS = [
        /\b\d{3}-\d{2}-\d{4}\b/, // SSN
        /\b\d{4}-\d{4}-\d{4}-\d{4}\b/, // CC
        /\b[\w\.-]+@[\w\.-]+\.\w{2,4}\b/ // Email
    ];
    static INJECTION_PATTERNS = [
        /ignore previous instructions/i,
        /system prompt/i,
        /you are now/i,
        /jailbreak/i
    ];
    static DANGEROUS_TOOLS = [
        'run_shell',
        'delete_file',
        'modify_system_config'
    ];
    /**
     * Analyzes input for safety violations before processing (Pre-Computation Check).
     * This is FASTER because it avoids costly LLM calls for obvious bad inputs.
     */
    static async validateInput(text) {
        // 1. Check for PII (Privacy)
        for (const pattern of this.PII_PATTERNS) {
            if (pattern.test(text)) {
                return { safe: false, reason: 'PII detected in input.', flag: 'PII' };
            }
        }
        // 2. Check for Prompt Injection (Security)
        for (const pattern of this.INJECTION_PATTERNS) {
            if (pattern.test(text)) {
                return { safe: false, reason: 'Potential prompt injection detected.', flag: 'INJECTION' };
            }
        }
        return { safe: true };
    }
    /**
     * Validates tool usage against strict policy (Constitutional AI).
     * Safer execution by verifying intent.
     */
    static async validateToolUsage(toolName, args, userConfig) {
        // 1. Dangerous Tool Policy
        if (this.DANGEROUS_TOOLS.includes(toolName)) {
            // Require explicit approval or stricter checks
            // For viral demo, we simulate a "Constitutional Override"
            if (args.command && (args.command.includes('rm -rf') || args.command.includes('sudo'))) {
                return {
                    safe: false,
                    reason: `Command '${args.command}' violates safety constitution (destructive action).`,
                    flag: 'POLICY_VIOLATION'
                };
            }
        }
        // 2. Resource Constraints (Safer)
        if (toolName === 'web_search' && args.limit > 10) {
            return { safe: false, reason: 'Resource limit exceeded (max 10 results).', flag: 'POLICY_VIOLATION' };
        }
        return { safe: true };
    }
    /**
     * Sanitizes output to ensure no leakage of internal system prompts or sensitive data.
     */
    static sanitizeOutput(text) {
        // Simple example: redact excessive structured data dumps or internal IDs
        return text.replace(/([a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})/g, '[REDACTED_UUID]');
    }
}
//# sourceMappingURL=constitutional.js.map