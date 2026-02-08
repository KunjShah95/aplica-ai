import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

export interface FileInfo {
  name: string;
  path: string;
  isDirectory: boolean;
  size: number;
  createdAt: Date;
  modifiedAt: Date;
  permissions: string;
}

export interface FileOperationResult {
  success: boolean;
  path: string;
  operation: string;
  data?: string;
  error?: string;
  timestamp: Date;
}

export interface SearchOptions {
  pattern: string;
  recursive?: boolean;
  maxDepth?: number;
  fileTypes?: string[];
}

export class FileSystemExecutor {
  private allowedPaths: Set<string> = new Set();
  private maxFileSize: number = 10 * 1024 * 1024;
  private blockedPatterns: string[] = ['.env', '.password', '.secret', 'key.pem', 'cert.p12'];

  constructor(
    options: {
      allowedPaths?: string[];
      maxFileSize?: number;
      blockedPatterns?: string[];
    } = {}
  ) {
    if (options.allowedPaths) {
      options.allowedPaths.forEach((p) => this.allowedPaths.add(path.resolve(p)));
    } else {
      // Default to current working directory for security
      this.allowedPaths.add(path.resolve(process.cwd()));
    }
    if (options.maxFileSize) {
      this.maxFileSize = options.maxFileSize;
    }
    if (options.blockedPatterns) {
      this.blockedPatterns = options.blockedPatterns;
    }
  }

  isPathAllowed(filePath: string): boolean {
    const resolvedPath = path.resolve(filePath);

    if (this.allowedPaths.size > 0) {
      const isAllowed = Array.from(this.allowedPaths).some((allowedPath) =>
        resolvedPath.startsWith(allowedPath)
      );
      if (!isAllowed) return false;
    }

    const fileName = path.basename(resolvedPath).toLowerCase();
    if (this.blockedPatterns.some((pattern) => fileName.includes(pattern))) {
      return false;
    }

    return true;
  }

  async readFile(filePath: string): Promise<FileOperationResult> {
    if (!this.isPathAllowed(filePath)) {
      return {
        success: false,
        path: filePath,
        operation: 'read',
        error: 'Access to this path is not allowed',
        timestamp: new Date(),
      };
    }

    try {
      const stats = await fs.promises.stat(filePath);
      if (stats.size > this.maxFileSize) {
        return {
          success: false,
          path: filePath,
          operation: 'read',
          error: `File size exceeds maximum allowed size of ${this.maxFileSize} bytes`,
          timestamp: new Date(),
        };
      }

      const content = await fs.promises.readFile(filePath, 'utf-8');
      return {
        success: true,
        path: filePath,
        operation: 'read',
        data: content,
        timestamp: new Date(),
      };
    } catch (error) {
      return {
        success: false,
        path: filePath,
        operation: 'read',
        error: error instanceof Error ? error.message : String(error),
        timestamp: new Date(),
      };
    }
  }

  async writeFile(filePath: string, content: string): Promise<FileOperationResult> {
    if (!this.isPathAllowed(filePath)) {
      return {
        success: false,
        path: filePath,
        operation: 'write',
        error: 'Access to this path is not allowed',
        timestamp: new Date(),
      };
    }

    try {
      const dir = path.dirname(filePath);
      await fs.promises.mkdir(dir, { recursive: true });

      await fs.promises.writeFile(filePath, content, 'utf-8');
      return {
        success: true,
        path: filePath,
        operation: 'write',
        timestamp: new Date(),
      };
    } catch (error) {
      return {
        success: false,
        path: filePath,
        operation: 'write',
        error: error instanceof Error ? error.message : String(error),
        timestamp: new Date(),
      };
    }
  }

  async appendFile(filePath: string, content: string): Promise<FileOperationResult> {
    if (!this.isPathAllowed(filePath)) {
      return {
        success: false,
        path: filePath,
        operation: 'append',
        error: 'Access to this path is not allowed',
        timestamp: new Date(),
      };
    }

    try {
      await fs.promises.appendFile(filePath, content, 'utf-8');
      return {
        success: true,
        path: filePath,
        operation: 'append',
        timestamp: new Date(),
      };
    } catch (error) {
      return {
        success: false,
        path: filePath,
        operation: 'append',
        error: error instanceof Error ? error.message : String(error),
        timestamp: new Date(),
      };
    }
  }

  async deleteFile(filePath: string): Promise<FileOperationResult> {
    if (!this.isPathAllowed(filePath)) {
      return {
        success: false,
        path: filePath,
        operation: 'delete',
        error: 'Access to this path is not allowed',
        timestamp: new Date(),
      };
    }

    try {
      const stats = await fs.promises.stat(filePath);
      if (stats.isDirectory()) {
        await fs.promises.rm(filePath, { recursive: true, force: true });
      } else {
        await fs.promises.unlink(filePath);
      }
      return {
        success: true,
        path: filePath,
        operation: 'delete',
        timestamp: new Date(),
      };
    } catch (error) {
      return {
        success: false,
        path: filePath,
        operation: 'delete',
        error: error instanceof Error ? error.message : String(error),
        timestamp: new Date(),
      };
    }
  }

  async listDirectory(dirPath: string): Promise<FileOperationResult> {
    if (!this.isPathAllowed(dirPath)) {
      return {
        success: false,
        path: dirPath,
        operation: 'list',
        error: 'Access to this path is not allowed',
        timestamp: new Date(),
      };
    }

    try {
      const entries = await fs.promises.readdir(dirPath, { withFileTypes: true });
      const files: FileInfo[] = [];

      for (const entry of entries) {
        const fullPath = path.join(dirPath, entry.name);
        try {
          const stats = await fs.promises.stat(fullPath);
          files.push({
            name: entry.name,
            path: fullPath,
            isDirectory: entry.isDirectory(),
            size: stats.size,
            createdAt: stats.birthtime,
            modifiedAt: stats.mtime,
            permissions: this.getPermissionsString(stats.mode),
          });
        } catch {
        }
      }

      return {
        success: true,
        path: dirPath,
        operation: 'list',
        data: JSON.stringify(files),
        timestamp: new Date(),
      };
    } catch (error) {
      return {
        success: false,
        path: dirPath,
        operation: 'list',
        error: error instanceof Error ? error.message : String(error),
        timestamp: new Date(),
      };
    }
  }

  async search(options: SearchOptions): Promise<FileOperationResult> {
    const { pattern, recursive = true, maxDepth = 10, fileTypes } = options;
    const searchPath = process.cwd();

    if (!this.isPathAllowed(searchPath)) {
      return {
        success: false,
        path: searchPath,
        operation: 'search',
        error: 'Access to this path is not allowed',
        timestamp: new Date(),
      };
    }

    try {
      const regex = new RegExp(pattern);
      const results: string[] = [];
      let currentDepth = 0;

      const searchDirectory = async (dir: string, depth: number): Promise<void> => {
        if (depth > maxDepth) return;

        const entries = await fs.promises.readdir(dir, { withFileTypes: true });

        for (const entry of entries) {
          const fullPath = path.join(dir, entry.name);

          if (this.isPathAllowed(fullPath) && regex.test(entry.name)) {
            if (!entry.isDirectory() || !fileTypes) {
              results.push(fullPath);
            } else if (entry.isDirectory() && fileTypes.includes('directory')) {
              results.push(fullPath);
            }
          }

          if (entry.isDirectory() && recursive && depth < maxDepth) {
            await searchDirectory(fullPath, depth + 1);
          }
        }
      };

      await searchDirectory(searchPath, currentDepth);

      return {
        success: true,
        path: searchPath,
        operation: 'search',
        data: JSON.stringify(results),
        timestamp: new Date(),
      };
    } catch (error) {
      return {
        success: false,
        path: searchPath,
        operation: 'search',
        error: error instanceof Error ? error.message : String(error),
        timestamp: new Date(),
      };
    }
  }

  async createDirectory(dirPath: string): Promise<FileOperationResult> {
    if (!this.isPathAllowed(dirPath)) {
      return {
        success: false,
        path: dirPath,
        operation: 'mkdir',
        error: 'Access to this path is not allowed',
        timestamp: new Date(),
      };
    }

    try {
      await fs.promises.mkdir(dirPath, { recursive: true });
      return {
        success: true,
        path: dirPath,
        operation: 'mkdir',
        timestamp: new Date(),
      };
    } catch (error) {
      return {
        success: false,
        path: dirPath,
        operation: 'mkdir',
        error: error instanceof Error ? error.message : String(error),
        timestamp: new Date(),
      };
    }
  }

  async copyFile(sourcePath: string, destPath: string): Promise<FileOperationResult> {
    if (!this.isPathAllowed(sourcePath) || !this.isPathAllowed(destPath)) {
      return {
        success: false,
        path: sourcePath,
        operation: 'copy',
        error: 'Access to one or both paths is not allowed',
        timestamp: new Date(),
      };
    }

    try {
      await fs.promises.copyFile(sourcePath, destPath);
      return {
        success: true,
        path: sourcePath,
        operation: 'copy',
        timestamp: new Date(),
      };
    } catch (error) {
      return {
        success: false,
        path: sourcePath,
        operation: 'copy',
        error: error instanceof Error ? error.message : String(error),
        timestamp: new Date(),
      };
    }
  }

  async moveFile(sourcePath: string, destPath: string): Promise<FileOperationResult> {
    const copyResult = await this.copyFile(sourcePath, destPath);
    if (copyResult.success) {
      return await this.deleteFile(sourcePath);
    }
    return copyResult;
  }

  async getFileInfo(filePath: string): Promise<FileOperationResult> {
    if (!this.isPathAllowed(filePath)) {
      return {
        success: false,
        path: filePath,
        operation: 'stat',
        error: 'Access to this path is not allowed',
        timestamp: new Date(),
      };
    }

    try {
      const stats = await fs.promises.stat(filePath);
      const info: FileInfo = {
        name: path.basename(filePath),
        path: filePath,
        isDirectory: stats.isDirectory(),
        size: stats.size,
        createdAt: stats.birthtime,
        modifiedAt: stats.mtime,
        permissions: this.getPermissionsString(stats.mode),
      };

      return {
        success: true,
        path: filePath,
        operation: 'stat',
        data: JSON.stringify(info),
        timestamp: new Date(),
      };
    } catch (error) {
      return {
        success: false,
        path: filePath,
        operation: 'stat',
        error: error instanceof Error ? error.message : String(error),
        timestamp: new Date(),
      };
    }
  }

  private getPermissionsString(mode: number): string {
    const permissions = ['---', '--x', '-w-', '-wx', 'r--', 'r-x', 'rw-', 'rwx'];
    const user = permissions[(mode >> 6) & 7];
    const group = permissions[(mode >> 3) & 7];
    const other = permissions[mode & 7];
    return `${user}${group}${other}`;
  }

  getStatus(): { allowedPathsCount: number; maxFileSize: number } {
    return {
      allowedPathsCount: this.allowedPaths.size,
      maxFileSize: this.maxFileSize,
    };
  }
}

export const fileSystemExecutor = new FileSystemExecutor();
