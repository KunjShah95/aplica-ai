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
    download(fileId: string): Promise<{
        buffer: Buffer;
        metadata: FileMetadata;
    }>;
    delete(fileId: string): Promise<void>;
    getMetadata(fileId: string): Promise<FileMetadata | null>;
    list(userId: string, limit?: number): Promise<FileMetadata[]>;
    getUrl(fileId: string, expiresIn?: number): Promise<string>;
}
export declare class LocalStorageProvider implements StorageProvider {
    private basePath;
    private metadataPath;
    constructor(basePath?: string);
    private ensureDirectories;
    upload(buffer: Buffer, options: UploadOptions): Promise<FileMetadata>;
    download(fileId: string): Promise<{
        buffer: Buffer;
        metadata: FileMetadata;
    }>;
    delete(fileId: string): Promise<void>;
    getMetadata(fileId: string): Promise<FileMetadata | null>;
    list(userId: string, limit?: number): Promise<FileMetadata[]>;
    getUrl(fileId: string, _expiresIn?: number): Promise<string>;
    private generateId;
    private calculateChecksum;
}
export declare class S3StorageProvider implements StorageProvider {
    private bucket;
    private region;
    private accessKeyId;
    private secretAccessKey;
    constructor(config: {
        bucket: string;
        region: string;
        accessKeyId: string;
        secretAccessKey: string;
    });
    upload(buffer: Buffer, options: UploadOptions): Promise<FileMetadata>;
    download(fileId: string): Promise<{
        buffer: Buffer;
        metadata: FileMetadata;
    }>;
    delete(fileId: string): Promise<void>;
    getMetadata(fileId: string): Promise<FileMetadata | null>;
    list(userId: string, limit?: number): Promise<FileMetadata[]>;
    getUrl(fileId: string, expiresIn?: number): Promise<string>;
}
export declare function createStorageProvider(): StorageProvider;
export declare const storageProvider: StorageProvider;
//# sourceMappingURL=files.d.ts.map