import * as fs from 'fs';
import * as path from 'path';
import { randomUUID } from 'crypto';
export class JSONLStore {
    directory;
    maxEntries;
    maxFileSize;
    writeStream = null;
    currentFileSize = 0;
    fileIndex = 0;
    constructor(options) {
        this.directory = options.directory || './memory';
        this.maxEntries = options.maxEntries || 10000;
        this.maxFileSize = options.maxFileSize || 10 * 1024 * 1024;
        this.initialize();
    }
    initialize() {
        if (!fs.existsSync(this.directory)) {
            fs.mkdirSync(this.directory, { recursive: true });
        }
        this.rotateFileIfNeeded();
    }
    getFilePath() {
        return path.join(this.directory, `memory-${this.fileIndex}.jsonl`);
    }
    rotateFileIfNeeded() {
        const filePath = this.getFilePath();
        if (fs.existsSync(filePath)) {
            const stats = fs.statSync(filePath);
            if (stats.size >= this.maxFileSize) {
                this.fileIndex++;
                this.currentFileSize = 0;
            }
            else {
                this.currentFileSize = stats.size;
            }
        }
    }
    async add(entry) {
        const fullEntry = {
            ...entry,
            id: randomUUID(),
            timestamp: new Date(),
        };
        const line = JSON.stringify(fullEntry) + '\n';
        const filePath = this.getFilePath();
        if (!fs.existsSync(filePath)) {
            fs.writeFileSync(filePath, '');
        }
        fs.appendFileSync(filePath, line);
        this.currentFileSize += Buffer.byteLength(line);
        this.rotateFileIfNeeded();
        await this.pruneIfNeeded();
        return fullEntry;
    }
    async get(id) {
        const allEntries = await this.getAll();
        return allEntries.find((e) => e.id === id) || null;
    }
    async getAll() {
        const allEntries = [];
        const files = fs.readdirSync(this.directory).filter((f) => f.endsWith('.jsonl'));
        for (const file of files) {
            const filePath = path.join(this.directory, file);
            const content = fs.readFileSync(filePath, 'utf-8');
            const lines = content.split('\n').filter(Boolean);
            for (const line of lines) {
                try {
                    const entry = JSON.parse(line);
                    allEntries.push(entry);
                }
                catch {
                }
            }
        }
        return allEntries.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
    }
    async search(options) {
        const { query, filter, type, tags, limit = 100, offset = 0 } = options;
        const allEntries = await this.getAll();
        const results = [];
        for (const entry of allEntries) {
            if (type && entry.type !== type)
                continue;
            if (filter) {
                if (filter.userId && entry.metadata.userId !== filter.userId)
                    continue;
                if (filter.conversationId && entry.metadata.conversationId !== filter.conversationId)
                    continue;
                if (filter.source && entry.metadata.source !== filter.source)
                    continue;
            }
            if (tags && tags.length > 0) {
                const entryTags = entry.metadata.tags || [];
                if (!tags.some((tag) => entryTags.includes(tag)))
                    continue;
            }
            let score = 1;
            if (query) {
                const queryLower = query.toLowerCase();
                const contentLower = entry.content.toLowerCase();
                if (contentLower.includes(queryLower)) {
                    score = contentLower.split(queryLower).length;
                }
                if (entry.metadata.tags?.some((t) => t.toLowerCase().includes(queryLower))) {
                    score += 2;
                }
            }
            results.push({ id: entry.id, score, entry });
        }
        return results.sort((a, b) => b.score - a.score).slice(offset, offset + limit);
    }
    async delete(id) {
        const entries = await this.getAll();
        const filtered = entries.filter((e) => e.id !== id);
        if (filtered.length === entries.length) {
            return false;
        }
        await this.clear();
        for (const entry of filtered) {
            await this.add(entry);
        }
        return true;
    }
    async clear() {
        const files = fs.readdirSync(this.directory).filter((f) => f.endsWith('.jsonl'));
        for (const file of files) {
            fs.unlinkSync(path.join(this.directory, file));
        }
        this.fileIndex = 0;
        this.currentFileSize = 0;
    }
    async pruneIfNeeded() {
        const entries = await this.getAll();
        if (entries.length <= this.maxEntries)
            return;
        const sorted = entries.sort((a, b) => {
            const importanceA = a.metadata.importance ?? 0;
            const importanceB = b.metadata.importance ?? 0;
            return importanceB - importanceA;
        });
        const toRemove = sorted.slice(this.maxEntries);
        const toKeep = sorted.slice(0, this.maxEntries);
        await this.clear();
        for (const entry of toKeep) {
            await this.add(entry);
        }
    }
    async getStats() {
        const entries = await this.getAll();
        const files = fs.readdirSync(this.directory).filter((f) => f.endsWith('.jsonl'));
        let totalSize = 0;
        for (const file of files) {
            const filePath = path.join(this.directory, file);
            totalSize += fs.statSync(filePath).size;
        }
        return {
            totalEntries: entries.length,
            fileCount: files.length,
            totalSize,
            oldestEntry: entries.length > 0 ? entries[entries.length - 1].timestamp : undefined,
            newestEntry: entries.length > 0 ? entries[0].timestamp : undefined,
        };
    }
}
export const jsonlStore = new JSONLStore({ directory: './memory/jsonl' });
//# sourceMappingURL=jsonl.js.map