import { Skill, SkillExecutionContext, SkillResult } from '../loader.js';
export declare const manifest: Skill['manifest'];
export declare class EmailSkill implements Skill {
    manifest: import("../loader.js").SkillManifest;
    private mockEmails;
    execute(context: SkillExecutionContext): Promise<SkillResult>;
    private sendEmail;
    private draftEmail;
    private readEmails;
    private listEmails;
    private searchEmails;
    private getEmails;
}
//# sourceMappingURL=email.d.ts.map