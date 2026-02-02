import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'yaml';
import { AppConfig, SoulConfig, IdentityConfig, UserContext, LLMConfig, MessagingConfig } from './types';

export class ConfigLoader {
  private config: AppConfig | null = null;

  async load(): Promise<AppConfig> {
    if (this.config) {
      return this.config;
    }

    const basePath = process.cwd();
    const soulPath = path.join(basePath, 'SOUL.md');
    const identityPath = path.join(basePath, 'IDENTITY.md');
    const userPath = path.join(basePath, 'USER.md');

    if (!fs.existsSync(soulPath)) {
      throw new Error(`SOUL.md not found at ${soulPath}`);
    }

    const soul = await this.loadSoulConfig(soulPath);
    const identity = await this.loadIdentityConfig(identityPath);
    const user = await this.loadUserContext(userPath);
    const llm = this.loadLLMConfig();
    const messaging = this.loadMessagingConfig();
    const memory = this.loadMemoryConfig();
    const security = this.loadSecurityConfig();

    this.config = {
      soul,
      identity,
      user,
      llm,
      messaging,
      memory,
      security
    };

    return this.config;
  }

  private async loadSoulConfig(filePath: string): Promise<SoulConfig> {
    const content = fs.readFileSync(filePath, 'utf-8');
    const frontmatter = this.extractFrontmatter(content);

    return {
      name: String(frontmatter.name || 'SentinelBot'),
      version: String(frontmatter.version || '1.0.0'),
      description: String(frontmatter.description || 'AI Personal Assistant'),
      personality: {
        traits: Array.isArray(frontmatter.traits) ? frontmatter.traits as string[] : [],
        values: Array.isArray(frontmatter.values) ? frontmatter.values as string[] : [],
        boundaries: Array.isArray(frontmatter.boundaries) ? frontmatter.boundaries as string[] : [],
        defaultTone: (frontmatter.defaultTone as 'professional' | 'casual' | 'friendly' | 'formal') || 'professional'
      },
      goals: Array.isArray(frontmatter.goals) ? frontmatter.goals as string[] : [],
      constraints: Array.isArray(frontmatter.constraints) ? frontmatter.constraints as string[] : []
    };
  }

  private async loadIdentityConfig(filePath: string): Promise<IdentityConfig> {
    const content = fs.existsSync(filePath)
      ? fs.readFileSync(filePath, 'utf-8')
      : this.getDefaultIdentity();
    const frontmatter = this.extractFrontmatter(content);

    const availability = frontmatter.availability as Record<string, unknown> | undefined;

    return {
      displayName: String(frontmatter.displayName || 'Sentinel'),
      username: String(frontmatter.username || 'sentinel_bot'),
      avatar: frontmatter.avatar as string | undefined,
      bio: String(frontmatter.bio || 'AI Personal Assistant'),
      tagline: String(frontmatter.tagline || 'Your trusted AI companion'),
      pronouns: String(frontmatter.pronouns || 'it/it'),
      timezone: String(frontmatter.timezone || 'UTC'),
      availability: {
        enabled: Boolean(availability?.enabled ?? true),
        defaultHours: String(availability?.defaultHours || '24/7')
      }
    };
  }

  private async loadUserContext(filePath: string): Promise<UserContext> {
    const content = fs.existsSync(filePath)
      ? fs.readFileSync(filePath, 'utf-8')
      : this.getDefaultUser();
    const frontmatter = this.extractFrontmatter(content);

    return {
      id: String(frontmatter.id || 'default'),
      name: String(frontmatter.name || 'User'),
      preferences: (frontmatter.preferences as Record<string, unknown>) || {},
      permissions: Array.isArray(frontmatter.permissions) ? frontmatter.permissions as string[] : ['basic'],
      memoryEnabled: Boolean(frontmatter.memoryEnabled ?? true)
    };
  }

  private loadLLMConfig(): LLMConfig {
    return {
      provider: (process.env.LLM_PROVIDER as 'claude' | 'openai' | 'ollama') || 'claude',
      apiKey: process.env.LLM_API_KEY,
      model: process.env.LLM_MODEL || 'claude-sonnet-4-20250514',
      maxTokens: parseInt(process.env.LLM_MAX_TOKENS || '4096'),
      temperature: parseFloat(process.env.LLM_TEMPERATURE || '0.7'),
      systemPrompt: process.env.LLM_SYSTEM_PROMPT
    };
  }

  private loadMessagingConfig(): MessagingConfig {
    const telegramEnabled = process.env.TELEGRAM_ENABLED === 'true';
    const discordEnabled = process.env.DISCORD_ENABLED === 'true';

    return {
      telegram: telegramEnabled ? {
        enabled: true,
        token: process.env.TELEGRAM_TOKEN || ''
      } : undefined,
      discord: discordEnabled ? {
        enabled: true,
        token: process.env.DISCORD_TOKEN || '',
        guildId: process.env.DISCORD_GUILD_ID || ''
      } : undefined,
      websocket: {
        enabled: process.env.WS_ENABLED !== 'false',
        port: parseInt(process.env.WS_PORT || '3001')
      }
    };
  }

  private loadMemoryConfig() {
    return {
      type: (process.env.MEMORY_TYPE as 'jsonl' | 'sqlite' | 'vector') || 'jsonl',
      path: process.env.MEMORY_PATH || './memory',
      maxEntries: parseInt(process.env.MEMORY_MAX_ENTRIES || '10000'),
      searchEnabled: process.env.MEMORY_SEARCH !== 'false'
    };
  }

  private loadSecurityConfig() {
    return {
      sandboxEnabled: process.env.SANDBOX_ENABLED === 'true',
      allowedCommands: (process.env.ALLOWED_COMMANDS || '').split(',').filter(Boolean),
      blockedCommands: (process.env.BLOCKED_COMMANDS || 'rm,del,format').split(',').filter(Boolean),
      maxFileSize: parseInt(process.env.MAX_FILE_SIZE || '10485760'),
      rateLimit: {
        windowMs: parseInt(process.env.RATE_LIMIT_WINDOW || '60000'),
        maxRequests: parseInt(process.env.RATE_LIMIT_MAX || '100')
      }
    };
  }

  private extractFrontmatter(content: string): Record<string, unknown> {
    const match = content.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
    if (match) {
      try {
        return yaml.parse(match[1]) || {};
      } catch {
        return {};
      }
    }
    return {};
  }

  private getDefaultIdentity(): string {
    return `---\ndisplayName: Sentinel\nusername: sentinel_bot\nbio: AI Personal Assistant\ntagline: Your trusted AI companion\n---\n`;
  }

  private getDefaultUser(): string {
    return `---\nid: default\nname: User\nmemoryEnabled: true\n---\n`;
  }

  getConfig(): AppConfig | null {
    return this.config;
  }
}

export const configLoader = new ConfigLoader();
