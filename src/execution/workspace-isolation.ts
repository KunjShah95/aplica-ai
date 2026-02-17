import * as fs from 'fs/promises';
import * as path from 'path';
import { randomUUID } from 'crypto';

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

export class WorkspaceIsolation {
  private workspaces: Map<string, UserWorkspace> = new Map();
  private config: WorkspaceConfig;
  private defaultQuotaLimit = 1024 * 1024 * 1024; // 1GB

  constructor(config: WorkspaceConfig) {
    this.config = config;
  }

  async initialize(): Promise<void> {
    try {
      await fs.mkdir(this.config.rootDir, { recursive: true });
    } catch (error) {
      console.error('Failed to initialize workspace root:', error);
    }
  }

  async createWorkspace(userId: string): Promise<UserWorkspace> {
    const workspaceId = randomUUID();
    const workspacePath = path.join(this.config.rootDir, userId);

    await fs.mkdir(workspacePath, { recursive: true });

    const workspace: UserWorkspace = {
      id: workspaceId,
      userId,
      rootPath: workspacePath,
      createdAt: new Date(),
      quotaUsed: 0,
      quotaLimit: this.defaultQuotaLimit,
    };

    this.workspaces.set(userId, workspace);
    return workspace;
  }

  async getWorkspace(userId: string): Promise<UserWorkspace | null> {
    let workspace = this.workspaces.get(userId);

    if (!workspace) {
      const workspacePath = path.join(this.config.rootDir, userId);
      try {
        await fs.access(workspacePath);
        workspace = {
          id: randomUUID(),
          userId,
          rootPath: workspacePath,
          createdAt: new Date(),
          quotaUsed: await this.calculateQuotaUsed(workspacePath),
          quotaLimit: this.defaultQuotaLimit,
        };
        this.workspaces.set(userId, workspace);
      } catch {
        return null;
      }
    }

    return workspace;
  }

  async ensureWorkspace(userId: string): Promise<UserWorkspace> {
    let workspace = await this.getWorkspace(userId);
    if (!workspace) {
      workspace = await this.createWorkspace(userId);
    }
    return workspace;
  }

  isWithinWorkspace(userId: string, filePath: string): boolean {
    const workspace = this.workspaces.get(userId);
    if (!workspace) return false;

    const resolvedPath = path.resolve(filePath);
    const workspaceRoot = path.resolve(workspace.rootPath);

    return resolvedPath.startsWith(workspaceRoot + path.sep) || resolvedPath === workspaceRoot;
  }

  async resolvePath(userId: string, relativePath: string): Promise<string | null> {
    const workspace = await this.getWorkspace(userId);
    if (!workspace) return null;

    const resolvedPath = path.resolve(workspace.rootPath, relativePath);

    if (!this.isWithinWorkspace(userId, resolvedPath)) {
      return null;
    }

    return resolvedPath;
  }

  async checkQuota(userId: string, additionalSize: number): Promise<boolean> {
    const workspace = await this.getWorkspace(userId);
    if (!workspace) return false;

    return workspace.quotaUsed + additionalSize <= workspace.quotaLimit;
  }

  async updateQuota(userId: string): Promise<void> {
    const workspace = await this.getWorkspace(userId);
    if (!workspace) return;

    workspace.quotaUsed = await this.calculateQuotaUsed(workspace.rootPath);
  }

  async deleteWorkspace(userId: string): Promise<boolean> {
    const workspace = await this.getWorkspace(userId);
    if (!workspace) return false;

    try {
      await fs.rm(workspace.rootPath, { recursive: true, force: true });
      this.workspaces.delete(userId);
      return true;
    } catch (error) {
      console.error('Failed to delete workspace:', error);
      return false;
    }
  }

  private async calculateQuotaUsed(workspacePath: string): Promise<number> {
    let totalSize = 0;

    try {
      const files = await fs.readdir(workspacePath, { withFileTypes: true });

      for (const file of files) {
        const filePath = path.join(workspacePath, file.name);

        if (file.isDirectory()) {
          totalSize += await this.calculateDirectorySize(filePath);
        } else if (file.isFile()) {
          const stats = await fs.stat(filePath);
          totalSize += stats.size;
        }
      }
    } catch {
      // Directory doesn't exist or inaccessible
    }

    return totalSize;
  }

  private async calculateDirectorySize(dirPath: string): Promise<number> {
    let size = 0;

    try {
      const files = await fs.readdir(dirPath, { withFileTypes: true });

      for (const file of files) {
        const filePath = path.join(dirPath, file.name);

        if (file.isDirectory()) {
          size += await this.calculateDirectorySize(filePath);
        } else if (file.isFile()) {
          const stats = await fs.stat(filePath);
          size += stats.size;
        }
      }
    } catch {
      // Ignore inaccessible files
    }

    return size;
  }

  async listWorkspaces(): Promise<UserWorkspace[]> {
    return Array.from(this.workspaces.values());
  }

  getWorkspacePath(userId: string): string | null {
    const workspace = this.workspaces.get(userId);
    return workspace?.rootPath || null;
  }
}

export function createWorkspaceIsolation(rootDir: string): WorkspaceIsolation {
  return new WorkspaceIsolation({ rootDir });
}
