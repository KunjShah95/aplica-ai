export interface WorkspaceConfig {
    id: string;
    name: string;
    rootPath: string;
    allowedPaths?: string[];
}
export interface UserContext {
    userId: string;
    workspaceId?: string;
    role?: string;
}
export declare class WorkspaceIsolation {
    private workspaces;
    private userWorkspaces;
    private workspaceBasePath;
    constructor(workspaceBasePath?: string);
    private ensureBaseDirectory;
    initialize(): Promise<void>;
    private loadWorkspacesFromStorage;
    registerWorkspace(workspace: WorkspaceConfig): void;
    getWorkspacePath(workspaceId: string): string | null;
    isPathWithinWorkspace(filePath: string, workspaceId: string): boolean;
    resolveWorkspacePath(workspaceId: string, relativePath: string): string;
    checkAccess(userContext: UserContext, filePath: string, operation: 'read' | 'write' | 'delete'): {
        allowed: boolean;
        resolvedPath?: string;
        error?: string;
    };
    createUserWorkspace(userId: string, workspaceName?: string): Promise<WorkspaceConfig>;
    getUserWorkspaces(userId: string): WorkspaceConfig[];
    getAllWorkspaces(): WorkspaceConfig[];
    deleteWorkspace(workspaceId: string): boolean;
}
export declare const workspaceIsolation: WorkspaceIsolation;
//# sourceMappingURL=workspace-isolation.d.ts.map