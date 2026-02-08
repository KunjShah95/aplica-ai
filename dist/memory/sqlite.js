import Database from 'better-sqlite3';
import * as path from 'path';
export class SQLiteMemory {
    db;
    filePath;
    maxEntries;
    constructor(options = {}) {
        this.filePath = options.filePath || path.join('./memory', 'vector.db');
        this.maxEntries = options.maxEntries || 10000;
        this.db = new Database(this.filePath);
        this.initialize();
    }
    initialize() {
        this.db.exec(`
      CREATE TABLE IF NOT EXISTS memories (
        id TEXT PRIMARY KEY,
        content TEXT NOT NULL,
        metadata TEXT,
        embedding BLOB,
        created_at TEXT NOT NULL,
        type TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS tags (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        memory_id TEXT,
        tag TEXT,
        FOREIGN KEY (memory_id) REFERENCES memories(id) ON DELETE CASCADE
      );

      CREATE VIRTUAL TABLE IF NOT EXISTS memories_fts USING fts5(
        content,
        content=memories,
        content_rowid=id
      );

      CREATE TRIGGER IF NOT EXISTS memories_ai AFTER INSERT ON memories BEGIN
        INSERT INTO memories_fts(rowid, content) VALUES (new.id, new.content);
      END;

      CREATE TRIGGER IF NOT EXISTS memories_ad AFTER DELETE ON memories BEGIN
        INSERT INTO memories_fts(memoris_fts, rowid, content) VALUES ('delete', old.id, old.content);
      END;

      CREATE INDEX IF NOT EXISTS idx_memories_type ON memories(type);
      CREATE INDEX IF NOT EXISTS idx_memories_created ON memories(created_at);
    `);
        console.log('SQLite memory initialized');
    }
    async add(entry) {
        const now = new Date().toISOString();
        const fullEntry = {
            ...entry,
            createdAt: now,
        };
        const stmt = this.db.prepare(`
      INSERT INTO memories (id, content, metadata, embedding, created_at, type)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
        const embeddingBuffer = entry.embedding
            ? Buffer.from(new Float32Array(entry.embedding).buffer)
            : null;
        stmt.run(fullEntry.id, fullEntry.content, fullEntry.metadata, embeddingBuffer, fullEntry.createdAt, fullEntry.type);
        if (fullEntry.metadata) {
            try {
                const meta = JSON.parse(fullEntry.metadata);
                if (Array.isArray(meta.tags)) {
                    const tagStmt = this.db.prepare('INSERT INTO tags (memory_id, tag) VALUES (?, ?)');
                    for (const tag of meta.tags) {
                        tagStmt.run(fullEntry.id, tag);
                    }
                }
            }
            catch {
            }
        }
        await this.pruneIfNeeded();
        return fullEntry;
    }
    async get(id) {
        const stmt = this.db.prepare('SELECT * FROM memories WHERE id = ?');
        const row = stmt.get(id);
        if (!row)
            return null;
        return {
            id: row.id,
            content: row.content,
            metadata: row.metadata,
            embedding: row.embedding ? Array.from(new Float32Array(row.embedding)) : undefined,
            createdAt: row.created_at,
            type: row.type,
        };
    }
    async search(options) {
        const { query, limit = 10, type, tags } = options;
        let sql = `
      SELECT 
        memories.id,
        memories.content,
        memories.metadata,
        memories.created_at,
        memories.type,
        bm25(memories_fts) as score
      FROM memories_fts
      JOIN memories ON memories.id = memories_fts.rowid
      WHERE memories_fts MATCH ?
    `;
        const queryTerms = this.parseSearchQuery(query);
        const params = [queryTerms];
        if (type) {
            sql += ' AND memories.type = ?';
            params.push(type);
        }
        if (tags && tags.length > 0) {
            sql +=
                ' AND memories.id IN (SELECT memory_id FROM tags WHERE tag IN (' +
                    tags.map(() => '?').join(',') +
                    '))';
            params.push(...tags);
        }
        sql += ' ORDER BY score LIMIT ?';
        params.push(limit);
        const stmt = this.db.prepare(sql);
        const rows = stmt.all(...params);
        return rows.map((row) => ({
            id: row.id,
            content: row.content,
            metadata: this.parseMetadata(row.metadata),
            score: 1 / (row.score + 1),
            type: row.type,
            createdAt: row.created_at,
        }));
    }
    async searchBySimilarity(embedding, limit = 10) {
        const embeddingBuffer = Buffer.from(new Float32Array(embedding).buffer);
        const stmt = this.db.prepare(`
      SELECT 
        id,
        content,
        metadata,
        created_at,
        type,
        (
          1 - (
            DOT(embedding, ?) / 
            (LENGTH(embedding) * LENGTH(?))
          )
        ) as distance
      FROM memories
      WHERE embedding IS NOT NULL
      ORDER BY distance ASC
      LIMIT ?
    `);
        const rows = stmt.all(embeddingBuffer, embeddingBuffer, limit);
        return rows.map((row) => ({
            id: row.id,
            content: row.content,
            metadata: this.parseMetadata(row.metadata),
            score: 1 - (row.distance || 0),
            type: row.type,
            createdAt: row.created_at,
        }));
    }
    async delete(id) {
        const stmt = this.db.prepare('DELETE FROM memories WHERE id = ?');
        const result = stmt.run(id);
        return result.changes > 0;
    }
    async clear() {
        this.db.prepare('DELETE FROM memories').run();
        this.db.prepare('DELETE FROM tags').run();
    }
    async count() {
        const result = this.db.prepare('SELECT COUNT(*) as count FROM memories').get();
        return result.count;
    }
    parseSearchQuery(query) {
        const terms = query.toLowerCase().split(/\s+/);
        return terms.map((t) => `${t}*`).join(' ') + '*';
    }
    parseMetadata(metadata) {
        try {
            return JSON.parse(metadata) || {};
        }
        catch {
            return {};
        }
    }
    async pruneIfNeeded() {
        const count = await this.count();
        if (count <= this.maxEntries)
            return;
        const stmt = this.db.prepare(`
      DELETE FROM memories
      WHERE id NOT IN (
        SELECT id FROM memories
        ORDER BY created_at DESC
        LIMIT ?
      )
    `);
        stmt.run(this.maxEntries);
    }
    async getStats() {
        const total = await this.count();
        const typeResult = this.db
            .prepare(`
      SELECT type, COUNT(*) as count FROM memories GROUP BY type
    `)
            .all();
        const byType = {};
        for (const row of typeResult) {
            byType[row.type] = row.count;
        }
        const tagsResult = this.db.prepare('SELECT COUNT(*) as count FROM tags').get();
        const stats = this.db
            .prepare('SELECT page_count * page_size as size FROM dbstat WHERE name = ?')
            .get('memories');
        return {
            totalEntries: total,
            byType,
            tagsCount: tagsResult?.count || 0,
            databaseSize: stats?.size || 0,
        };
    }
    close() {
        this.db.close();
    }
}
export const sqliteMemory = new SQLiteMemory();
//# sourceMappingURL=sqlite.js.map