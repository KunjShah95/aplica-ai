import * as fs from 'fs';
import * as path from 'path';
import { v4 as uuid } from 'uuid';
export class FilesystemTool {
    basePath;
    allowedPaths;
    deniedPaths;
    maxFileSize;
    DEFAULT_ENCODING = 'utf-8';
    MAX_FILE_SIZE = 10 * 1024 * 1024;
    DENIED_PATTERNS = [
        /\/etc\/passwd/,
        /\/etc\/shadow/,
        /\/etc\/sudoers/,
        /\.ssh\//,
        /\.aws\//,
        /\.config\/.*\/tokens/,
        /\/root\//,
        /\/home\/[^/]+\/\.ssh/,
    ];
    constructor(config) {
        this.basePath = config?.basePath || process.cwd();
        this.allowedPaths = new Set(config?.allowedPaths || []);
        this.deniedPaths = new Set(config?.deniedPaths || []);
        this.maxFileSize = config?.maxFileSize || this.MAX_FILE_SIZE;
    }
    async readFile(filePath, options) {
        try {
            const resolvedPath = this.resolvePath(filePath);
            this.validatePath(resolvedPath);
            if (!fs.existsSync(resolvedPath)) {
                return {
                    success: false,
                    path: resolvedPath,
                    content: '',
                    encoding: options?.encoding || this.DEFAULT_ENCODING,
                    size: 0,
                };
            }
            const stats = fs.statSync(resolvedPath);
            if (stats.size > this.maxFileSize) {
                return {
                    success: false,
                    path: resolvedPath,
                    content: `File too large: ${stats.size} bytes (max: ${this.maxFileSize})`,
                    encoding: options?.encoding || this.DEFAULT_ENCODING,
                    size: stats.size,
                };
            }
            const encoding = options?.encoding || this.DEFAULT_ENCODING;
            const content = fs.readFileSync(resolvedPath, { encoding });
            return {
                success: true,
                path: resolvedPath,
                content,
                encoding,
                size: Buffer.byteLength(content, encoding),
            };
        }
        catch (error) {
            return {
                success: false,
                path: filePath,
                content: `Error reading file: ${error instanceof Error ? error.message : String(error)}`,
                encoding: options?.encoding || this.DEFAULT_ENCODING,
                size: 0,
            };
        }
    }
    async writeFile(filePath, content, options) {
        try {
            const resolvedPath = this.resolvePath(filePath);
            this.validatePath(resolvedPath);
            const dir = path.dirname(resolvedPath);
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true, mode: 0o755 });
            }
            const encoding = options?.encoding || this.DEFAULT_ENCODING;
            const bytesWritten = fs.writeFileSync(resolvedPath, content, {
                encoding,
                flag: 'w',
                mode: options?.mode || 0o644,
            });
            return {
                success: true,
                path: resolvedPath,
                bytesWritten: Buffer.byteLength(content, encoding),
            };
        }
        catch (error) {
            return {
                success: false,
                path: filePath,
                bytesWritten: 0,
            };
        }
    }
    async appendFile(filePath, content) {
        try {
            const resolvedPath = this.resolvePath(filePath);
            this.validatePath(resolvedPath);
            const dir = path.dirname(resolvedPath);
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
            }
            const bytesWritten = fs.appendFileSync(resolvedPath, content);
            return {
                success: true,
                path: resolvedPath,
                bytesWritten: Buffer.byteLength(content, 'utf-8'),
            };
        }
        catch (error) {
            return {
                success: false,
                path: filePath,
                bytesWritten: 0,
            };
        }
    }
    async deleteFile(filePath) {
        try {
            const resolvedPath = this.resolvePath(filePath);
            this.validatePath(resolvedPath);
            if (fs.existsSync(resolvedPath)) {
                if (fs.statSync(resolvedPath).isDirectory()) {
                    fs.rmSync(resolvedPath, { recursive: true, force: true });
                }
                else {
                    fs.unlinkSync(resolvedPath);
                }
            }
            return { success: true, path: resolvedPath };
        }
        catch (error) {
            return {
                success: false,
                path: filePath,
            };
        }
    }
    async createDirectory(dirPath, recursive = true) {
        try {
            const resolvedPath = this.resolvePath(dirPath);
            this.validatePath(resolvedPath);
            fs.mkdirSync(resolvedPath, { recursive, mode: 0o755 });
            return { success: true, path: resolvedPath };
        }
        catch (error) {
            return {
                success: false,
                path: dirPath,
            };
        }
    }
    async listDirectory(dirPath) {
        try {
            const resolvedPath = this.resolvePath(dirPath);
            this.validatePath(resolvedPath);
            if (!fs.existsSync(resolvedPath) || !fs.statSync(resolvedPath).isDirectory()) {
                return [];
            }
            const entries = fs.readdirSync(resolvedPath, { withFileTypes: true });
            return entries.map((entry) => {
                const fullPath = path.join(resolvedPath, entry.name);
                const stats = entry.isSymbolicLink() ? fs.statSync(fullPath) : entry;
                const fsStats = stats;
                return {
                    path: fullPath,
                    name: entry.name,
                    extension: path.extname(entry.name),
                    size: fsStats.size,
                    isDirectory: entry.isDirectory(),
                    createdAt: fsStats.birthtime,
                    modifiedAt: fsStats.mtime,
                    permissions: this.getPermissionsString(fsStats.mode),
                };
            });
        }
        catch {
            return [];
        }
    }
    async searchFiles(options) {
        const results = [];
        const maxDepth = options.recursive ? options.maxDepth || 10 : 1;
        this.searchDirectory(options.directory, options.pattern, results, 0, maxDepth, options.fileTypes, options.excludePatterns);
        return results;
    }
    searchDirectory(dir, pattern, results, currentDepth, maxDepth, fileTypes, excludePatterns) {
        try {
            if (currentDepth > maxDepth)
                return;
            const entries = fs.readdirSync(dir, { withFileTypes: true });
            for (const entry of entries) {
                const fullPath = path.join(dir, entry.name);
                if (this.shouldExclude(entry.name, excludePatterns))
                    continue;
                if (entry.isDirectory()) {
                    this.searchDirectory(fullPath, pattern, results, currentDepth + 1, maxDepth, fileTypes, excludePatterns);
                }
                else if (entry.isFile()) {
                    if (this.matchesType(entry.name, fileTypes) && this.matchesPattern(entry.name, pattern)) {
                        results.push(fullPath);
                    }
                }
            }
        }
        catch { }
    }
    async searchInFiles(searchPath, pattern, options) {
        const results = [];
        const maxResults = options?.maxResults || 100;
        const encoding = options?.encoding || this.DEFAULT_ENCODING;
        const files = await this.searchFiles({
            directory: searchPath,
            pattern: /.*/,
            recursive: true,
        });
        for (const filePath of files) {
            if (results.length >= maxResults)
                break;
            try {
                const content = fs.readFileSync(filePath, { encoding });
                const lines = content.split('\n');
                for (let i = 0; i < lines.length; i++) {
                    if (pattern instanceof RegExp) {
                        const match = lines[i].match(pattern);
                        if (match) {
                            results.push({
                                filePath,
                                lineNumber: i + 1,
                                lineContent: lines[i],
                                matchCount: match.length,
                            });
                        }
                    }
                    else if (lines[i].includes(pattern)) {
                        results.push({
                            filePath,
                            lineNumber: i + 1,
                            lineContent: lines[i],
                            matchCount: 1,
                        });
                    }
                }
            }
            catch {
                continue;
            }
        }
        return results;
    }
    async getFileInfo(filePath) {
        try {
            const resolvedPath = this.resolvePath(filePath);
            this.validatePath(resolvedPath);
            if (!fs.existsSync(resolvedPath))
                return null;
            const stats = fs.statSync(resolvedPath);
            return {
                path: resolvedPath,
                name: path.basename(resolvedPath),
                extension: path.extname(resolvedPath),
                size: stats.size,
                isDirectory: stats.isDirectory(),
                createdAt: stats.birthtime,
                modifiedAt: stats.mtime,
                permissions: this.getPermissionsString(stats.mode),
            };
        }
        catch {
            return null;
        }
    }
    async copyFile(sourcePath, destPath) {
        try {
            const resolvedSource = this.resolvePath(sourcePath);
            const resolvedDest = this.resolvePath(destPath);
            this.validatePath(resolvedSource);
            this.validatePath(resolvedDest);
            fs.copyFileSync(resolvedSource, resolvedDest);
            return {
                success: true,
                source: resolvedSource,
                destination: resolvedDest,
            };
        }
        catch (error) {
            return {
                success: false,
                source: sourcePath,
                destination: destPath,
            };
        }
    }
    async moveFile(sourcePath, destPath) {
        try {
            const resolvedSource = this.resolvePath(sourcePath);
            const resolvedDest = this.resolvePath(destPath);
            this.validatePath(resolvedSource);
            this.validatePath(resolvedDest);
            fs.renameSync(resolvedSource, resolvedDest);
            return {
                success: true,
                source: resolvedSource,
                destination: resolvedDest,
            };
        }
        catch (error) {
            return {
                success: false,
                source: sourcePath,
                destination: destPath,
            };
        }
    }
    async createTempFile(content, prefix = 'sentinel-') {
        const tempDir = fs.realpathSync(fs.mkdtempSync(path.join(fs.realpathSync('.'), 'tmp-')));
        const tempPath = path.join(tempDir, `${prefix}${uuid()}.tmp`);
        return this.writeFile(tempPath, content);
    }
    async readJSON(filePath) {
        const result = await this.readFile(filePath);
        if (!result.success) {
            return { success: false, error: result.content };
        }
        try {
            const data = JSON.parse(result.content);
            return { success: true, data };
        }
        catch (error) {
            return {
                success: false,
                error: `Invalid JSON: ${error instanceof Error ? error.message : String(error)}`,
            };
        }
    }
    async writeJSON(filePath, data, pretty = true) {
        const content = pretty ? JSON.stringify(data, null, 2) : JSON.stringify(data);
        return this.writeFile(filePath, content);
    }
    async getDiskUsage(directory) {
        const targetDir = directory || this.basePath;
        try {
            const stats = fs.statfsSync(fs.realpathSync(targetDir));
            return {
                total: stats.blocks * stats.bsize,
                used: (stats.blocks - stats.bfree) * stats.bsize,
                free: stats.bfree * stats.bsize,
            };
        }
        catch {
            return { total: 0, used: 0, free: 0 };
        }
    }
    resolvePath(filePath) {
        if (path.isAbsolute(filePath)) {
            return path.normalize(filePath);
        }
        return path.normalize(path.join(this.basePath, filePath));
    }
    validatePath(resolvedPath) {
        const normalizedPath = path.normalize(resolvedPath);
        if (!normalizedPath.startsWith(this.basePath) && !this.isAllowedPath(normalizedPath)) {
            throw new Error(`Access denied: ${resolvedPath}`);
        }
        for (const pattern of this.DENIED_PATTERNS) {
            if (pattern.test(normalizedPath)) {
                throw new Error(`Access denied: ${normalizedPath} matches restricted pattern`);
            }
        }
    }
    isAllowedPath(pathToCheck) {
        if (this.allowedPaths.size === 0)
            return false;
        return Array.from(this.allowedPaths).some((allowed) => pathToCheck.startsWith(allowed));
    }
    shouldExclude(name, patterns) {
        if (!patterns)
            return false;
        return patterns.some((pattern) => {
            if (pattern.startsWith('*')) {
                return name.endsWith(pattern.slice(1));
            }
            return name === pattern || name.includes(pattern);
        });
    }
    matchesType(fileName, types) {
        if (!types || types.length === 0)
            return true;
        const ext = path.extname(fileName).toLowerCase();
        return types.some((type) => {
            const normalizedType = type.startsWith('.') ? type.toLowerCase() : `.${type.toLowerCase()}`;
            return ext === normalizedType;
        });
    }
    matchesPattern(fileName, pattern) {
        if (pattern instanceof RegExp) {
            return pattern.test(fileName);
        }
        return fileName.includes(pattern);
    }
    getPermissionsString(mode) {
        const permissions = ['---', '--x', '-w-', '-wx', 'r--', 'r-x', 'rw-', 'rwx'];
        const bits = mode & 0o777;
        return permissions[(bits >> 6) & 7] + permissions[(bits >> 3) & 7] + permissions[bits & 7];
    }
}
//# sourceMappingURL=filesystem.js.map