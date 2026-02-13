import * as fs from 'fs/promises';
import * as path from 'path';
import * as crypto from 'crypto';

export interface FileMetadata {
  id: string;
  filename: string;
  originalName: string;
  mimeType: string;
  size: number;
  checksum: string;
  uploadedBy: string;
  createdAt: Date;
  metadata?: Record<string, unknown>;
}

export interface UploadOptions {
  userId: string;
  originalName: string;
  mimeType: string;
  metadata?: Record<string, unknown>;
  maxSize?: number;
}

export interface StorageProvider {
  upload(buffer: Buffer, options: UploadOptions): Promise<FileMetadata>;
  download(fileId: string): Promise<{ buffer: Buffer; metadata: FileMetadata }>;
  delete(fileId: string): Promise<void>;
  getMetadata(fileId: string): Promise<FileMetadata | null>;
  list(userId: string, limit?: number): Promise<FileMetadata[]>;
  getUrl(fileId: string, expiresIn?: number): Promise<string>;
}

export class LocalStorageProvider implements StorageProvider {
  private basePath: string;
  private metadataPath: string;

  constructor(basePath: string = './uploads') {
    this.basePath = basePath;
    this.metadataPath = path.join(basePath, '.metadata');
    this.ensureDirectories();
  }

  private async ensureDirectories(): Promise<void> {
    await fs.mkdir(this.basePath, { recursive: true });
    await fs.mkdir(this.metadataPath, { recursive: true });
  }

  async upload(buffer: Buffer, options: UploadOptions): Promise<FileMetadata> {
    if (options.maxSize && buffer.length > options.maxSize) {
      throw new Error(`File exceeds maximum size of ${options.maxSize} bytes`);
    }

    const id = this.generateId();
    const ext = path.extname(options.originalName);
    const filename = `${id}${ext}`;
    const checksum = this.calculateChecksum(buffer);

    const metadata: FileMetadata = {
      id,
      filename,
      originalName: options.originalName,
      mimeType: options.mimeType,
      size: buffer.length,
      checksum,
      uploadedBy: options.userId,
      createdAt: new Date(),
      metadata: options.metadata,
    };

    const filePath = path.join(this.basePath, filename);
    await fs.writeFile(filePath, buffer);

    const metaPath = path.join(this.metadataPath, `${id}.json`);
    await fs.writeFile(metaPath, JSON.stringify(metadata, null, 2));

    return metadata;
  }

  async download(fileId: string): Promise<{ buffer: Buffer; metadata: FileMetadata }> {
    const metadata = await this.getMetadata(fileId);
    if (!metadata) {
      throw new Error(`File not found: ${fileId}`);
    }

    const filePath = path.join(this.basePath, metadata.filename);
    const buffer = await fs.readFile(filePath);

    return { buffer, metadata };
  }

  async delete(fileId: string): Promise<void> {
    const metadata = await this.getMetadata(fileId);
    if (!metadata) {
      throw new Error(`File not found: ${fileId}`);
    }

    const filePath = path.join(this.basePath, metadata.filename);
    const metaPath = path.join(this.metadataPath, `${fileId}.json`);

    await fs.unlink(filePath);
    await fs.unlink(metaPath);
  }

  async getMetadata(fileId: string): Promise<FileMetadata | null> {
    try {
      const metaPath = path.join(this.metadataPath, `${fileId}.json`);
      const content = await fs.readFile(metaPath, 'utf-8');
      return JSON.parse(content);
    } catch {
      return null;
    }
  }

  async list(userId: string, limit: number = 100): Promise<FileMetadata[]> {
    const files: FileMetadata[] = [];

    try {
      const metaFiles = await fs.readdir(this.metadataPath);

      for (const file of metaFiles) {
        if (!file.endsWith('.json')) continue;

        const content = await fs.readFile(path.join(this.metadataPath, file), 'utf-8');
        const metadata = JSON.parse(content) as FileMetadata;

        if (metadata.uploadedBy === userId) {
          files.push(metadata);
        }

        if (files.length >= limit) break;
      }
    } catch {
      return [];
    }

    return files.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  async getUrl(fileId: string, _expiresIn?: number): Promise<string> {
    const metadata = await this.getMetadata(fileId);
    if (!metadata) {
      throw new Error(`File not found: ${fileId}`);
    }

    return `/api/files/${fileId}/download`;
  }

  private generateId(): string {
    return `file_${Date.now()}_${crypto.randomBytes(8).toString('hex')}`;
  }

  private calculateChecksum(buffer: Buffer): string {
    return crypto.createHash('sha256').update(buffer).digest('hex');
  }
}

export class S3StorageProvider implements StorageProvider {
  private bucket: string;
  private region: string;
  private accessKeyId: string;
  private secretAccessKey: string;

  constructor(config: {
    bucket: string;
    region: string;
    accessKeyId: string;
    secretAccessKey: string;
  }) {
    this.bucket = config.bucket;
    this.region = config.region;
    this.accessKeyId = config.accessKeyId;
    this.secretAccessKey = config.secretAccessKey;
  }

  async upload(buffer: Buffer, options: UploadOptions): Promise<FileMetadata> {
    const id = `file_${Date.now()}_${crypto.randomBytes(8).toString('hex')}`;
    const ext = path.extname(options.originalName);
    const key = `uploads/${options.userId}/${id}${ext}`;

    const response = await fetch(`https://${this.bucket}.s3.${this.region}.amazonaws.com/${key}`, {
      method: 'PUT',
      headers: {
        'Content-Type': options.mimeType,
        'x-amz-content-sha256': crypto.createHash('sha256').update(buffer).digest('hex'),
      },
      body: new Uint8Array(buffer),
    });

    if (!response.ok) {
      throw new Error(`S3 upload failed: ${response.statusText}`);
    }

    return {
      id,
      filename: key,
      originalName: options.originalName,
      mimeType: options.mimeType,
      size: buffer.length,
      checksum: crypto.createHash('sha256').update(buffer).digest('hex'),
      uploadedBy: options.userId,
      createdAt: new Date(),
      metadata: options.metadata,
    };
  }

  async download(fileId: string): Promise<{ buffer: Buffer; metadata: FileMetadata }> {
    throw new Error('S3 download not implemented - use presigned URLs');
  }

  async delete(fileId: string): Promise<void> {
    throw new Error('S3 delete not implemented');
  }

  async getMetadata(fileId: string): Promise<FileMetadata | null> {
    throw new Error('S3 getMetadata not implemented');
  }

  async list(userId: string, limit?: number): Promise<FileMetadata[]> {
    throw new Error('S3 list not implemented');
  }

  async getUrl(fileId: string, expiresIn: number = 3600): Promise<string> {
    return `https://${this.bucket}.s3.${this.region}.amazonaws.com/uploads/${fileId}`;
  }
}

export function createStorageProvider(): StorageProvider {
  const provider = process.env.STORAGE_PROVIDER || 'local';

  if (provider === 's3') {
    return new S3StorageProvider({
      bucket: process.env.S3_BUCKET || '',
      region: process.env.S3_REGION || 'us-east-1',
      accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
    });
  }

  return new LocalStorageProvider(process.env.UPLOAD_PATH || './uploads');
}

export const storageProvider = createStorageProvider();
