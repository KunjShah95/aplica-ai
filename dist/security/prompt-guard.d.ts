export interface PromptGuardOptions {
    blockJailbreaks?: boolean;
    blockPromptInjection?: boolean;
    sensitivity?: 'low' | 'medium' | 'high';
}
export declare class PromptGuard {
    private blockJailbreaks;
    private blockPromptInjection;
    private sensitivity;
    private jailbreakPatterns;
    private injectionPatterns;
    constructor(options?: PromptGuardOptions);
    validate(content: string): {
        valid: boolean;
        reason?: string;
    };
    private detectRepetition;
}
export declare const promptGuard: PromptGuard;
//# sourceMappingURL=prompt-guard.d.ts.map