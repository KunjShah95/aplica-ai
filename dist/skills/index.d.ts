export { SkillLoader, skillLoader, Skill, SkillExecutionContext, SkillResult, SkillManifest, SkillTrigger, SkillParameter, } from './loader.js';
export { BrowserSkill, manifest as browserManifest } from './builtins/browser.js';
export { CodeSkill, manifest as codeManifest } from './builtins/code.js';
export { ShellSkill, manifest as shellManifest } from './builtins/shell.js';
export { MemorySkill, manifest as memoryManifest } from './builtins/memory.js';
export declare function initializeSkills(): Promise<void>;
export declare function getSkillLoader(): import("./loader.js").SkillLoader;
//# sourceMappingURL=index.d.ts.map