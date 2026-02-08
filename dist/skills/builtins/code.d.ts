import { Skill, SkillExecutionContext, SkillResult } from '../loader.js';
export declare const manifest: Skill['manifest'];
export declare class CodeSkill implements Skill {
    manifest: import("../loader.js").SkillManifest;
    execute(context: SkillExecutionContext): Promise<SkillResult>;
    private formatFileList;
    private formatSize;
    private countResults;
}
//# sourceMappingURL=code.d.ts.map