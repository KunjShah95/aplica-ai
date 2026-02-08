import { Skill, SkillExecutionContext, SkillResult } from '../loader.js';
export declare const manifest: Skill['manifest'];
export declare class ShellSkill implements Skill {
    manifest: import("../loader.js").SkillManifest;
    execute(context: SkillExecutionContext): Promise<SkillResult>;
}
//# sourceMappingURL=shell.d.ts.map