export interface MarkdownMemoryOptions {
    directory: string;
    dailyLogs?: boolean;
    notes?: boolean;
}
export interface MarkdownNote {
    title: string;
    content: string;
    tags: string[];
    createdAt: Date;
    updatedAt: Date;
    category?: string;
    metadata?: Record<string, unknown>;
}
export interface DailyLog {
    date: string;
    entries: LogEntry[];
    summary?: string;
}
export interface LogEntry {
    time: string;
    type: 'conversation' | 'task' | 'note' | 'insight';
    content: string;
    tags?: string[];
}
export declare class MarkdownMemory {
    private directory;
    private notesDir;
    private logsDir;
    private dailyLogsEnabled;
    private notesEnabled;
    constructor(options: MarkdownMemoryOptions);
    private initialize;
    private formatDate;
    private formatTime;
    createNote(note: Omit<MarkdownNote, 'createdAt' | 'updatedAt'>): Promise<MarkdownNote>;
    updateNote(fileName: string, updates: Partial<Omit<MarkdownNote, 'createdAt'>>): Promise<MarkdownNote | null>;
    readNote(fileName: string): Promise<MarkdownNote | null>;
    listNotes(category?: string): Promise<{
        fileName: string;
        note: MarkdownNote;
    }[]>;
    deleteNote(fileName: string): Promise<boolean>;
    addLogEntry(entry: Omit<LogEntry, 'time'>): Promise<DailyLog>;
    getDailyLog(date: string): Promise<DailyLog | null>;
    getRecentLogs(days?: number): Promise<DailyLog[]>;
    searchNotes(query: string): Promise<{
        fileName: string;
        note: MarkdownNote;
        score: number;
    }[]>;
    private slugify;
    private renderNoteToMarkdown;
    private parseMarkdownToNote;
    private renderLogToMarkdown;
    private parseMarkdownToLog;
    getStatus(): {
        notesEnabled: boolean;
        dailyLogsEnabled: boolean;
        notesCount: number;
        logsCount: number;
    };
}
export declare const markdownMemory: MarkdownMemory;
//# sourceMappingURL=markdown.d.ts.map