import { Prisma } from '@prisma/client';
export interface PluginManifest {
    name: string;
    version: string;
    description?: string;
    author?: string;
    homepage?: string;
    main?: string;
    triggers?: {
        type: 'keyword' | 'pattern' | 'event';
        value: string;
    }[];
    parameters?: {
        name: string;
        type: 'string' | 'number' | 'boolean' | 'array' | 'object';
        required?: boolean;
        default?: unknown;
        description?: string;
    }[];
    permissions?: string[];
    dependencies?: string[];
    settings?: {
        name: string;
        type: string;
        default?: unknown;
        description?: string;
    }[];
}
export interface PluginContext {
    pluginId: string;
    settings: Record<string, unknown>;
    log: (message: string) => void;
    error: (message: string) => void;
}
export interface PluginInstance {
    manifest: PluginManifest;
    execute: (context: PluginContext, params: Record<string, unknown>) => Promise<unknown>;
    onLoad?: () => Promise<void>;
    onUnload?: () => Promise<void>;
}
export declare class PluginManager {
    private plugins;
    private pluginsDir;
    constructor(pluginsDir?: string);
    loadFromDirectory(): Promise<void>;
    loadPlugin(pluginPath: string): Promise<boolean>;
    unloadPlugin(name: string): Promise<boolean>;
    enablePlugin(name: string): Promise<void>;
    disablePlugin(name: string): Promise<void>;
    updateSettings(name: string, settings: Record<string, unknown>): Promise<void>;
    execute(name: string, params: Record<string, unknown>): Promise<unknown>;
    findByTrigger(type: 'keyword' | 'pattern' | 'event', value: string): Promise<string[]>;
    getLoaded(): string[];
    getManifest(name: string): PluginManifest | undefined;
    list(): Promise<{
        name: string;
        version: string;
        description: string | null;
        id: string;
        createdAt: Date;
        settings: Prisma.JsonValue;
        author: string | null;
        updatedAt: Date;
        homepage: string | null;
        manifest: Prisma.JsonValue;
        isInstalled: boolean;
        isEnabled: boolean;
        installedAt: Date | null;
    }[]>;
    getInstalled(): Promise<{
        name: string;
        version: string;
        description: string | null;
        id: string;
        createdAt: Date;
        settings: Prisma.JsonValue;
        author: string | null;
        updatedAt: Date;
        homepage: string | null;
        manifest: Prisma.JsonValue;
        isInstalled: boolean;
        isEnabled: boolean;
        installedAt: Date | null;
    }[]>;
    getEnabled(): Promise<{
        name: string;
        version: string;
        description: string | null;
        id: string;
        createdAt: Date;
        settings: Prisma.JsonValue;
        author: string | null;
        updatedAt: Date;
        homepage: string | null;
        manifest: Prisma.JsonValue;
        isInstalled: boolean;
        isEnabled: boolean;
        installedAt: Date | null;
    }[]>;
}
export declare const pluginManager: PluginManager;
//# sourceMappingURL=manager.d.ts.map