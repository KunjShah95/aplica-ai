import { Skill, SkillExecutionContext, SkillResult } from '../loader.js';
export declare const manifest: Skill['manifest'];
export declare class BrowserSkill implements Skill {
    manifest: import("../loader.js").SkillManifest;
    execute(context: SkillExecutionContext): Promise<SkillResult>;
    cleanup(): Promise<void>;
}
//# sourceMappingURL=browser.d.ts.map