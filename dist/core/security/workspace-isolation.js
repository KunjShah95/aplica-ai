import * as path from 'path';
import * as fs from 'fs';
export class WorkspaceIsolation {
    workspaces = new Map();
    userWorkspaces = new Map();
    workspaceBasePath;
    constructor(workspaceBasePath = './workspaces') {
        this.workspaceBasePath = workspaceBasePath;
        this.ensureBaseDirectory();
    }
    ensureBaseDirectory() {
        if (!fs.existsSync(this.workspaceBasePath)) {
            fs.mkdirSync(this.workspaceBasePath, { recursive: true });
        }
    }
    async initialize() {
        await this.loadWorkspacesFromStorage();
    }
    async loadWorkspacesFromStorage() {
        try {
            const { PrismaClient } = await import('@prisma/client');
            const prisma = new PrismaClient();
            const workspaces = await prisma.workspace.findMany();
            for (const ws of workspaces) {
                this.workspaces.set(ws.id, {
                    id: ws.id,
                    name: ws.name,
                    rootPath: path.join(this.workspaceBasePath, ws.id),
                });
            }
            await prisma.$disconnect();
        }
        catch (error) {
            console.log('Running without database - using in-memory workspace management');
        }
    }
    registerWorkspace(workspace) {
        this.workspaces.set(workspace.id, workspace);
        const wsRoot = workspace.rootPath;
        if (!fs.existsSync(wsRoot)) {
            fs.mkdirSync(wsRoot, { recursive: true });
        }
    }
    getWorkspacePath(workspaceId) {
        const workspace = this.workspaces.get(workspaceId);
        return workspace?.rootPath || null;
    }
    isPathWithinWorkspace(filePath, workspaceId) {
        const workspacePath = this.getWorkspacePath(workspaceId);
        if (!workspacePath)
            return false;
        const resolvedPath = path.resolve(filePath);
        const resolvedWorkspace = path.resolve(workspacePath);
        return resolvedPath.startsWith(resolvedWorkspace);
    }
    resolveWorkspacePath(workspaceId, relativePath) {
        const workspacePath = this.getWorkspacePath(workspaceId);
        if (!workspacePath) {
            throw new Error(`Workspace ${workspaceId} not found`);
        }
        return path.join(workspacePath, relativePath);
    }
    checkAccess(userContext, filePath, operation) {
        if (!userContext.workspaceId) {
            return {
                allowed: false,
                error: 'No workspace context provided',
            };
        }
        const workspaceId = userContext.workspaceId;
        const workspacePath = this.getWorkspacePath(workspaceId);
        if (!workspacePath) {
            return {
                allowed: false,
                error: `Workspace ${workspaceId} not found`,
            };
        }
        let resolvedPath;
        if (path.isAbsolute(filePath)) {
            resolvedPath = path.resolve(filePath);
        }
        else {
            resolvedPath = path.resolve(workspacePath, filePath);
        }
        if (!this.isPathWithinWorkspace(resolvedPath, workspaceId)) {
            return {
                allowed: false,
                error: `Access denied: Path ${filePath} is outside workspace ${workspaceId}`,
                resolvedPath,
            };
        }
        return {
            allowed: true,
            resolvedPath,
        };
    }
    async createUserWorkspace(userId, workspaceName) {
        const workspaceId = `ws_${userId}_${Date.now()}`;
        const rootPath = path.join(this.workspaceBasePath, workspaceId);
        const workspace = {
            id: workspaceId,
            name: workspaceName || `Workspace for ${userId}`,
            rootPath,
        };
        this.registerWorkspace(workspace);
        const userWss = this.userWorkspaces.get(userId) || [];
        userWss.push(workspaceId);
        this.userWorkspaces.set(userId, userWss);
        return workspace;
    }
    getUserWorkspaces(userId) {
        const workspaceIds = this.userWorkspaces.get(userId) || [];
        return workspaceIds
            .map((id) => this.workspaces.get(id))
            .filter((ws) => ws !== undefined);
    }
    getAllWorkspaces() {
        return Array.from(this.workspaces.values());
    }
    deleteWorkspace(workspaceId) {
        const workspace = this.workspaces.get(workspaceId);
        if (!workspace)
            return false;
        try {
            if (fs.existsSync(workspace.rootPath)) {
                fs.rmSync(workspace.rootPath, { recursive: true, force: true });
            }
            this.workspaces.delete(workspaceId);
            for (const [userId, wsIds] of this.userWorkspaces.entries()) {
                const filtered = wsIds.filter((id) => id !== workspaceId);
                if (filtered.length !== wsIds.length) {
                    this.userWorkspaces.set(userId, filtered);
                }
            }
            return true;
        }
        catch (error) {
            console.error('Error deleting workspace:', error);
            return false;
        }
    }
}
export const workspaceIsolation = new WorkspaceIsolation();
//# sourceMappingURL=workspace-isolation.js.map