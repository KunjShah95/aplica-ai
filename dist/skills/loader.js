import * as fs from 'fs';
import * as path from 'path';
export class SkillLoader {
    skills = new Map();
    skillsPath;
    builtinsPath;
    customPath;
    constructor(options = {}) {
        this.skillsPath = options.skillsPath || './skills';
        this.builtinsPath = options.builtinsPath || './src/skills/builtins';
        this.customPath = options.customPath || './src/skills/custom';
    }
    async loadAll() {
        await Promise.all([this.loadBuiltinSkills(), this.loadCustomSkills()]);
        console.log(`Loaded ${this.skills.size} skills`);
    }
    async loadBuiltinSkills() {
        if (!fs.existsSync(this.builtinsPath))
            return;
        const files = fs
            .readdirSync(this.builtinsPath)
            .filter((f) => f.endsWith('.ts') || f.endsWith('.js'));
        for (const file of files) {
            try {
                const skill = await this.loadBuiltinSkill(file);
                if (skill) {
                    this.skills.set(skill.manifest.name, skill);
                }
            }
            catch (error) {
                console.error(`Failed to load builtin skill ${file}:`, error);
            }
        }
    }
    async loadBuiltinSkill(file) {
        const filePath = path.join(this.builtinsPath, file);
        const manifestPath = path.join(this.builtinsPath, file.replace(/\.(ts|js)$/, 'SKILL.md'));
        let manifest = null;
        if (fs.existsSync(manifestPath)) {
            manifest = await this.parseManifest(fs.readFileSync(manifestPath, 'utf-8'));
        }
        const module = await import(filePath);
        const SkillClass = Object.values(module)[0];
        if (typeof SkillClass !== 'function') {
            return null;
        }
        const skillInstance = new SkillClass();
        if (manifest) {
            skillInstance.manifest = manifest;
        }
        return skillInstance;
    }
    async loadCustomSkills() {
        if (!fs.existsSync(this.skillsPath)) {
            fs.mkdirSync(this.skillsPath, { recursive: true });
            return;
        }
        const skillDirs = fs.readdirSync(this.skillsPath).filter((f) => {
            const skillPath = path.join(this.skillsPath, f);
            return fs.statSync(skillPath).isDirectory();
        });
        for (const skillDir of skillDirs) {
            try {
                const skill = await this.loadCustomSkill(skillDir);
                if (skill) {
                    this.skills.set(skill.manifest.name, skill);
                }
            }
            catch (error) {
                console.error(`Failed to load custom skill ${skillDir}:`, error);
            }
        }
    }
    async loadCustomSkill(skillDir) {
        const skillPath = path.join(this.skillsPath, skillDir);
        const manifestPath = path.join(skillPath, 'SKILL.md');
        let indexPath = path.join(skillPath, 'index.js');
        if (!fs.existsSync(indexPath)) {
            indexPath = path.join(skillPath, 'index.ts');
        }
        if (!fs.existsSync(manifestPath)) {
            console.warn(`Skill ${skillDir} missing SKILL.md`);
            return null;
        }
        if (!fs.existsSync(indexPath)) {
            console.warn(`Skill ${skillDir} missing index.js or index.ts`);
            return null;
        }
        const manifest = this.parseManifestSync(manifestPath);
        const module = await import(indexPath);
        const executeFn = module.execute || module.default;
        if (typeof executeFn !== 'function') {
            console.warn(`Skill ${skillDir} missing execute function`);
            return null;
        }
        return {
            manifest,
            execute: executeFn,
        };
    }
    async parseManifest(content) {
        const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
        if (!frontmatterMatch) {
            throw new Error('Invalid manifest format');
        }
        try {
            const yaml = await import('js-yaml');
            const frontmatter = yaml.load(frontmatterMatch[1]);
            return {
                name: String(frontmatter.name || 'unnamed'),
                version: String(frontmatter.version || '1.0.0'),
                description: String(frontmatter.description || ''),
                author: frontmatter.author,
                license: frontmatter.license,
                triggers: this.parseTriggers(frontmatter.triggers),
                parameters: this.parseParameters(frontmatter.parameters),
                permissions: Array.isArray(frontmatter.permissions)
                    ? frontmatter.permissions
                    : [],
                examples: Array.isArray(frontmatter.examples) ? frontmatter.examples : [],
            };
        }
        catch (error) {
            throw new Error(`Failed to parse manifest: ${error}`);
        }
    }
    parseManifestSync(manifestPath) {
        const content = fs.readFileSync(manifestPath, 'utf-8');
        const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
        if (!frontmatterMatch) {
            throw new Error('Invalid manifest format');
        }
        try {
            const yaml = require('js-yaml');
            const frontmatter = yaml.load(frontmatterMatch[1]);
            return {
                name: String(frontmatter.name || 'unnamed'),
                version: String(frontmatter.version || '1.0.0'),
                description: String(frontmatter.description || ''),
                author: frontmatter.author,
                license: frontmatter.license,
                triggers: this.parseTriggers(frontmatter.triggers),
                parameters: this.parseParameters(frontmatter.parameters),
                permissions: Array.isArray(frontmatter.permissions)
                    ? frontmatter.permissions
                    : [],
                examples: Array.isArray(frontmatter.examples) ? frontmatter.examples : [],
            };
        }
        catch (error) {
            throw new Error(`Failed to parse manifest: ${error}`);
        }
    }
    parseTriggers(triggers) {
        if (!Array.isArray(triggers))
            return [];
        return triggers.map((t) => {
            const trigger = t;
            return {
                type: trigger.type || 'keyword',
                value: String(trigger.value || ''),
                description: trigger.description,
            };
        });
    }
    parseParameters(parameters) {
        if (!Array.isArray(parameters))
            return [];
        return parameters.map((p) => {
            const param = p;
            return {
                name: String(param.name || ''),
                type: param.type || 'string',
                required: Boolean(param.required),
                description: String(param.description || ''),
                default: param.default,
                enum: param.enum,
            };
        });
    }
    getSkill(name) {
        return this.skills.get(name);
    }
    getAllSkills() {
        return Array.from(this.skills.values());
    }
    findSkillsByTrigger(message) {
        const matching = [];
        for (const skill of this.skills.values()) {
            let maxScore = 0;
            for (const trigger of skill.manifest.triggers) {
                let score = 0;
                switch (trigger.type) {
                    case 'keyword':
                        if (message.toLowerCase().includes(trigger.value.toLowerCase())) {
                            score = 1;
                        }
                        break;
                    case 'command':
                        if (message.startsWith(trigger.value)) {
                            score = 10;
                        }
                        break;
                    case 'pattern':
                        try {
                            const regex = new RegExp(trigger.value, 'i');
                            if (regex.test(message)) {
                                score = 5;
                            }
                        }
                        catch {
                        }
                        break;
                }
                if (score > maxScore) {
                    maxScore = score;
                }
            }
            if (maxScore > 0) {
                matching.push({ skill: skill, score: maxScore });
            }
        }
        return matching.sort((a, b) => b.score - a.score).map((m) => m.skill);
    }
    registerSkill(skill) {
        this.skills.set(skill.manifest.name, skill);
    }
    unregisterSkill(name) {
        return this.skills.delete(name);
    }
    async reloadSkill(name) {
        const skill = this.skills.get(name);
        if (!skill)
            return false;
        if (skill.cleanup) {
            await skill.cleanup();
        }
        this.skills.delete(name);
        if (fs.existsSync(path.join(this.skillsPath, name))) {
            const newSkill = await this.loadCustomSkill(name);
            if (newSkill) {
                this.skills.set(name, newSkill);
                return true;
            }
        }
        return false;
    }
    getStats() {
        let builtin = 0;
        let custom = 0;
        for (const skill of this.skills.values()) {
            const skillPath = path.join(this.skillsPath, skill.manifest.name);
            if (fs.existsSync(skillPath)) {
                custom++;
            }
            else {
                builtin++;
            }
        }
        return {
            totalSkills: this.skills.size,
            builtinSkills: builtin,
            customSkills: custom,
        };
    }
}
export const skillLoader = new SkillLoader();
//# sourceMappingURL=loader.js.map