import { randomUUID } from 'crypto';
import { db } from '../db/index.js';
import * as fs from 'fs/promises';
import * as path from 'path';

export interface PluginManifest {
  name: string;
  version: string;
  description?: string;
  author?: string;
  homepage?: string;
  repository?: string;
  main?: string;
  keywords?: string[];
  triggers?: {
    type: 'keyword' | 'pattern' | 'event' | 'command';
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

export interface PluginListing {
  id: string;
  name: string;
  version: string;
  description: string;
  author: string;
  homepage?: string;
  repository?: string;
  downloads: number;
  stars: number;
  keywords: string[];
  categories: string[];
  compatibility: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface PluginReview {
  id: string;
  pluginId: string;
  userId: string;
  rating: number;
  comment: string;
  createdAt: Date;
}

export interface PluginVersion {
  version: string;
  changelog: string;
  minAlpiciaVersion: string;
  downloadUrl: string;
  createdAt: Date;
}

export class PluginMarketplace {
  private marketplaceDir: string;
  private registryUrl: string;

  constructor(options?: { marketplaceDir?: string; registryUrl?: string }) {
    this.marketplaceDir = options?.marketplaceDir || './plugins';
    this.registryUrl = options?.registryUrl || 'https://registry.alpicia.dev';
  }

  async searchPlugins(
    query: string,
    options?: {
      category?: string;
      author?: string;
      sort?: 'popular' | 'recent' | 'rating';
      limit?: number;
      offset?: number;
    }
  ): Promise<PluginListing[]> {
    const params = new URLSearchParams({ q: query });
    if (options?.category) params.set('category', options.category);
    if (options?.sort) params.set('sort', options.sort);
    if (options?.limit) params.set('limit', String(options.limit));
    if (options?.offset) params.set('offset', String(options.offset));

    try {
      const response = await fetch(`${this.registryUrl}/search?${params}`);
      return await response.json();
    } catch {
      return this.searchLocalPlugins(query, options);
    }
  }

  private async searchLocalPlugins(
    query: string,
    options?: {
      category?: string;
      sort?: 'popular' | 'recent' | 'rating';
      limit?: number;
    }
  ): Promise<PluginListing[]> {
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

  async getPlugin(pluginId: string): Promise<PluginListing | null> {
    try {
      const response = await fetch(`${this.registryUrl}/plugin/${pluginId}`);
      if (response.ok) {
        return await response.json();
      }
    } catch {}

    const plugin = await db.plugin.findUnique({ where: { id: pluginId } });
    if (!plugin) return null;

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

  async getPluginVersions(pluginId: string): Promise<PluginVersion[]> {
    try {
      const response = await fetch(`${this.registryUrl}/plugin/${pluginId}/versions`);
      if (response.ok) {
        return await response.json();
      }
    } catch {}

    return [];
  }

  async publishPlugin(
    userId: string,
    manifest: PluginManifest,
    packagePath: string
  ): Promise<string> {
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
        manifest: manifest as any,
        status: 'PENDING',
        downloads: 0,
      },
    });

    const pluginsDir = path.join(this.marketplaceDir, manifest.name);
    await fs.mkdir(pluginsDir, { recursive: true });
    await fs.copyFile(packagePath, path.join(pluginsDir, `${manifest.name}.tgz`));

    return pluginId;
  }

  async installPlugin(pluginId: string, userId: string, version?: string): Promise<void> {
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
    } catch {
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

  async uninstallPlugin(pluginId: string): Promise<void> {
    const plugin = await db.plugin.findUnique({ where: { id: pluginId } });
    if (!plugin) {
      throw new Error(`Plugin ${pluginId} not found`);
    }

    const pluginsDir = path.join(this.marketplaceDir, plugin.name);
    try {
      await fs.rm(pluginsDir, { recursive: true, force: true });
    } catch {}

    await db.pluginInstallation.deleteMany({
      where: { pluginId },
    });
  }

  async getInstalledPlugins(): Promise<PluginListing[]> {
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

  async submitReview(
    userId: string,
    pluginId: string,
    rating: number,
    comment: string
  ): Promise<void> {
    await db.pluginReview.create({
      data: {
        pluginId,
        userId,
        rating: Math.min(5, Math.max(1, rating)),
        comment,
      },
    });
  }

  async getPluginReviews(pluginId: string): Promise<PluginReview[]> {
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

  getCategories(): string[] {
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

  async getFeaturedPlugins(): Promise<PluginListing[]> {
    try {
      const response = await fetch(`${this.registryUrl}/featured`);
      if (response.ok) {
        return await response.json();
      }
    } catch {}

    return [];
  }

  async getTrendingPlugins(limit: number = 10): Promise<PluginListing[]> {
    return this.searchPlugins('', { sort: 'popular', limit });
  }
}

export const pluginMarketplace = new PluginMarketplace();
