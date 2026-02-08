export interface ExportOptions {
    userId: string;
    format: 'json' | 'markdown' | 'csv';
    includeConversations?: boolean;
    includeMemories?: boolean;
    includePreferences?: boolean;
    dateRange?: {
        start: Date;
        end: Date;
    };
}
export interface ExportResult {
    filename: string;
    content: string;
    mimeType: string;
    size: number;
}
export declare class DataExporter {
    exportUserData(options: ExportOptions): Promise<ExportResult>;
    private getConversations;
    private getMemories;
    private getPreferences;
    private formatAsJSON;
    private formatAsMarkdown;
    private formatAsCSV;
    private escapeCSV;
    saveToFile(result: ExportResult, directory: string): Promise<string>;
}
export declare class DataImporter {
    importFromJSON(userId: string, jsonContent: string): Promise<{
        conversationsImported: number;
        memoriesImported: number;
    }>;
}
export declare const dataExporter: DataExporter;
export declare const dataImporter: DataImporter;
//# sourceMappingURL=export.d.ts.map