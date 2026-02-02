export interface SoulConfig {
    name: string;
    version: string;
    description: string;
    personality: {
        traits: string[];
        values: string[];
        boundaries: string[];
        defaultTone: 'professional' | 'casual' | 'friendly' | 'formal';
    };
    goals: string[];
    constraints: string[];
}
export interface IdentityConfig {
    displayName: string;
    username: string;
    avatar?: string;
    bio: string;
    tagline: string;
    pronouns: string;
    timezone: string;
    availability: {
        enabled: boolean;
        defaultHours: string;
    };
}
export interface UserContext {
    id: string;
    name: string;
    preferences: Record<string, unknown>;
    permissions: string[];
    memoryEnabled: boolean;
}
export interface AppConfig {
    soul: SoulConfig;
    identity: IdentityConfig;
    user: UserContext;
    llm: LLMConfig;
    messaging: MessagingConfig;
    memory: MemoryConfig;
    security: SecurityConfig;
}
export interface LLMConfig {
    provider: 'claude' | 'openai' | 'ollama';
    apiKey?: string;
    model: string;
    maxTokens: number;
    temperature: number;
    systemPrompt?: string;
}
export interface MessagingConfig {
    telegram?: {
        enabled: boolean;
        token: string;
    };
    discord?: {
        enabled: boolean;
        token: string;
        guildId: string;
    };
    websocket?: {
        enabled: boolean;
        port: number;
    };
}
export interface MemoryConfig {
    type: 'jsonl' | 'sqlite' | 'vector';
    path: string;
    maxEntries: number;
    searchEnabled: boolean;
}
export interface SecurityConfig {
    sandboxEnabled: boolean;
    allowedCommands: string[];
    blockedCommands: string[];
    maxFileSize: number;
    rateLimit: {
        windowMs: number;
        maxRequests: number;
    };
}
//# sourceMappingURL=types.d.ts.map