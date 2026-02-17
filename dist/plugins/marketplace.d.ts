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
export declare class PluginMarketplace {
    private marketplaceDir;
    private registryUrl;
    constructor(options?: {
        marketplaceDir?: string;
        registryUrl?: string;
    });
    searchPlugins(query: string, options?: {
        category?: string;
        author?: string;
        sort?: 'popular' | 'recent' | 'rating';
        limit?: number;
        offset?: number;
    }): Promise<PluginListing[]>;
    private searchLocalPlugins;
    getPlugin(pluginId: string): Promise<PluginListing | null>;
    getPluginVersions(pluginId: string): Promise<PluginVersion[]>;
    publishPlugin(userId: string, manifest: PluginManifest, packagePath: string): Promise<string>;
    installPlugin(pluginId: string, userId: string, version?: string): Promise<void>;
    uninstallPlugin(pluginId: string): Promise<void>;
    getInstalledPlugins(): Promise<PluginListing[]>;
    submitReview(userId: string, pluginId: string, rating: number, comment: string): Promise<void>;
    getPluginReviews(pluginId: string): Promise<PluginReview[]>;
    getCategories(): string[];
    getFeaturedPlugins(): Promise<PluginListing[]>;
    getTrendingPlugins(limit?: number): Promise<PluginListing[]>;
}
export declare const pluginMarketplace: PluginMarketplace;
//# sourceMappingURL=marketplace.d.ts.map