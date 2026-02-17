export interface SkillManifest {
    name: string;
    version: string;
    description: string;
    author?: string;
    license?: string;
    trust?: 'verified' | 'community' | 'unverified';
    signature?: string;
    integrity?: string;
    triggers: SkillTrigger[];
    parameters: SkillParameter[];
    permissions: string[];
    examples: string[];
}
export interface SkillTrigger {
    type: 'keyword' | 'pattern' | 'command' | 'context';
    value: string;
    description?: string;
}
export interface SkillParameter {
    name: string;
    type: 'string' | 'number' | 'boolean' | 'array' | 'object';
    required: boolean;
    description: string;
    default?: unknown;
    enum?: string[];
}
export interface SkillExecutionContext {
    userId: string;
    conversationId: string;
    message: string;
    parameters: Record<string, unknown>;
    memory: {
        get: (key: string) => Promise<unknown>;
        set: (key: string, value: unknown) => Promise<void>;
    };
}
export interface SkillResult {
    success: boolean;
    output: string;
    data?: unknown;
    error?: string;
    nextAction?: string;
}
export interface Skill {
    manifest: SkillManifest;
    execute: (context: SkillExecutionContext) => Promise<SkillResult>;
    validate?: (params: Record<string, unknown>) => {
        valid: boolean;
        errors: string[];
    };
    cleanup?: () => Promise<void>;
}
export declare class SkillLoader {
    private skills;
    private skillsPath;
    private builtinsPath;
    private customPath;
    constructor(options?: {
        skillsPath?: string;
        builtinsPath?: string;
        customPath?: string;
    });
    loadAll(): Promise<void>;
    private loadBuiltinSkills;
    private loadBuiltinSkill;
    private loadCustomSkills;
    private loadCustomSkill;
    private parseManifest;
    private verifyManifest;
    private parseTriggers;
    private parseParameters;
    getSkill(name: string): Skill | undefined;
    getAllSkills(): Skill[];
    findSkillsByTrigger(message: string): Skill[];
    registerSkill(skill: Skill): void;
    unregisterSkill(name: string): boolean;
    reloadSkill(name: string): Promise<boolean>;
    getStats(): {
        totalSkills: number;
        builtinSkills: number;
        customSkills: number;
    };
}
export declare const skillLoader: SkillLoader;
//# sourceMappingURL=loader.d.ts.map