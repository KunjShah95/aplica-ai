export interface ClawHubSkill {
    id: string;
    name: string;
    version: string;
    description: string;
    author: string;
    tags: string[];
    capabilities: string[];
    dependencies: SkillDependency[];
    manifest: SkillManifest;
    installed: boolean;
    installDate?: Date;
    updateAvailable?: boolean;
}
export interface SkillDependency {
    name: string;
    version?: string;
    optional?: boolean;
}
export interface SkillManifest {
    triggers: SkillTrigger[];
    parameters: SkillParameter[];
    examples: string[];
    permissions: string[];
}
export interface SkillTrigger {
    type: 'keyword' | 'pattern' | 'command' | 'context' | 'schedule' | 'webhook';
    value: string;
    caseSensitive?: boolean;
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
    skillId: string;
    conversationId: string;
    userId: string;
    trigger: string;
    parameters: Record<string, unknown>;
}
export interface SkillExecutionResult {
    success: boolean;
    output?: string;
    error?: string;
    duration: number;
}
export declare class ClawHubRegistry {
    private registryUrl;
    private installedSkills;
    private skillCache;
    private listeners;
    constructor(registryUrl?: string);
    searchSkills(query: string, options?: {
        tags?: string[];
        limit?: number;
    }): Promise<ClawHubSkill[]>;
    getSkill(skillId: string): Promise<ClawHubSkill | null>;
    getFeaturedSkills(): Promise<ClawHubSkill[]>;
    getPopularSkills(limit?: number): Promise<ClawHubSkill[]>;
    installSkill(skillId: string): Promise<boolean>;
    uninstallSkill(skillId: string): Promise<boolean>;
    updateSkill(skillId: string): Promise<boolean>;
    checkUpdates(): Promise<ClawHubSkill[]>;
    executeSkill(context: SkillExecutionContext): Promise<SkillExecutionResult>;
    getInstalledSkills(): ClawHubSkill[];
    getSkillByName(name: string): ClawHubSkill | undefined;
    getSkillsByTag(tag: string): ClawHubSkill[];
    getSkillStats(): {
        total: number;
        byCategory: Record<string, number>;
        recentlyInstalled: number;
        updatesAvailable: number;
    };
    on(listener: (event: RegistryEvent) => void): () => void;
    private emit;
}
export type RegistryEvent = {
    type: 'skill_installed';
    skill: ClawHubSkill;
} | {
    type: 'skill_uninstalled';
    skillId: string;
} | {
    type: 'skill_update_available';
    skill: ClawHubSkill;
} | {
    type: 'skill_executed';
    skillId: string;
    success: boolean;
};
export declare const clawHub: ClawHubRegistry;
export declare const clawHubTools: {
    clawhub_search(query: string, options?: {
        tags?: string[];
        limit?: number;
    }): Promise<ClawHubSkill[]>;
    clawhub_install(skillId: string): Promise<boolean>;
    clawhub_uninstall(skillId: string): Promise<boolean>;
    clawhub_list(): Promise<ClawHubSkill[]>;
    clawhub_updates(): Promise<ClawHubSkill[]>;
};
//# sourceMappingURL=clawhub.d.ts.map