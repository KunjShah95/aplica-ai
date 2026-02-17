import * as fs from 'fs';
import * as path from 'path';
import { createHash, verify as verifySignature } from 'crypto';

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
  validate?: (params: Record<string, unknown>) => { valid: boolean; errors: string[] };
  cleanup?: () => Promise<void>;
}

export class SkillLoader {
  private skills: Map<string, Skill> = new Map();
  private skillsPath: string;
  private builtinsPath: string;
  private customPath: string;

  constructor(
    options: {
      skillsPath?: string;
      builtinsPath?: string;
      customPath?: string;
    } = {}
  ) {
    this.skillsPath = options.skillsPath || './skills';
    const isProd = process.env.NODE_ENV === 'production';
    this.builtinsPath =
      options.builtinsPath || (isProd ? './dist/skills/builtins' : './src/skills/builtins');
    this.customPath =
      options.customPath || (isProd ? './dist/skills/custom' : './src/skills/custom');
  }

  async loadAll(): Promise<void> {
    await Promise.all([this.loadBuiltinSkills(), this.loadCustomSkills()]);
    console.log(`Loaded ${this.skills.size} skills`);
  }

  private async loadBuiltinSkills(): Promise<void> {
    if (!fs.existsSync(this.builtinsPath)) return;

    const files = fs
      .readdirSync(this.builtinsPath)
      .filter((f) => f.endsWith('.ts') || f.endsWith('.js'));

    for (const file of files) {
      try {
        const skill = await this.loadBuiltinSkill(file);
        if (skill) {
          this.skills.set(skill.manifest.name, skill);
        }
      } catch (error) {
        console.error(`Failed to load builtin skill ${file}:`, error);
      }
    }
  }

  private async loadBuiltinSkill(file: string): Promise<Skill | null> {
    const filePath = path.join(this.builtinsPath, file);

    const manifestPath = path.join(this.builtinsPath, file.replace(/\.(ts|js)$/, 'SKILL.md'));
    let manifest: SkillManifest | null = null;

    if (fs.existsSync(manifestPath)) {
      manifest = await this.parseManifest(fs.readFileSync(manifestPath, 'utf-8'));
    }

    const module = await import(filePath);
    const SkillClass = Object.values(module)[0] as new () => Skill;

    if (typeof SkillClass !== 'function') {
      return null;
    }

    const skillInstance = new SkillClass();

    if (manifest) {
      const verified = await this.verifyManifest(manifest, filePath, true);
      if (!verified) return null;
      skillInstance.manifest = manifest;
    }

    return skillInstance;
  }

  private async loadCustomSkills(): Promise<void> {
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
      } catch (error) {
        console.error(`Failed to load custom skill ${skillDir}:`, error);
      }
    }
  }

  private async loadCustomSkill(skillDir: string): Promise<Skill | null> {
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

    const content = fs.readFileSync(manifestPath, 'utf-8');
    const manifest = await this.parseManifest(content);
    const verified = await this.verifyManifest(manifest, indexPath, false);
    if (!verified) return null;
    const module = await import(indexPath);
    const executeFn = module.execute || module.default;

    if (typeof executeFn !== 'function') {
      console.warn(`Skill ${skillDir} missing execute function`);
      return null;
    }

    return {
      manifest,
      execute: executeFn as (context: SkillExecutionContext) => Promise<SkillResult>,
    };
  }

  private async parseManifest(content: string): Promise<SkillManifest> {
    const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
    if (!frontmatterMatch) {
      throw new Error('Invalid manifest format');
    }

    try {
      const yaml = await import('js-yaml');
      // @ts-ignore
      const load = yaml.default?.load || yaml.load;
      const frontmatter = load(frontmatterMatch[1]) as Record<string, unknown>;

      return {
        name: String(frontmatter.name || 'unnamed'),
        version: String(frontmatter.version || '1.0.0'),
        description: String(frontmatter.description || ''),
        author: frontmatter.author as string | undefined,
        license: frontmatter.license as string | undefined,
        trust: (frontmatter.trust as SkillManifest['trust']) || undefined,
        signature: frontmatter.signature as string | undefined,
        integrity: frontmatter.integrity as string | undefined,
        triggers: this.parseTriggers(frontmatter.triggers),
        parameters: this.parseParameters(frontmatter.parameters),
        permissions: Array.isArray(frontmatter.permissions)
          ? (frontmatter.permissions as string[])
          : [],
        examples: Array.isArray(frontmatter.examples) ? (frontmatter.examples as string[]) : [],
      };
    } catch (error) {
      throw new Error(`Failed to parse manifest: ${error}`);
    }
  }

  private async verifyManifest(
    manifest: SkillManifest,
    indexPath: string,
    isBuiltin: boolean
  ): Promise<boolean> {
    const secureMode = process.env.SECURE_MODE === 'true';
    const requiredTrustLevels = (process.env.SKILL_TRUST_LEVELS || '')
      .split(',')
      .map((value) => value.trim())
      .filter(Boolean);

    const trust = manifest.trust || (isBuiltin ? 'verified' : 'unverified');
    if (secureMode) {
      const allowedTrustLevels =
        requiredTrustLevels.length > 0 ? requiredTrustLevels : ['verified', 'community'];
      if (!allowedTrustLevels.includes(trust)) {
        console.warn(`Skill ${manifest.name} blocked (trust=${trust})`);
        return false;
      }
    }

    const signatureRequired = process.env.SKILL_SIGNATURE_REQUIRED === 'true';
    if (signatureRequired && !manifest.signature) {
      console.warn(`Skill ${manifest.name} blocked (missing signature)`);
      return false;
    }

    const integrityRequired = process.env.SKILL_INTEGRITY_REQUIRED === 'true';
    let computedHash: string | null = null;
    if (integrityRequired || manifest.integrity || manifest.signature) {
      const content = fs.readFileSync(indexPath, 'utf-8');
      computedHash = createHash('sha256').update(content).digest('hex');
      if (!manifest.integrity || manifest.integrity !== computedHash) {
        console.warn(`Skill ${manifest.name} blocked (integrity mismatch)`);
        return false;
      }
    }

    if (manifest.signature) {
      const publicKey = process.env.SKILL_PUBLIC_KEY;
      if (!publicKey) {
        console.warn(`Skill ${manifest.name} blocked (missing public key)`);
        return false;
      }

      const algorithm = (process.env.SKILL_SIGNATURE_ALGORITHM || 'RSA-SHA256').toLowerCase();
      const data = Buffer.from(manifest.integrity || computedHash || '', 'utf8');
      const signature = Buffer.from(manifest.signature, 'base64');

      const isValid =
        algorithm === 'ed25519'
          ? verifySignature(null, data, publicKey, signature)
          : verifySignature(algorithm, data, publicKey, signature);

      if (!isValid) {
        console.warn(`Skill ${manifest.name} blocked (signature verification failed)`);
        return false;
      }
    }

    return true;
  }

  private parseTriggers(triggers: unknown): SkillTrigger[] {
    if (!Array.isArray(triggers)) return [];

    return triggers.map((t: unknown) => {
      const trigger = t as Record<string, unknown>;
      return {
        type: (trigger.type as SkillTrigger['type']) || 'keyword',
        value: String(trigger.value || ''),
        description: trigger.description as string | undefined,
      };
    });
  }

  private parseParameters(parameters: unknown): SkillParameter[] {
    if (!Array.isArray(parameters)) return [];

    return parameters.map((p: unknown) => {
      const param = p as Record<string, unknown>;
      return {
        name: String(param.name || ''),
        type: (param.type as SkillParameter['type']) || 'string',
        required: Boolean(param.required),
        description: String(param.description || ''),
        default: param.default,
        enum: param.enum as string[] | undefined,
      };
    });
  }

  getSkill(name: string): Skill | undefined {
    return this.skills.get(name);
  }

  getAllSkills(): Skill[] {
    return Array.from(this.skills.values());
  }

  findSkillsByTrigger(message: string): Skill[] {
    const matching: { skill: Skill; score: number }[] = [];

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
            } catch {
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

  registerSkill(skill: Skill): void {
    this.skills.set(skill.manifest.name, skill);
  }

  unregisterSkill(name: string): boolean {
    return this.skills.delete(name);
  }

  async reloadSkill(name: string): Promise<boolean> {
    const skill = this.skills.get(name);
    if (!skill) return false;

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

  getStats(): { totalSkills: number; builtinSkills: number; customSkills: number } {
    let builtin = 0;
    let custom = 0;

    for (const skill of this.skills.values()) {
      const skillPath = path.join(this.skillsPath, skill.manifest.name);
      if (fs.existsSync(skillPath)) {
        custom++;
      } else {
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
