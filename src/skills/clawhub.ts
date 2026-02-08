import { randomUUID } from 'crypto';

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

export class ClawHubRegistry {
  private registryUrl: string;
  private installedSkills: Map<string, ClawHubSkill> = new Map();
  private skillCache: Map<string, ClawHubSkill> = new Map();
  private listeners: Set<(event: RegistryEvent) => void> = new Set();

  constructor(registryUrl: string = 'https://clawhub.com/api/v1') {
    this.registryUrl = registryUrl;
  }

  async searchSkills(
    query: string,
    options?: { tags?: string[]; limit?: number }
  ): Promise<ClawHubSkill[]> {
    try {
      const params = new URLSearchParams({
        q: query,
        ...(options?.tags ? { tags: options.tags.join(',') } : {}),
        ...(options?.limit ? { limit: options.limit.toString() } : {}),
      });

      const response = await fetch(`${this.registryUrl}/skills/search?${params}`);
      if (!response.ok) {
        throw new Error(`Search failed: ${response.statusText}`);
      }

      const skills = (await response.json()) as ClawHubSkill[];
      for (const skill of skills) {
        this.skillCache.set(skill.id, skill);
      }

      return skills;
    } catch (error) {
      console.error('Skill search failed:', error);
      return [];
    }
  }

  async getSkill(skillId: string): Promise<ClawHubSkill | null> {
    if (this.skillCache.has(skillId)) {
      return this.skillCache.get(skillId)!;
    }

    try {
      const response = await fetch(`${this.registryUrl}/skills/${skillId}`);
      if (!response.ok) {
        return null;
      }

      const skill = (await response.json()) as ClawHubSkill;
      this.skillCache.set(skillId, skill);
      return skill;
    } catch (error) {
      console.error('Failed to get skill:', error);
      return null;
    }
  }

  async getFeaturedSkills(): Promise<ClawHubSkill[]> {
    try {
      const response = await fetch(`${this.registryUrl}/skills/featured`);
      if (!response.ok) {
        throw new Error('Failed to fetch featured skills');
      }

      return (await response.json()) as ClawHubSkill[];
    } catch (error) {
      console.error('Failed to get featured skills:', error);
      return [];
    }
  }

  async getPopularSkills(limit: number = 10): Promise<ClawHubSkill[]> {
    try {
      const response = await fetch(`${this.registryUrl}/skills/popular?limit=${limit}`);
      if (!response.ok) {
        throw new Error('Failed to fetch popular skills');
      }

      return (await response.json()) as ClawHubSkill[];
    } catch (error) {
      console.error('Failed to get popular skills:', error);
      return [];
    }
  }

  async installSkill(skillId: string): Promise<boolean> {
    const skill = await this.getSkill(skillId);
    if (!skill) {
      console.error(`Skill ${skillId} not found`);
      return false;
    }

    try {
      const response = await fetch(`${this.registryUrl}/skills/${skillId}/install`, {
        method: 'POST',
      });

      if (!response.ok) {
        throw new Error(`Install failed: ${response.statusText}`);
      }

      skill.installed = true;
      skill.installDate = new Date();
      this.installedSkills.set(skillId, skill);
      this.emit({ type: 'skill_installed', skill });

      console.log(`Skill installed: ${skill.name} (${skill.version})`);
      return true;
    } catch (error) {
      console.error(`Failed to install skill ${skillId}:`, error);
      return false;
    }
  }

  async uninstallSkill(skillId: string): Promise<boolean> {
    const skill = this.installedSkills.get(skillId);
    if (!skill) {
      console.error(`Skill ${skillId} is not installed`);
      return false;
    }

    try {
      const response = await fetch(`${this.registryUrl}/skills/${skillId}/uninstall`, {
        method: 'POST',
      });

      if (!response.ok) {
        throw new Error(`Uninstall failed: ${response.statusText}`);
      }

      skill.installed = false;
      this.installedSkills.delete(skillId);
      this.emit({ type: 'skill_uninstalled', skillId });

      console.log(`Skill uninstalled: ${skill.name}`);
      return true;
    } catch (error) {
      console.error(`Failed to uninstall skill ${skillId}:`, error);
      return false;
    }
  }

  async updateSkill(skillId: string): Promise<boolean> {
    const skill = this.installedSkills.get(skillId);
    if (!skill) {
      console.error(`Skill ${skillId} is not installed`);
      return false;
    }

    const latest = await this.getSkill(skillId);
    if (!latest || latest.version === skill.version) {
      console.log(`Skill ${skill.name} is already up to date`);
      return true;
    }

    await this.uninstallSkill(skillId);
    const installed = await this.installSkill(skillId);

    if (installed) {
      skill.updateAvailable = false;
    }

    return installed;
  }

  async checkUpdates(): Promise<ClawHubSkill[]> {
    const updates: ClawHubSkill[] = [];

    for (const skill of this.installedSkills.values()) {
      const latest = await this.getSkill(skill.id);
      if (latest && latest.version !== skill.version) {
        skill.updateAvailable = true;
        updates.push(latest);
        this.emit({ type: 'skill_update_available', skill: latest });
      }
    }

    return updates;
  }

  async executeSkill(context: SkillExecutionContext): Promise<SkillExecutionResult> {
    const startTime = Date.now();
    const skill = this.installedSkills.get(context.skillId);

    if (!skill) {
      return {
        success: false,
        error: `Skill ${context.skillId} is not installed`,
        duration: Date.now() - startTime,
      };
    }

    try {
      const response = await fetch(`${this.registryUrl}/skills/${context.skillId}/execute`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(context),
      });

      if (!response.ok) {
        throw new Error(`Execution failed: ${response.statusText}`);
      }

      const result = (await response.json()) as {
        success?: boolean;
        output?: string;
        error?: string;
      };
      this.emit({
        type: 'skill_executed',
        skillId: context.skillId,
        success: result.success || false,
      });

      return {
        success: result.success || false,
        output: result.output,
        error: result.error,
        duration: Date.now() - startTime,
      };
    } catch (error) {
      const result = {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        duration: Date.now() - startTime,
      };
      this.emit({ type: 'skill_executed', skillId: context.skillId, success: false });
      return result;
    }
  }

  getInstalledSkills(): ClawHubSkill[] {
    return Array.from(this.installedSkills.values());
  }

  getSkillByName(name: string): ClawHubSkill | undefined {
    return Array.from(this.installedSkills.values()).find((s) => s.name === name);
  }

  getSkillsByTag(tag: string): ClawHubSkill[] {
    return Array.from(this.installedSkills.values()).filter((s) => s.tags.includes(tag));
  }

  getSkillStats(): {
    total: number;
    byCategory: Record<string, number>;
    recentlyInstalled: number;
    updatesAvailable: number;
  } {
    const stats = {
      total: this.installedSkills.size,
      byCategory: {} as Record<string, number>,
      recentlyInstalled: 0,
      updatesAvailable: 0,
    };

    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    for (const skill of this.installedSkills.values()) {
      stats.byCategory[skill.tags[0] || 'uncategorized'] =
        (stats.byCategory[skill.tags[0] || 'uncategorized'] || 0) + 1;

      if (skill.installDate && skill.installDate > weekAgo) {
        stats.recentlyInstalled++;
      }

      if (skill.updateAvailable) {
        stats.updatesAvailable++;
      }
    }

    return stats;
  }

  on(listener: (event: RegistryEvent) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private emit(event: RegistryEvent): void {
    for (const listener of this.listeners) {
      listener(event);
    }
  }
}

export type RegistryEvent =
  | { type: 'skill_installed'; skill: ClawHubSkill }
  | { type: 'skill_uninstalled'; skillId: string }
  | { type: 'skill_update_available'; skill: ClawHubSkill }
  | { type: 'skill_executed'; skillId: string; success: boolean };

export const clawHub = new ClawHubRegistry();

export const clawHubTools = {
  async clawhub_search(
    query: string,
    options?: { tags?: string[]; limit?: number }
  ): Promise<ClawHubSkill[]> {
    return clawHub.searchSkills(query, options);
  },

  async clawhub_install(skillId: string): Promise<boolean> {
    return clawHub.installSkill(skillId);
  },

  async clawhub_uninstall(skillId: string): Promise<boolean> {
    return clawHub.uninstallSkill(skillId);
  },

  async clawhub_list(): Promise<ClawHubSkill[]> {
    return clawHub.getInstalledSkills();
  },

  async clawhub_updates(): Promise<ClawHubSkill[]> {
    return clawHub.checkUpdates();
  },
};
