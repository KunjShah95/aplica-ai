export class ClawHubRegistry {
    registryUrl;
    installedSkills = new Map();
    skillCache = new Map();
    listeners = new Set();
    constructor(registryUrl = 'https://clawhub.com/api/v1') {
        this.registryUrl = registryUrl;
    }
    async searchSkills(query, options) {
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
            const skills = (await response.json());
            for (const skill of skills) {
                this.skillCache.set(skill.id, skill);
            }
            return skills;
        }
        catch (error) {
            console.error('Skill search failed:', error);
            return [];
        }
    }
    async getSkill(skillId) {
        if (this.skillCache.has(skillId)) {
            return this.skillCache.get(skillId);
        }
        try {
            const response = await fetch(`${this.registryUrl}/skills/${skillId}`);
            if (!response.ok) {
                return null;
            }
            const skill = (await response.json());
            this.skillCache.set(skillId, skill);
            return skill;
        }
        catch (error) {
            console.error('Failed to get skill:', error);
            return null;
        }
    }
    async getFeaturedSkills() {
        try {
            const response = await fetch(`${this.registryUrl}/skills/featured`);
            if (!response.ok) {
                throw new Error('Failed to fetch featured skills');
            }
            return (await response.json());
        }
        catch (error) {
            console.error('Failed to get featured skills:', error);
            return [];
        }
    }
    async getPopularSkills(limit = 10) {
        try {
            const response = await fetch(`${this.registryUrl}/skills/popular?limit=${limit}`);
            if (!response.ok) {
                throw new Error('Failed to fetch popular skills');
            }
            return (await response.json());
        }
        catch (error) {
            console.error('Failed to get popular skills:', error);
            return [];
        }
    }
    async installSkill(skillId) {
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
        }
        catch (error) {
            console.error(`Failed to install skill ${skillId}:`, error);
            return false;
        }
    }
    async uninstallSkill(skillId) {
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
        }
        catch (error) {
            console.error(`Failed to uninstall skill ${skillId}:`, error);
            return false;
        }
    }
    async updateSkill(skillId) {
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
    async checkUpdates() {
        const updates = [];
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
    async executeSkill(context) {
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
            const result = (await response.json());
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
        }
        catch (error) {
            const result = {
                success: false,
                error: error instanceof Error ? error.message : String(error),
                duration: Date.now() - startTime,
            };
            this.emit({ type: 'skill_executed', skillId: context.skillId, success: false });
            return result;
        }
    }
    getInstalledSkills() {
        return Array.from(this.installedSkills.values());
    }
    getSkillByName(name) {
        return Array.from(this.installedSkills.values()).find((s) => s.name === name);
    }
    getSkillsByTag(tag) {
        return Array.from(this.installedSkills.values()).filter((s) => s.tags.includes(tag));
    }
    getSkillStats() {
        const stats = {
            total: this.installedSkills.size,
            byCategory: {},
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
    on(listener) {
        this.listeners.add(listener);
        return () => this.listeners.delete(listener);
    }
    emit(event) {
        for (const listener of this.listeners) {
            listener(event);
        }
    }
}
export const clawHub = new ClawHubRegistry();
export const clawHubTools = {
    async clawhub_search(query, options) {
        return clawHub.searchSkills(query, options);
    },
    async clawhub_install(skillId) {
        return clawHub.installSkill(skillId);
    },
    async clawhub_uninstall(skillId) {
        return clawHub.uninstallSkill(skillId);
    },
    async clawhub_list() {
        return clawHub.getInstalledSkills();
    },
    async clawhub_updates() {
        return clawHub.checkUpdates();
    },
};
//# sourceMappingURL=clawhub.js.map