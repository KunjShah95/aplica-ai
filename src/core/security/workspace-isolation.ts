import * as path from 'path';
import * as fs from 'fs';

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

export class WorkspaceIsolation {
  private workspaces: Map<string, WorkspaceConfig> = new Map();
  private userWorkspaces: Map<string, string[]> = new Map();
  private workspaceBasePath: string;

  constructor(workspaceBasePath: string = './workspaces') {
    this.workspaceBasePath = workspaceBasePath;
    this.ensureBaseDirectory();
  }

  private ensureBaseDirectory(): void {
    if (!fs.existsSync(this.workspaceBasePath)) {
      fs.mkdirSync(this.workspaceBasePath, { recursive: true });
    }
  }

  async initialize(): Promise<void> {
    await this.loadWorkspacesFromStorage();
  }

  private async loadWorkspacesFromStorage(): Promise<void> {
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
    } catch (error) {
      console.log('Running without database - using in-memory workspace management');
    }
  }

  registerWorkspace(workspace: WorkspaceConfig): void {
    this.workspaces.set(workspace.id, workspace);
    const wsRoot = workspace.rootPath;
    if (!fs.existsSync(wsRoot)) {
      fs.mkdirSync(wsRoot, { recursive: true });
    }
  }

  getWorkspacePath(workspaceId: string): string | null {
    const workspace = this.workspaces.get(workspaceId);
    return workspace?.rootPath || null;
  }

  isPathWithinWorkspace(filePath: string, workspaceId: string): boolean {
    const workspacePath = this.getWorkspacePath(workspaceId);
    if (!workspacePath) return false;

    const resolvedPath = path.resolve(filePath);
    const resolvedWorkspace = path.resolve(workspacePath);

    return resolvedPath.startsWith(resolvedWorkspace);
  }

  resolveWorkspacePath(workspaceId: string, relativePath: string): string {
    const workspacePath = this.getWorkspacePath(workspaceId);
    if (!workspacePath) {
      throw new Error(`Workspace ${workspaceId} not found`);
    }
    return path.join(workspacePath, relativePath);
  }

  checkAccess(
    userContext: UserContext,
    filePath: string,
    operation: 'read' | 'write' | 'delete'
  ): { allowed: boolean; resolvedPath?: string; error?: string } {
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

    let resolvedPath: string;
    if (path.isAbsolute(filePath)) {
      resolvedPath = path.resolve(filePath);
    } else {
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

  async createUserWorkspace(userId: string, workspaceName?: string): Promise<WorkspaceConfig> {
    const workspaceId = `ws_${userId}_${Date.now()}`;
    const rootPath = path.join(this.workspaceBasePath, workspaceId);

    const workspace: WorkspaceConfig = {
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

  getUserWorkspaces(userId: string): WorkspaceConfig[] {
    const workspaceIds = this.userWorkspaces.get(userId) || [];
    return workspaceIds
      .map((id) => this.workspaces.get(id))
      .filter((ws): ws is WorkspaceConfig => ws !== undefined);
  }

  getAllWorkspaces(): WorkspaceConfig[] {
    return Array.from(this.workspaces.values());
  }

  deleteWorkspace(workspaceId: string): boolean {
    const workspace = this.workspaces.get(workspaceId);
    if (!workspace) return false;

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
    } catch (error) {
      console.error('Error deleting workspace:', error);
      return false;
    }
  }
}

export const workspaceIsolation = new WorkspaceIsolation();
