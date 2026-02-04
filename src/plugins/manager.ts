import { db } from '../db/index.js';
import { Prisma } from '@prisma/client';
import * as fs from 'fs/promises';
import * as path from 'path';

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

export class PluginManager {
    private plugins: Map<string, PluginInstance> = new Map();
    private pluginsDir: string;

    constructor(pluginsDir: string = './plugins') {
        this.pluginsDir = pluginsDir;
    }

    async loadFromDirectory(): Promise<void> {
        try {
            const entries = await fs.readdir(this.pluginsDir, { withFileTypes: true });

            for (const entry of entries) {
                if (entry.isDirectory()) {
                    const pluginPath = path.join(this.pluginsDir, entry.name);
                    await this.loadPlugin(pluginPath);
                }
            }
        } catch (error) {
            console.error('Failed to load plugins:', error);
        }
    }

    async loadPlugin(pluginPath: string): Promise<boolean> {
        try {
            const manifestPath = path.join(pluginPath, 'manifest.json');
            const manifestContent = await fs.readFile(manifestPath, 'utf-8');
            const manifest: PluginManifest = JSON.parse(manifestContent);

            const mainFile = manifest.main || 'index.js';
            const mainPath = path.join(pluginPath, mainFile);
            const plugin = await import(mainPath);

            const instance: PluginInstance = {
                manifest,
                execute: plugin.execute || plugin.default?.execute,
                onLoad: plugin.onLoad || plugin.default?.onLoad,
                onUnload: plugin.onUnload || plugin.default?.onUnload,
            };

            if (!instance.execute) {
                throw new Error(`Plugin ${manifest.name} has no execute function`);
            }

            this.plugins.set(manifest.name, instance);

            await db.plugin.upsert({
                where: { name: manifest.name },
                create: {
                    name: manifest.name,
                    version: manifest.version,
                    description: manifest.description,
                    author: manifest.author,
                    homepage: manifest.homepage,
                    manifest: manifest as unknown as any,
                    isInstalled: true,
                    isEnabled: true,
                    installedAt: new Date(),
                },
                update: {
                    version: manifest.version,
                    description: manifest.description,
                    manifest: manifest as unknown as any,
                },
            });

            if (instance.onLoad) {
                await instance.onLoad();
            }

            console.log(`Loaded plugin: ${manifest.name} v${manifest.version}`);
            return true;
        } catch (error) {
            console.error(`Failed to load plugin from ${pluginPath}:`, error);
            return false;
        }
    }

    async unloadPlugin(name: string): Promise<boolean> {
        const instance = this.plugins.get(name);
        if (!instance) return false;

        if (instance.onUnload) {
            await instance.onUnload();
        }

        this.plugins.delete(name);
        return true;
    }

    async enablePlugin(name: string): Promise<void> {
        await db.plugin.update({
            where: { name },
            data: { isEnabled: true },
        });
    }

    async disablePlugin(name: string): Promise<void> {
        await db.plugin.update({
            where: { name },
            data: { isEnabled: false },
        });
    }

    async updateSettings(name: string, settings: Record<string, unknown>): Promise<void> {
        await db.plugin.update({
            where: { name },
            data: { settings: settings as any },
        });
    }

    async execute(
        name: string,
        params: Record<string, unknown>
    ): Promise<unknown> {
        const instance = this.plugins.get(name);
        if (!instance) {
            throw new Error(`Plugin ${name} not found`);
        }

        const plugin = await db.plugin.findUnique({ where: { name } });
        if (!plugin?.isEnabled) {
            throw new Error(`Plugin ${name} is not enabled`);
        }

        const context: PluginContext = {
            pluginId: plugin.id,
            settings: plugin.settings as Record<string, unknown> || {},
            log: (message) => console.log(`[${name}] ${message}`),
            error: (message) => console.error(`[${name}] ${message}`),
        };

        return instance.execute(context, params);
    }

    async findByTrigger(type: 'keyword' | 'pattern' | 'event', value: string): Promise<string[]> {
        const matchingPlugins: string[] = [];

        for (const [name, instance] of this.plugins) {
            const triggers = instance.manifest.triggers || [];

            for (const trigger of triggers) {
                if (trigger.type === type) {
                    if (type === 'pattern') {
                        const regex = new RegExp(trigger.value, 'i');
                        if (regex.test(value)) {
                            matchingPlugins.push(name);
                            break;
                        }
                    } else if (trigger.value.toLowerCase() === value.toLowerCase()) {
                        matchingPlugins.push(name);
                        break;
                    }
                }
            }
        }

        return matchingPlugins;
    }

    getLoaded(): string[] {
        return Array.from(this.plugins.keys());
    }

    getManifest(name: string): PluginManifest | undefined {
        return this.plugins.get(name)?.manifest;
    }

    async list() {
        return db.plugin.findMany({
            orderBy: { name: 'asc' },
        });
    }

    async getInstalled() {
        return db.plugin.findMany({
            where: { isInstalled: true },
            orderBy: { name: 'asc' },
        });
    }

    async getEnabled() {
        return db.plugin.findMany({
            where: { isInstalled: true, isEnabled: true },
            orderBy: { name: 'asc' },
        });
    }
}

export const pluginManager = new PluginManager();
