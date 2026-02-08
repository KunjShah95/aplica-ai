export { JSONLStore, jsonlStore } from './jsonl.js';
export { MarkdownMemory, markdownMemory } from './markdown.js';
export { SQLiteMemory, sqliteMemory } from './sqlite.js';
export { PostgresMemory, postgresMemory } from './postgres.js';
import { MemoryEntry } from './jsonl.js';
import { MarkdownNote, DailyLog, LogEntry } from './markdown.js';
import { SearchResult } from './sqlite.js';
export type MemoryStore = 'jsonl' | 'markdown' | 'sqlite' | 'postgres';
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
export declare class MemoryManager {
    private defaultStore;
    constructor(options?: MemoryManagerOptions);
    saveConversation(conversationId: string, userId: string, messages: {
        role: string;
        content: string;
    }[]): Promise<void>;
    saveNote(note: Omit<MarkdownNote, 'createdAt' | 'updatedAt'>): Promise<MarkdownNote>;
    getNote(fileName: string): Promise<MarkdownNote | null>;
    listNotes(category?: string): Promise<{
        fileName: string;
        note: MarkdownNote;
    }[]>;
    searchNotes(query: string): Promise<{
        fileName: string;
        note: MarkdownNote;
        score: number;
    }[]>;
    addDailyLog(entry: Omit<DailyLog['entries'][0], 'time'>): Promise<DailyLog>;
    getDailyLogs(days?: number): Promise<DailyLog[]>;
    search(options: MemorySearchOptions): Promise<MemoryResult[]>;
    getContext(userId: string, conversationId: string, maxTokens?: number): Promise<string>;
    remember(query: string, options?: {
        type?: string;
        maxResults?: number;
    }): Promise<string>;
    forget(id: string, store?: MemoryStore): Promise<boolean>;
    clear(): Promise<void>;
    getStats(): Promise<{
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
        sqlite: {
            totalEntries: number;
            byType: Record<string, number>;
            tagsCount: number;
            databaseSize: number;
        };
        postgres?: {
            total: number;
            byType: Record<string, number>;
            avgImportance: number;
        };
    }>;
    private parseMetadata;
}
export declare const memoryManager: MemoryManager;
export type { MemoryEntry, MarkdownNote, DailyLog, LogEntry, SearchResult };
//# sourceMappingURL=index.d.ts.map