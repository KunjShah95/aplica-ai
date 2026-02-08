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
export declare class FileProcessor {
    private config;
    constructor(config?: FileProcessingConfig);
    processFile(filePath: string): Promise<ProcessedFile>;
    private isAllowedFile;
    private isTextFile;
    private getFileType;
    private extractImageMetadata;
    extractText(filePath: string): Promise<string>;
    parseJson(filePath: string): Promise<any>;
    parseYaml(filePath: string): Promise<any>;
    parseCsv(filePath: string): Promise<any[]>;
    private parseCsvLine;
    saveFile(content: string | Buffer, destination: string, options?: {
        createDir?: boolean;
    }): Promise<string>;
    copyFile(source: string, destination: string): Promise<void>;
    deleteFile(filePath: string): Promise<void>;
    moveFile(source: string, destination: string): Promise<void>;
    ensureDirectory(dirPath: string): Promise<void>;
    listFiles(dirPath: string, options?: {
        recursive?: boolean;
        pattern?: RegExp;
    }): Promise<string[]>;
    getFileInfo(filePath: string): Promise<{
        path: string;
        name: string;
        extension: string;
        size: number;
        createdAt: Date;
        modifiedAt: Date;
        isFile: boolean;
        isDirectory: boolean;
    }>;
    createTempFile(content: string | Buffer, extension?: string): Promise<string>;
    cleanTempFiles(pattern: string): Promise<number>;
    getExtension(filename: string): string;
    removeExtension(filename: string): string;
    calculateChecksum(filePath: string, algorithm?: 'md5' | 'sha256'): Promise<string>;
}
export declare const fileProcessor: FileProcessor;
//# sourceMappingURL=file-processor.d.ts.map