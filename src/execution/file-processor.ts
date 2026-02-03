import * as fs from 'fs';
import * as path from 'path';

export interface FileProcessingConfig {
  maxFileSize?: number;
  allowedTypes?: string[];
  maxImageSize?: number;
  allowedImageTypes?: string[];
}

export interface ProcessedFile {
  path: string;
  name: string;
  size: number;
  type: string;
  extension: string;
  content?: string;
  metadata?: Record<string, any>;
}

export interface ImageProcessingOptions {
  width?: number;
  height?: number;
  quality?: number;
  format?: 'jpeg' | 'png' | 'webp';
  resize?: 'cover' | 'contain' | 'fill';
}

export class FileProcessor {
  private config: FileProcessingConfig;

  constructor(config: FileProcessingConfig = {}) {
    this.config = {
      maxFileSize: 10 * 1024 * 1024,
      allowedTypes: ['.txt', '.md', '.json', '.yaml', '.yml', '.csv', '.xml', '.html'],
      maxImageSize: 5 * 1024 * 1024,
      allowedImageTypes: ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp'],
      ...config,
    };
  }

  async processFile(filePath: string): Promise<ProcessedFile> {
    const stats = await fs.promises.stat(filePath);
    const extension = path.extname(filePath).toLowerCase();
    const name = path.basename(filePath);

    if (!this.isAllowedFile(extension, stats.size)) {
      throw new Error(`File type not allowed: ${extension}`);
    }

    const type = this.getFileType(extension);

    const processed: ProcessedFile = {
      path: filePath,
      name,
      size: stats.size,
      type,
      extension,
    };

    if (this.isTextFile(extension)) {
      processed.content = await fs.promises.readFile(filePath, 'utf-8');
    } else if (this.config.allowedImageTypes?.includes(extension)) {
      processed.metadata = await this.extractImageMetadata(filePath);
    }

    return processed;
  }

  private isAllowedFile(extension: string, size: number): boolean {
    if (
      this.config.allowedTypes?.includes(extension) &&
      size <= (this.config.maxFileSize || Infinity)
    ) {
      return true;
    }
    if (
      this.config.allowedImageTypes?.includes(extension) &&
      size <= (this.config.maxImageSize || Infinity)
    ) {
      return true;
    }
    return false;
  }

  private isTextFile(extension: string): boolean {
    return (
      this.config.allowedTypes?.includes(extension) || extension === '.js' || extension === '.ts'
    );
  }

  private getFileType(extension: string): string {
    const typeMap: Record<string, string> = {
      '.txt': 'text/plain',
      '.md': 'text/markdown',
      '.json': 'application/json',
      '.yaml': 'application/yaml',
      '.yml': 'application/yaml',
      '.csv': 'text/csv',
      '.xml': 'application/xml',
      '.html': 'text/html',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.gif': 'image/gif',
      '.webp': 'image/webp',
      '.bmp': 'image/bmp',
      '.pdf': 'application/pdf',
      '.doc': 'application/msword',
      '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    };
    return typeMap[extension] || 'application/octet-stream';
  }

  private async extractImageMetadata(filePath: string): Promise<Record<string, any>> {
    return {
      width: 0,
      height: 0,
      format: path.extname(filePath).slice(1),
    };
  }

  async extractText(filePath: string): Promise<string> {
    const extension = path.extname(filePath).toLowerCase();

    if (this.isTextFile(extension)) {
      return fs.promises.readFile(filePath, 'utf-8');
    }

    throw new Error(`Cannot extract text from: ${extension}`);
  }

  async parseJson(filePath: string): Promise<any> {
    const content = await this.extractText(filePath);
    return JSON.parse(content);
  }

  async parseYaml(filePath: string): Promise<any> {
    const content = await this.extractText(filePath);
    const yaml = await import('js-yaml');
    return yaml.load(content);
  }

  async parseCsv(filePath: string): Promise<any[]> {
    const content = await this.extractText(filePath);
    const lines = content.trim().split('\n');
    if (lines.length < 2) return [];

    const headers = this.parseCsvLine(lines[0]);
    return lines.slice(1).map((line) => {
      const values = this.parseCsvLine(line);
      return headers.reduce((obj: Record<string, string>, header, index) => {
        obj[header] = values[index] || '';
        return obj;
      }, {});
    });
  }

  private parseCsvLine(line: string): string[] {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;

    for (const char of line) {
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    result.push(current.trim());
    return result;
  }

  async saveFile(
    content: string | Buffer,
    destination: string,
    options?: { createDir?: boolean }
  ): Promise<string> {
    if (options?.createDir) {
      const dir = path.dirname(destination);
      if (!fs.existsSync(dir)) {
        await fs.promises.mkdir(dir, { recursive: true });
      }
    }

    await fs.promises.writeFile(destination, content);
    return destination;
  }

  async copyFile(source: string, destination: string): Promise<void> {
    await fs.promises.copyFile(source, destination);
  }

  async deleteFile(filePath: string): Promise<void> {
    await fs.promises.unlink(filePath);
  }

  async moveFile(source: string, destination: string): Promise<void> {
    await fs.promises.rename(source, destination);
  }

  async ensureDirectory(dirPath: string): Promise<void> {
    if (!fs.existsSync(dirPath)) {
      await fs.promises.mkdir(dirPath, { recursive: true });
    }
  }

  async listFiles(
    dirPath: string,
    options?: { recursive?: boolean; pattern?: RegExp }
  ): Promise<string[]> {
    const results: string[] = [];

    const traverse = async (dir: string) => {
      const entries = await fs.promises.readdir(dir, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);

        if (entry.isDirectory()) {
          if (options?.recursive) {
            await traverse(fullPath);
          }
        } else if (entry.isFile()) {
          if (!options?.pattern || options.pattern.test(entry.name)) {
            results.push(fullPath);
          }
        }
      }
    };

    await traverse(dirPath);
    return results;
  }

  async getFileInfo(filePath: string): Promise<{
    path: string;
    name: string;
    extension: string;
    size: number;
    createdAt: Date;
    modifiedAt: Date;
    isFile: boolean;
    isDirectory: boolean;
  }> {
    const stats = await fs.promises.stat(filePath);
    return {
      path: filePath,
      name: path.basename(filePath),
      extension: path.extname(filePath),
      size: stats.size,
      createdAt: stats.birthtime,
      modifiedAt: stats.mtime,
      isFile: stats.isFile(),
      isDirectory: stats.isDirectory(),
    };
  }

  async createTempFile(content: string | Buffer, extension?: string): Promise<string> {
    const tempDir = process.env.TMPDIR || '/tmp';
    const tempName = `${randomBytes(8).toString('hex')}${extension || ''}`;
    const tempPath = path.join(tempDir, tempName);
    await this.saveFile(content, tempPath);
    return tempPath;
  }

  async cleanTempFiles(pattern: string): Promise<number> {
    const tempDir = process.env.TMPDIR || '/tmp';
    const files = await fs.promises.readdir(tempDir);
    let deleted = 0;

    for (const file of files) {
      if (file.match(new RegExp(pattern))) {
        try {
          await fs.promises.unlink(path.join(tempDir, file));
          deleted++;
        } catch {}
      }
    }

    return deleted;
  }

  getExtension(filename: string): string {
    return path.extname(filename).toLowerCase();
  }

  removeExtension(filename: string): string {
    const ext = this.getExtension(filename);
    return filename.slice(0, -ext.length);
  }

  async calculateChecksum(
    filePath: string,
    algorithm: 'md5' | 'sha256' = 'sha256'
  ): Promise<string> {
    const crypto = await import('crypto');
    const content = await fs.promises.readFile(filePath);
    return crypto.createHash(algorithm).update(content).digest('hex');
  }
}

function randomBytes(size: number): Buffer {
  return require('crypto').randomBytes(size);
}

export const fileProcessor = new FileProcessor();
