import Database from 'better-sqlite3';
import * as path from 'path';

export interface SQLiteMemoryOptions {
  filePath?: string;
  maxEntries?: number;
}

export interface VectorEntry {
  id: string;
  content: string;
  metadata: string;
  embedding?: number[];
  createdAt: string;
  type: string;
}

export interface SearchOptions {
  query: string;
  limit?: number;
  type?: string;
  tags?: string[];
  minScore?: number;
}

export interface SearchResult {
  id: string;
  content: string;
  metadata: Record<string, unknown>;
  score: number;
  type: string;
  createdAt: string;
}

export class SQLiteMemory {
  private db: Database.Database;
  private filePath: string;
  private maxEntries: number;

  constructor(options: SQLiteMemoryOptions = {}) {
    this.filePath = options.filePath || path.join('./memory', 'vector.db');
    this.maxEntries = options.maxEntries || 10000;
    this.db = new Database(this.filePath);
    this.initialize();
  }

  private initialize(): void {
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

  async add(entry: Omit<VectorEntry, 'createdAt'>): Promise<VectorEntry> {
    const now = new Date().toISOString();
    const fullEntry: VectorEntry = {
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

    stmt.run(
      fullEntry.id,
      fullEntry.content,
      fullEntry.metadata,
      embeddingBuffer,
      fullEntry.createdAt,
      fullEntry.type
    );

    if (fullEntry.metadata) {
      try {
        const meta = JSON.parse(fullEntry.metadata);
        if (Array.isArray(meta.tags)) {
          const tagStmt = this.db.prepare('INSERT INTO tags (memory_id, tag) VALUES (?, ?)');
          for (const tag of meta.tags) {
            tagStmt.run(fullEntry.id, tag);
          }
        }
      } catch {
      }
    }

    await this.pruneIfNeeded();

    return fullEntry;
  }

  async get(id: string): Promise<VectorEntry | null> {
    const stmt = this.db.prepare('SELECT * FROM memories WHERE id = ?');
    const row = stmt.get(id) as any;

    if (!row) return null;

    return {
      id: row.id,
      content: row.content,
      metadata: row.metadata,
      embedding: row.embedding ? Array.from(new Float32Array(row.embedding)) : undefined,
      createdAt: row.created_at,
      type: row.type,
    };
  }

  async search(options: SearchOptions): Promise<SearchResult[]> {
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
    const params: unknown[] = [queryTerms];

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
    const rows = stmt.all(...params) as any[];

    return rows.map((row) => ({
      id: row.id,
      content: row.content,
      metadata: this.parseMetadata(row.metadata),
      score: 1 / (row.score + 1),
      type: row.type,
      createdAt: row.created_at,
    }));
  }

  async searchBySimilarity(embedding: number[], limit: number = 10): Promise<SearchResult[]> {
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

    const rows = stmt.all(embeddingBuffer, embeddingBuffer, limit) as any[];

    return rows.map((row) => ({
      id: row.id,
      content: row.content,
      metadata: this.parseMetadata(row.metadata),
      score: 1 - (row.distance || 0),
      type: row.type,
      createdAt: row.created_at,
    }));
  }

  async delete(id: string): Promise<boolean> {
    const stmt = this.db.prepare('DELETE FROM memories WHERE id = ?');
    const result = stmt.run(id);
    return result.changes > 0;
  }

  async clear(): Promise<void> {
    this.db.prepare('DELETE FROM memories').run();
    this.db.prepare('DELETE FROM tags').run();
  }

  async count(): Promise<number> {
    const result = this.db.prepare('SELECT COUNT(*) as count FROM memories').get() as any;
    return result.count;
  }

  private parseSearchQuery(query: string): string {
    const terms = query.toLowerCase().split(/\s+/);
    return terms.map((t) => `${t}*`).join(' ') + '*';
  }

  private parseMetadata(metadata: string): Record<string, unknown> {
    try {
      return JSON.parse(metadata) || {};
    } catch {
      return {};
    }
  }

  private async pruneIfNeeded(): Promise<void> {
    const count = await this.count();
    if (count <= this.maxEntries) return;

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

  async getStats(): Promise<{
    totalEntries: number;
    byType: Record<string, number>;
    tagsCount: number;
    databaseSize: number;
  }> {
    const total = await this.count();

    const typeResult = this.db
      .prepare(
        `
      SELECT type, COUNT(*) as count FROM memories GROUP BY type
    `
      )
      .all() as any[];

    const byType: Record<string, number> = {};
    for (const row of typeResult) {
      byType[row.type] = row.count;
    }

    const tagsResult = this.db.prepare('SELECT COUNT(*) as count FROM tags').get() as any;

    const stats = this.db
      .prepare('SELECT page_count * page_size as size FROM dbstat WHERE name = ?')
      .get('memories') as any;

    return {
      totalEntries: total,
      byType,
      tagsCount: tagsResult?.count || 0,
      databaseSize: stats?.size || 0,
    };
  }

  close(): void {
    this.db.close();
  }
}

export const sqliteMemory = new SQLiteMemory();
