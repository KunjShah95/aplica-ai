import * as fs from 'fs';
import * as path from 'path';
export class FileProcessor {
    config;
    constructor(config = {}) {
        this.config = {
            maxFileSize: 10 * 1024 * 1024,
            allowedTypes: ['.txt', '.md', '.json', '.yaml', '.yml', '.csv', '.xml', '.html'],
            maxImageSize: 5 * 1024 * 1024,
            allowedImageTypes: ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp'],
            ...config,
        };
    }
    async processFile(filePath) {
        const stats = await fs.promises.stat(filePath);
        const extension = path.extname(filePath).toLowerCase();
        const name = path.basename(filePath);
        if (!this.isAllowedFile(extension, stats.size)) {
            throw new Error(`File type not allowed: ${extension}`);
        }
        const type = this.getFileType(extension);
        const processed = {
            path: filePath,
            name,
            size: stats.size,
            type,
            extension,
        };
        if (this.isTextFile(extension)) {
            processed.content = await fs.promises.readFile(filePath, 'utf-8');
        }
        else if (this.config.allowedImageTypes?.includes(extension)) {
            processed.metadata = await this.extractImageMetadata(filePath);
        }
        return processed;
    }
    isAllowedFile(extension, size) {
        if (this.config.allowedTypes?.includes(extension) &&
            size <= (this.config.maxFileSize || Infinity)) {
            return true;
        }
        if (this.config.allowedImageTypes?.includes(extension) &&
            size <= (this.config.maxImageSize || Infinity)) {
            return true;
        }
        return false;
    }
    isTextFile(extension) {
        return (this.config.allowedTypes?.includes(extension) || extension === '.js' || extension === '.ts');
    }
    getFileType(extension) {
        const typeMap = {
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
    async extractImageMetadata(filePath) {
        return {
            width: 0,
            height: 0,
            format: path.extname(filePath).slice(1),
        };
    }
    async extractText(filePath) {
        const extension = path.extname(filePath).toLowerCase();
        if (this.isTextFile(extension)) {
            return fs.promises.readFile(filePath, 'utf-8');
        }
        throw new Error(`Cannot extract text from: ${extension}`);
    }
    async parseJson(filePath) {
        const content = await this.extractText(filePath);
        return JSON.parse(content);
    }
    async parseYaml(filePath) {
        const content = await this.extractText(filePath);
        const yaml = await import('js-yaml');
        return yaml.load(content);
    }
    async parseCsv(filePath) {
        const content = await this.extractText(filePath);
        const lines = content.trim().split('\n');
        if (lines.length < 2)
            return [];
        const headers = this.parseCsvLine(lines[0]);
        return lines.slice(1).map((line) => {
            const values = this.parseCsvLine(line);
            return headers.reduce((obj, header, index) => {
                obj[header] = values[index] || '';
                return obj;
            }, {});
        });
    }
    parseCsvLine(line) {
        const result = [];
        let current = '';
        let inQuotes = false;
        for (const char of line) {
            if (char === '"') {
                inQuotes = !inQuotes;
            }
            else if (char === ',' && !inQuotes) {
                result.push(current.trim());
                current = '';
            }
            else {
                current += char;
            }
        }
        result.push(current.trim());
        return result;
    }
    async saveFile(content, destination, options) {
        if (options?.createDir) {
            const dir = path.dirname(destination);
            if (!fs.existsSync(dir)) {
                await fs.promises.mkdir(dir, { recursive: true });
            }
        }
        await fs.promises.writeFile(destination, content);
        return destination;
    }
    async copyFile(source, destination) {
        await fs.promises.copyFile(source, destination);
    }
    async deleteFile(filePath) {
        await fs.promises.unlink(filePath);
    }
    async moveFile(source, destination) {
        await fs.promises.rename(source, destination);
    }
    async ensureDirectory(dirPath) {
        if (!fs.existsSync(dirPath)) {
            await fs.promises.mkdir(dirPath, { recursive: true });
        }
    }
    async listFiles(dirPath, options) {
        const results = [];
        const traverse = async (dir) => {
            const entries = await fs.promises.readdir(dir, { withFileTypes: true });
            for (const entry of entries) {
                const fullPath = path.join(dir, entry.name);
                if (entry.isDirectory()) {
                    if (options?.recursive) {
                        await traverse(fullPath);
                    }
                }
                else if (entry.isFile()) {
                    if (!options?.pattern || options.pattern.test(entry.name)) {
                        results.push(fullPath);
                    }
                }
            }
        };
        await traverse(dirPath);
        return results;
    }
    async getFileInfo(filePath) {
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
    async createTempFile(content, extension) {
        const tempDir = process.env.TMPDIR || '/tmp';
        const tempName = `${randomBytes(8).toString('hex')}${extension || ''}`;
        const tempPath = path.join(tempDir, tempName);
        await this.saveFile(content, tempPath);
        return tempPath;
    }
    async cleanTempFiles(pattern) {
        const tempDir = process.env.TMPDIR || '/tmp';
        const files = await fs.promises.readdir(tempDir);
        let deleted = 0;
        for (const file of files) {
            if (file.match(new RegExp(pattern))) {
                try {
                    await fs.promises.unlink(path.join(tempDir, file));
                    deleted++;
                }
                catch { }
            }
        }
        return deleted;
    }
    getExtension(filename) {
        return path.extname(filename).toLowerCase();
    }
    removeExtension(filename) {
        const ext = this.getExtension(filename);
        return filename.slice(0, -ext.length);
    }
    async calculateChecksum(filePath, algorithm = 'sha256') {
        const crypto = await import('crypto');
        const content = await fs.promises.readFile(filePath);
        return crypto.createHash(algorithm).update(content).digest('hex');
    }
}
function randomBytes(size) {
    return require('crypto').randomBytes(size);
}
export const fileProcessor = new FileProcessor();
//# sourceMappingURL=file-processor.js.map