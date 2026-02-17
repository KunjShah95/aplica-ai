import { randomUUID } from 'crypto';
import { db } from '../db/index.js';
import * as fs from 'fs/promises';
import * as path from 'path';
export class PluginMarketplace {
    marketplaceDir;
    registryUrl;
    constructor(options) {
        this.marketplaceDir = options?.marketplaceDir || './plugins';
        this.registryUrl = options?.registryUrl || 'https://registry.alpicia.dev';
    }
    async searchPlugins(query, options) {
        const params = new URLSearchParams({ q: query });
        if (options?.category)
            params.set('category', options.category);
        if (options?.sort)
            params.set('sort', options.sort);
        if (options?.limit)
            params.set('limit', String(options.limit));
        if (options?.offset)
            params.set('offset', String(options.offset));
        try {
            const response = await fetch(`${this.registryUrl}/search?${params}`);
            return await response.json();
        }
        catch {
            return this.searchLocalPlugins(query, options);
        }
    }
    async searchLocalPlugins(query, options) {
        const plugins = await db.plugin.findMany({
            where: {
                OR: [
                    { name: { contains: query, mode: 'insensitive' } },
                    { description: { contains: query, mode: 'insensitive' } },
                ],
            },
            orderBy: options?.sort === 'rating' ? { stars: 'desc' } : { downloads: 'desc' },
            take: options?.limit || 20,
        });
        return plugins.map((p) => ({
            id: p.id,
            name: p.name,
            version: p.version || '1.0.0',
            description: p.description || '',
            author: p.author || 'Unknown',
            downloads: p.downloads || 0,
            stars: 0,
            keywords: [],
            categories: [],
            compatibility: [],
            createdAt: p.createdAt,
            updatedAt: p.updatedAt,
        }));
    }
    async getPlugin(pluginId) {
        try {
            const response = await fetch(`${this.registryUrl}/plugin/${pluginId}`);
            if (response.ok) {
                return await response.json();
            }
        }
        catch { }
        const plugin = await db.plugin.findUnique({ where: { id: pluginId } });
        if (!plugin)
            return null;
        return {
            id: plugin.id,
            name: plugin.name,
            version: plugin.version || '1.0.0',
            description: plugin.description || '',
            author: plugin.author || 'Unknown',
            downloads: plugin.downloads || 0,
            stars: 0,
            keywords: [],
            categories: [],
            compatibility: [],
            createdAt: plugin.createdAt,
            updatedAt: plugin.updatedAt,
        };
    }
    async getPluginVersions(pluginId) {
        try {
            const response = await fetch(`${this.registryUrl}/plugin/${pluginId}/versions`);
            if (response.ok) {
                return await response.json();
            }
        }
        catch { }
        return [];
    }
    async publishPlugin(userId, manifest, packagePath) {
        const pluginId = randomUUID();
        await db.plugin.create({
            data: {
                id: pluginId,
                name: manifest.name,
                version: manifest.version,
                description: manifest.description || '',
                author: manifest.author || 'Unknown',
                homepage: manifest.homepage,
                repository: manifest.repository,
                keywords: manifest.keywords || [],
                manifest: manifest,
                status: 'PENDING',
                downloads: 0,
            },
        });
        const pluginsDir = path.join(this.marketplaceDir, manifest.name);
        await fs.mkdir(pluginsDir, { recursive: true });
        await fs.copyFile(packagePath, path.join(pluginsDir, `${manifest.name}.tgz`));
        return pluginId;
    }
    async installPlugin(pluginId, userId, version) {
        const listing = await this.getPlugin(pluginId);
        if (!listing) {
            throw new Error(`Plugin ${pluginId} not found`);
        }
        const pluginsDir = path.join(this.marketplaceDir, listing.name);
        await fs.mkdir(pluginsDir, { recursive: true });
        const downloadUrl = version
            ? `${this.registryUrl}/plugin/${pluginId}/download/${version}`
            : `${this.registryUrl}/plugin/${pluginId}/download/latest`;
        try {
            const response = await fetch(downloadUrl);
            if (response.ok) {
                const buffer = Buffer.from(await response.arrayBuffer());
                await fs.writeFile(path.join(pluginsDir, 'package.tgz'), buffer);
            }
        }
        catch {
            console.log(`Using local plugin: ${listing.name}`);
        }
        await db.pluginInstallation.create({
            data: {
                pluginId,
                userId,
                version: version || listing.version,
                installedAt: new Date(),
            },
        });
    }
    async uninstallPlugin(pluginId) {
        const plugin = await db.plugin.findUnique({ where: { id: pluginId } });
        if (!plugin) {
            throw new Error(`Plugin ${pluginId} not found`);
        }
        const pluginsDir = path.join(this.marketplaceDir, plugin.name);
        try {
            await fs.rm(pluginsDir, { recursive: true, force: true });
        }
        catch { }
        await db.pluginInstallation.deleteMany({
            where: { pluginId },
        });
    }
    async getInstalledPlugins() {
        const installations = await db.pluginInstallation.findMany({
            include: { plugin: true },
        });
        return installations.map((i) => ({
            id: i.plugin.id,
            name: i.plugin.name,
            version: i.version,
            description: i.plugin.description || '',
            author: i.plugin.author || 'Unknown',
            downloads: i.plugin.downloads || 0,
            stars: 0,
            keywords: [],
            categories: [],
            compatibility: [],
            createdAt: i.plugin.createdAt,
            updatedAt: i.plugin.updatedAt,
        }));
    }
    async submitReview(userId, pluginId, rating, comment) {
        await db.pluginReview.create({
            data: {
                pluginId,
                userId,
                rating: Math.min(5, Math.max(1, rating)),
                comment,
            },
        });
    }
    async getPluginReviews(pluginId) {
        const reviews = await db.pluginReview.findMany({
            where: { pluginId },
            orderBy: { createdAt: 'desc' },
        });
        return reviews.map((r) => ({
            id: r.id,
            pluginId: r.pluginId,
            userId: r.userId,
            rating: r.rating,
            comment: r.comment || '',
            createdAt: r.createdAt,
        }));
    }
    getCategories() {
        return [
            'Productivity',
            'Communication',
            'Automation',
            'Data',
            'AI/ML',
            'Integration',
            'Developer Tools',
            'Entertainment',
            'Utility',
            'Security',
        ];
    }
    async getFeaturedPlugins() {
        try {
            const response = await fetch(`${this.registryUrl}/featured`);
            if (response.ok) {
                return await response.json();
            }
        }
        catch { }
        return [];
    }
    async getTrendingPlugins(limit = 10) {
        return this.searchPlugins('', { sort: 'popular', limit });
    }
}
export const pluginMarketplace = new PluginMarketplace();
//# sourceMappingURL=marketplace.js.map