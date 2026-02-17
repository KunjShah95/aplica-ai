export interface WorkspaceConfig {
    rootDir: string;
    maxSize?: number;
    allowedExtensions?: string[];
}
export interface UserWorkspace {
    id: string;
    userId: string;
    rootPath: string;
    createdAt: Date;
    quotaUsed: number;
    quotaLimit: number;
}
export declare class WorkspaceIsolation {
    private workspaces;
    private config;
    private defaultQuotaLimit;
    constructor(config: WorkspaceConfig);
    initialize(): Promise<void>;
    createWorkspace(userId: string): Promise<UserWorkspace>;
    getWorkspace(userId: string): Promise<UserWorkspace | null>;
    ensureWorkspace(userId: string): Promise<UserWorkspace>;
    isWithinWorkspace(userId: string, filePath: string): boolean;
    resolvePath(userId: string, relativePath: string): Promise<string | null>;
    checkQuota(userId: string, additionalSize: number): Promise<boolean>;
    updateQuota(userId: string): Promise<void>;
    deleteWorkspace(userId: string): Promise<boolean>;
    private calculateQuotaUsed;
    private calculateDirectorySize;
    listWorkspaces(): Promise<UserWorkspace[]>;
    getWorkspacePath(userId: string): string | null;
}
export declare function createWorkspaceIsolation(rootDir: string): WorkspaceIsolation;
//# sourceMappingURL=workspace-isolation.d.ts.map