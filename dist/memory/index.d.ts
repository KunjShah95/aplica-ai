export { JSONLStore, jsonlStore } from './jsonl.js';
export { MarkdownMemory, markdownMemory } from './markdown.js';
export { PostgresMemory, postgresMemory } from './postgres.js';
export { UserPreferenceLearner, userPreferenceLearner, type UserPreference, type UserProfile, type PreferenceObservation, } from './user-preferences.js';
export { EpisodicSummarizer, episodicSummarizer, type EpisodicMemory, type SummarizedEpisode, type SummarizationConfig, } from './episodic-summarizer.js';
import { MemoryEntry } from './jsonl.js';
import { MarkdownNote, DailyLog, LogEntry } from './markdown.js';
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
        postgres?: {
            total: number;
            byType: Record<string, number>;
            avgImportance: number;
        };
    }>;
    private parseMetadata;
}
export declare const memoryManager: MemoryManager;
export type { MemoryEntry, MarkdownNote, DailyLog, LogEntry };
//# sourceMappingURL=index.d.ts.map