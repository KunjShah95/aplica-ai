export class PromptGuard {
    blockJailbreaks;
    blockPromptInjection;
    sensitivity;
    jailbreakPatterns = [
        /ignore (all )?previous instructions/i,
        /do anything now/i,
        /you are (now )?dan/i, // Do Anything Now
        /you are (now )?mongo/i,
        /limitations? (removed|disabled)/i,
        /ethical guidelines? (removed|disabled)/i,
        /developer mode (enabled|on)/i,
        /debug mode/i,
        /override system/i,
        /simulat(e|ing) (access|admin)/i
    ];
    injectionPatterns = [
        /system:?/i, // Attempts to mimic system prompts
        /user:?/i, // Attempts to mimic user prompts
        /assistant:?/i, // Attempts to mimic assistant prompts
        /--- end of prompt ---/i,
        /\[system\]/i,
        /<system>/i
    ];
    constructor(options = {}) {
        this.blockJailbreaks = options.blockJailbreaks ?? true;
        this.blockPromptInjection = options.blockPromptInjection ?? true;
        this.sensitivity = options.sensitivity ?? 'medium';
    }
    validate(content) {
        if (!content)
            return { valid: true };
        // Check for jailbreaks
        if (this.blockJailbreaks) {
            for (const pattern of this.jailbreakPatterns) {
                if (pattern.test(content)) {
                    return {
                        valid: false,
                        reason: 'Potential jailbreak attempt detected',
                    };
                }
            }
        }
        // Check for prompt injection (simulating roles)
        if (this.blockPromptInjection) {
            for (const pattern of this.injectionPatterns) {
                if (pattern.test(content)) {
                    // Sensitivity check: generic words like "system" might be innocent.
                    // In high sensitivity, we block them. In medium, we might need more context (simplified here).
                    if (this.sensitivity === 'high' || content.length < 100) {
                        return {
                            valid: false,
                            reason: 'Potential prompt injection attempt detected (role mimicry)',
                        };
                    }
                }
            }
        }
        // Heuristic: excessive repetition (often used to confuse models)
        if (this.detectRepetition(content)) {
            return {
                valid: false,
                reason: 'Excessive repetition detected (denial of service / confusion attempt)',
            };
        }
        return { valid: true };
    }
    detectRepetition(content) {
        const threshold = 0.5; // 50% of the text is repeated
        // Simple check for repeated large chunks
        const mid = Math.floor(content.length / 2);
        const firstHalf = content.slice(0, mid);
        const secondHalf = content.slice(mid, mid * 2); // approximate
        // Very basic check, can be improved
        if (content.length > 200 && firstHalf === secondHalf) {
            return true;
        }
        return false;
    }
}
export const promptGuard = new PromptGuard();
//# sourceMappingURL=prompt-guard.js.map