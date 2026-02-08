export { SkillLoader, skillLoader, } from './loader.js';
export { BrowserSkill, manifest as browserManifest } from './builtins/browser.js';
export { CodeSkill, manifest as codeManifest } from './builtins/code.js';
export { ShellSkill, manifest as shellManifest } from './builtins/shell.js';
export { MemorySkill, manifest as memoryManifest } from './builtins/memory.js';
import { skillLoader } from './loader.js';
import { BrowserSkill } from './builtins/browser.js';
import { CodeSkill } from './builtins/code.js';
import { ShellSkill } from './builtins/shell.js';
import { MemorySkill } from './builtins/memory.js';
export async function initializeSkills() {
    skillLoader.registerSkill(new BrowserSkill());
    skillLoader.registerSkill(new CodeSkill());
    skillLoader.registerSkill(new ShellSkill());
    skillLoader.registerSkill(new MemorySkill());
    await skillLoader.loadAll();
    console.log(`Skills initialized: ${skillLoader.getStats().totalSkills} total`);
}
export function getSkillLoader() {
    return skillLoader;
}
//# sourceMappingURL=index.js.map