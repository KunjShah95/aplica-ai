export interface FileOperationOptions {
    encoding?: BufferEncoding;
    recursive?: boolean;
    mode?: number;
}
export interface FileSearchOptions {
    pattern: string | RegExp;
    directory: string;
    recursive?: boolean;
    maxDepth?: number;
    fileTypes?: string[];
    excludePatterns?: string[];
}
export interface FileInfo {
    path: string;
    name: string;
    extension: string;
    size: number;
    isDirectory: boolean;
    createdAt: Date;
    modifiedAt: Date;
    permissions: string;
}
export interface SearchResult {
    filePath: string;
    lineNumber: number;
    lineContent: string;
    matchCount: number;
}
export interface WriteResult {
    success: boolean;
    path: string;
    bytesWritten: number;
}
export interface ReadResult {
    success: boolean;
    path: string;
    content: string;
    encoding: string;
    size: number;
}
export declare class FilesystemTool {
    private basePath;
    private allowedPaths;
    private deniedPaths;
    private maxFileSize;
    private readonly DEFAULT_ENCODING;
    private readonly MAX_FILE_SIZE;
    private readonly DENIED_PATTERNS;
    constructor(config?: {
        basePath?: string;
        allowedPaths?: string[];
        deniedPaths?: string[];
        maxFileSize?: number;
    });
    readFile(filePath: string, options?: FileOperationOptions): Promise<ReadResult>;
    writeFile(filePath: string, content: string, options?: FileOperationOptions): Promise<WriteResult>;
    appendFile(filePath: string, content: string): Promise<WriteResult>;
    deleteFile(filePath: string): Promise<{
        success: boolean;
        path: string;
    }>;
    createDirectory(dirPath: string, recursive?: boolean): Promise<{
        success: boolean;
        path: string;
    }>;
    listDirectory(dirPath: string): Promise<FileInfo[]>;
    searchFiles(options: FileSearchOptions): Promise<string[]>;
    private searchDirectory;
    searchInFiles(searchPath: string, pattern: string | RegExp, options?: {
        encoding?: BufferEncoding;
        maxResults?: number;
    }): Promise<SearchResult[]>;
    getFileInfo(filePath: string): Promise<FileInfo | null>;
    copyFile(sourcePath: string, destPath: string): Promise<{
        success: boolean;
        source: string;
        destination: string;
    }>;
    moveFile(sourcePath: string, destPath: string): Promise<{
        success: boolean;
        source: string;
        destination: string;
    }>;
    createTempFile(content: string, prefix?: string): Promise<{
        success: boolean;
        path: string;
    }>;
    readJSON<T>(filePath: string): Promise<{
        success: boolean;
        data?: T;
        error?: string;
    }>;
    writeJSON(filePath: string, data: any, pretty?: boolean): Promise<WriteResult>;
    getDiskUsage(directory?: string): Promise<{
        total: number;
        used: number;
        free: number;
    }>;
    private resolvePath;
    private validatePath;
    private isAllowedPath;
    private shouldExclude;
    private matchesType;
    private matchesPattern;
    private getPermissionsString;
}
//# sourceMappingURL=filesystem.d.ts.map