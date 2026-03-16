export { JSONLStore, jsonlStore } from './jsonl.js';
export { MarkdownMemory, markdownMemory } from './markdown.js';
export { PostgresMemory, postgresMemory } from './postgres.js';
export { SecondBrainSync, secondBrainSync } from './second-brain.js';
export { LegacyLetterSystem, legacyLetterSystem } from './legacy-letter.js';
export {
  UserPreferenceLearner,
  userPreferenceLearner,
  type UserPreference,
  type UserProfile,
  type PreferenceObservation,
} from './user-preferences.js';
export {
  EpisodicSummarizer,
  episodicSummarizer,
  type EpisodicMemory,
  type SummarizedEpisode,
  type SummarizationConfig,
} from './episodic-summarizer.js';

import { jsonlStore, MemoryEntry, MemoryMetadata } from './jsonl.js';
import { markdownMemory, MarkdownNote, DailyLog, LogEntry } from './markdown.js';
import { postgresMemory, MemoryInput } from './postgres.js';
import { MemoryType } from '@prisma/client';

export type MemoryStore = 'jsonl' | 'markdown' | 'postgres';

export interface MemoryManagerOptions {
  defaultStore?: MemoryStore;
  enableVectorSearch?: boolean;
  enableDailyLogs?: boolean;
  enableNotes?: boolean;
}

export interface MemorySearchOptions {
  query: string;
  store?: MemoryStore;
  limit?: number;
  type?: string;
  tags?: string[];
  userId?: string;
}

export interface MemoryResult {
  store: MemoryStore;
  results: SearchResult[];
}

interface SearchResult {
  id: string;
  content: string;
  metadata: Record<string, unknown>;
  score: number;
  type: string;
  createdAt: string;
}

export class MemoryManager {
  private defaultStore: MemoryStore;

  constructor(options: MemoryManagerOptions = {}) {
    this.defaultStore = options.defaultStore || 'postgres';
  }

  async saveConversation(
    conversationId: string,
    userId: string,
    messages: { role: string; content: string }[]
  ): Promise<void> {
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

    await postgresMemory.add({
      id: conversationId,
      userId: userId,
      type: 'CONVERSATION_SUMMARY' as MemoryType,
      content: messages.map((m) => `[${m.role}] ${m.content}`).join('\n'),
      metadata: { conversationId, userId },
    } as unknown as MemoryInput);
  }

  async saveNote(note: Omit<MarkdownNote, 'createdAt' | 'updatedAt'>): Promise<MarkdownNote> {
    return markdownMemory.createNote(note);
  }

  async getNote(fileName: string): Promise<MarkdownNote | null> {
    return markdownMemory.readNote(fileName);
  }

  async listNotes(category?: string): Promise<{ fileName: string; note: MarkdownNote }[]> {
    return markdownMemory.listNotes(category);
  }

  async searchNotes(
    query: string
  ): Promise<{ fileName: string; note: MarkdownNote; score: number }[]> {
    return markdownMemory.searchNotes(query);
  }

  async addDailyLog(entry: Omit<DailyLog['entries'][0], 'time'>): Promise<DailyLog> {
    return markdownMemory.addLogEntry(entry);
  }

  async getDailyLogs(days: number = 7): Promise<DailyLog[]> {
    return markdownMemory.getRecentLogs(days);
  }

  async search(options: MemorySearchOptions): Promise<MemoryResult[]> {
    const { query, store, limit = 10, type, tags } = options;
    const results: MemoryResult[] = [];

    const storesToSearch = store ? [store] : ['jsonl', 'postgres'];

    if (storesToSearch.includes('postgres')) {
      try {
        const postgresResults = await postgresMemory.search({
          query,
          limit,
          type: type as any,
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
      } catch (error) {
        console.error('PostgreSQL search failed:', error);
      }
    }

    if (storesToSearch.includes('jsonl')) {
      try {
        const jsonlResults = await jsonlStore.search({
          query,
          limit,
          type: type as MemoryEntry['type'],
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
      } catch (error) {
        console.error('JSONL search failed:', error);
      }
    }

    return results;
  }

  async getContext(
    userId: string,
    conversationId: string,
    maxTokens: number = 4000
  ): Promise<string> {
    const contextParts: string[] = [];

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
      store: 'postgres',
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

  async remember(
    query: string,
    options: { type?: string; maxResults?: number } = {}
  ): Promise<string> {
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

  async forget(id: string, store?: MemoryStore): Promise<boolean> {
    const stores = store ? [store] : ['jsonl', 'markdown', 'postgres'];
    let deleted = false;

    if (stores.includes('postgres')) {
      deleted = (await postgresMemory.delete(id)) || deleted;
    }

    if (stores.includes('jsonl')) {
      deleted = (await jsonlStore.delete(id)) || deleted;
    }

    if (stores.includes('markdown')) {
      deleted = (await markdownMemory.deleteNote(id)) || deleted;
    }

    return deleted;
  }

  async clear(): Promise<void> {
    await Promise.all([jsonlStore.clear(), postgresMemory.clear(), markdownMemory as any]);
  }

  async getStats(): Promise<{
    jsonl: {
      totalEntries: number;
      fileCount: number;
      totalSize: number;
      oldestEntry?: Date;
      newestEntry?: Date;
    };
    markdown: {
      notesEnabled: boolean;
      dailyLogsEnabled: boolean;
      notesCount: number;
      logsCount: number;
    };
    postgres?: {
      total: number;
      byType: Record<string, number>;
      avgImportance: number;
    };
  }> {
    const stats: any = {
      jsonl: await jsonlStore.getStats(),
      markdown: markdownMemory.getStatus(),
    };

    try {
      stats.postgres = await postgresMemory.getStats('default');
    } catch {}

    return stats;
  }

  private parseMetadata(metadata: Record<string, unknown>): Record<string, unknown> {
    return metadata;
  }
}

export const memoryManager = new MemoryManager();

export type { MemoryEntry, MarkdownNote, DailyLog, LogEntry };
