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
export declare class FileSystemExecutor {
    private allowedPaths;
    private maxFileSize;
    private blockedPatterns;
    constructor(options?: {
        allowedPaths?: string[];
        maxFileSize?: number;
        blockedPatterns?: string[];
    });
    isPathAllowed(filePath: string): boolean;
    readFile(filePath: string): Promise<FileOperationResult>;
    writeFile(filePath: string, content: string): Promise<FileOperationResult>;
    appendFile(filePath: string, content: string): Promise<FileOperationResult>;
    deleteFile(filePath: string): Promise<FileOperationResult>;
    listDirectory(dirPath: string): Promise<FileOperationResult>;
    search(options: SearchOptions): Promise<FileOperationResult>;
    createDirectory(dirPath: string): Promise<FileOperationResult>;
    copyFile(sourcePath: string, destPath: string): Promise<FileOperationResult>;
    moveFile(sourcePath: string, destPath: string): Promise<FileOperationResult>;
    getFileInfo(filePath: string): Promise<FileOperationResult>;
    private getPermissionsString;
    getStatus(): {
        allowedPathsCount: number;
        maxFileSize: number;
    };
}
export declare const fileSystemExecutor: FileSystemExecutor;
//# sourceMappingURL=filesystem.d.ts.map