export { JSONLStore, jsonlStore } from './jsonl.js';
export { MarkdownMemory, markdownMemory } from './markdown.js';
export { SQLiteMemory, sqliteMemory } from './sqlite.js';
export { PostgresMemory, postgresMemory } from './postgres.js';
import { jsonlStore } from './jsonl.js';
import { markdownMemory } from './markdown.js';
import { sqliteMemory } from './sqlite.js';
import { postgresMemory } from './postgres.js';
export class MemoryManager {
    defaultStore;
    constructor(options = {}) {
        this.defaultStore = options.defaultStore || 'sqlite';
    }
    async saveConversation(conversationId, userId, messages) {
        const content = JSON.stringify({
            conversationId,
            userId,
            messageCount: messages.length,
            messages,
        });
        await jsonlStore.add({
            type: 'conversation',
            content,
            metadata: { conversationId, userId, messageCount: messages.length },
        });
        await sqliteMemory.add({
            id: conversationId,
            type: 'conversation',
            content: messages.map((m) => `[${m.role}] ${m.content}`).join('\n'),
            metadata: JSON.stringify({ conversationId, userId }),
        });
    }
    async saveNote(note) {
        return markdownMemory.createNote(note);
    }
    async getNote(fileName) {
        return markdownMemory.readNote(fileName);
    }
    async listNotes(category) {
        return markdownMemory.listNotes(category);
    }
    async searchNotes(query) {
        return markdownMemory.searchNotes(query);
    }
    async addDailyLog(entry) {
        return markdownMemory.addLogEntry(entry);
    }
    async getDailyLogs(days = 7) {
        return markdownMemory.getRecentLogs(days);
    }
    async search(options) {
        const { query, store, limit = 10, type, tags } = options;
        const results = [];
        const storesToSearch = store ? [store] : ['jsonl', 'sqlite', 'postgres'];
        if (storesToSearch.includes('postgres')) {
            try {
                const postgresResults = await postgresMemory.search({
                    query,
                    limit,
                    type: type,
                    tags,
                    userId: options.userId || 'default',
                });
                results.push({
                    store: 'postgres',
                    results: postgresResults.map((r) => ({
                        id: r.id,
                        content: r.content,
                        metadata: r.metadata,
                        score: r.similarity || 0.5,
                        type: r.type,
                        createdAt: r.createdAt instanceof Date ? r.createdAt.toISOString() : r.createdAt,
                    })),
                });
            }
            catch (error) {
                console.error('PostgreSQL search failed:', error);
            }
        }
        if (storesToSearch.includes('sqlite')) {
            try {
                const sqliteResults = await sqliteMemory.search({
                    query,
                    limit,
                    type,
                    tags,
                });
                results.push({ store: 'sqlite', results: sqliteResults });
            }
            catch (error) {
                console.error('SQLite search failed:', error);
            }
        }
        if (storesToSearch.includes('jsonl')) {
            try {
                const jsonlResults = await jsonlStore.search({
                    query,
                    limit,
                    type: type,
                    tags,
                });
                results.push({
                    store: 'jsonl',
                    results: jsonlResults.map((r) => ({
                        id: r.entry.id,
                        content: r.entry.content,
                        metadata: this.parseMetadata(r.entry.metadata),
                        score: r.score,
                        type: r.entry.type,
                        createdAt: r.entry.timestamp.toISOString(),
                    })),
                });
            }
            catch (error) {
                console.error('JSONL search failed:', error);
            }
        }
        return results;
    }
    async getContext(userId, conversationId, maxTokens = 4000) {
        const contextParts = [];
        const logs = await markdownMemory.getDailyLog(new Date().toISOString().split('T')[0]);
        if (logs && logs.entries.length > 0) {
            const recentEntries = logs.entries
                .slice(-5)
                .map((e) => `[${e.time}] ${e.type}: ${e.content}`)
                .join('\n');
            contextParts.push(`Today's activity:\n${recentEntries}`);
        }
        const notes = await markdownMemory.listNotes();
        const userNotes = notes
            .filter((n) => n.note.metadata?.userId === userId || n.note.tags?.includes(userId))
            .slice(0, 3);
        if (userNotes.length > 0) {
            const noteContent = userNotes
                .map((n) => `## ${n.note.title}\n${n.note.content}`)
                .join('\n\n');
            contextParts.push(`Relevant notes:\n${noteContent}`);
        }
        const searchResults = await this.search({
            query: conversationId,
            store: 'sqlite',
            limit: 5,
        });
        if (searchResults.length > 0) {
            const recentContext = searchResults[0].results
                .map((r) => `[${r.type}] ${r.content.slice(0, 200)}`)
                .join('\n');
            contextParts.push(`Recent context:\n${recentContext}`);
        }
        return contextParts.join('\n\n---\n\n');
    }
    async remember(query, options = {}) {
        const results = await this.search({
            query,
            limit: options.maxResults || 5,
            type: options.type,
        });
        if (results.length === 0 || results.every((r) => r.results.length === 0)) {
            return '';
        }
        const memories = results.flatMap((r) => r.results);
        const sorted = memories.sort((a, b) => b.score - a.score);
        return sorted
            .slice(0, options.maxResults || 5)
            .map((r) => `- ${r.content}`)
            .join('\n');
    }
    async forget(id, store) {
        const stores = store ? [store] : ['jsonl', 'sqlite', 'markdown', 'postgres'];
        let deleted = false;
        if (stores.includes('postgres')) {
            deleted = (await postgresMemory.delete(id)) || deleted;
        }
        if (stores.includes('sqlite')) {
            deleted = (await sqliteMemory.delete(id)) || deleted;
        }
        if (stores.includes('jsonl')) {
            deleted = (await jsonlStore.delete(id)) || deleted;
        }
        if (stores.includes('markdown')) {
            deleted = (await markdownMemory.deleteNote(id)) || deleted;
        }
        return deleted;
    }
    async clear() {
        await Promise.all([
            jsonlStore.clear(),
            sqliteMemory.clear(),
            postgresMemory.clear(),
            markdownMemory,
        ]);
    }
    async getStats() {
        const stats = {
            jsonl: await jsonlStore.getStats(),
            markdown: markdownMemory.getStatus(),
            sqlite: await sqliteMemory.getStats(),
        };
        try {
            stats.postgres = await postgresMemory.getStats('default');
        }
        catch { }
        return stats;
    }
    parseMetadata(metadata) {
        return metadata;
    }
}
export const memoryManager = new MemoryManager();
//# sourceMappingURL=index.js.map