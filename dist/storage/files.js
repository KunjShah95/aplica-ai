import * as fs from 'fs/promises';
import * as path from 'path';
import * as crypto from 'crypto';
export class LocalStorageProvider {
    basePath;
    metadataPath;
    constructor(basePath = './uploads') {
        this.basePath = basePath;
        this.metadataPath = path.join(basePath, '.metadata');
        this.ensureDirectories();
    }
    async ensureDirectories() {
        await fs.mkdir(this.basePath, { recursive: true });
        await fs.mkdir(this.metadataPath, { recursive: true });
    }
    async upload(buffer, options) {
        if (options.maxSize && buffer.length > options.maxSize) {
            throw new Error(`File exceeds maximum size of ${options.maxSize} bytes`);
        }
        const id = this.generateId();
        const ext = path.extname(options.originalName);
        const filename = `${id}${ext}`;
        const checksum = this.calculateChecksum(buffer);
        const metadata = {
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
    async download(fileId) {
        const metadata = await this.getMetadata(fileId);
        if (!metadata) {
            throw new Error(`File not found: ${fileId}`);
        }
        const filePath = path.join(this.basePath, metadata.filename);
        const buffer = await fs.readFile(filePath);
        return { buffer, metadata };
    }
    async delete(fileId) {
        const metadata = await this.getMetadata(fileId);
        if (!metadata) {
            throw new Error(`File not found: ${fileId}`);
        }
        const filePath = path.join(this.basePath, metadata.filename);
        const metaPath = path.join(this.metadataPath, `${fileId}.json`);
        await fs.unlink(filePath);
        await fs.unlink(metaPath);
    }
    async getMetadata(fileId) {
        try {
            const metaPath = path.join(this.metadataPath, `${fileId}.json`);
            const content = await fs.readFile(metaPath, 'utf-8');
            return JSON.parse(content);
        }
        catch {
            return null;
        }
    }
    async list(userId, limit = 100) {
        const files = [];
        try {
            const metaFiles = await fs.readdir(this.metadataPath);
            for (const file of metaFiles) {
                if (!file.endsWith('.json'))
                    continue;
                const content = await fs.readFile(path.join(this.metadataPath, file), 'utf-8');
                const metadata = JSON.parse(content);
                if (metadata.uploadedBy === userId) {
                    files.push(metadata);
                }
                if (files.length >= limit)
                    break;
            }
        }
        catch {
            return [];
        }
        return files.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }
    async getUrl(fileId, _expiresIn) {
        const metadata = await this.getMetadata(fileId);
        if (!metadata) {
            throw new Error(`File not found: ${fileId}`);
        }
        return `/api/files/${fileId}/download`;
    }
    generateId() {
        return `file_${Date.now()}_${crypto.randomBytes(8).toString('hex')}`;
    }
    calculateChecksum(buffer) {
        return crypto.createHash('sha256').update(buffer).digest('hex');
    }
}
export class S3StorageProvider {
    bucket;
    region;
    accessKeyId;
    secretAccessKey;
    constructor(config) {
        this.bucket = config.bucket;
        this.region = config.region;
        this.accessKeyId = config.accessKeyId;
        this.secretAccessKey = config.secretAccessKey;
    }
    async upload(buffer, options) {
        const id = `file_${Date.now()}_${crypto.randomBytes(8).toString('hex')}`;
        const ext = path.extname(options.originalName);
        const key = `uploads/${options.userId}/${id}${ext}`;
        const response = await fetch(`https://${this.bucket}.s3.${this.region}.amazonaws.com/${key}`, {
            method: 'PUT',
            headers: {
                'Content-Type': options.mimeType,
                'x-amz-content-sha256': crypto.createHash('sha256').update(buffer).digest('hex'),
            },
            body: buffer,
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
    async download(fileId) {
        throw new Error('S3 download not implemented - use presigned URLs');
    }
    async delete(fileId) {
        throw new Error('S3 delete not implemented');
    }
    async getMetadata(fileId) {
        throw new Error('S3 getMetadata not implemented');
    }
    async list(userId, limit) {
        throw new Error('S3 list not implemented');
    }
    async getUrl(fileId, expiresIn = 3600) {
        return `https://${this.bucket}.s3.${this.region}.amazonaws.com/uploads/${fileId}`;
    }
}
export function createStorageProvider() {
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
//# sourceMappingURL=files.js.map