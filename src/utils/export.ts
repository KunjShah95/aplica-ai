import { db } from '../db/index.js';
import * as fs from 'fs/promises';
import * as path from 'path';

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

export class DataExporter {
    async exportUserData(options: ExportOptions): Promise<ExportResult> {
        const data: Record<string, unknown> = {
            exportedAt: new Date().toISOString(),
            userId: options.userId,
        };

        if (options.includeConversations !== false) {
            data.conversations = await this.getConversations(options);
        }

        if (options.includeMemories !== false) {
            data.memories = await this.getMemories(options);
        }

        if (options.includePreferences !== false) {
            data.preferences = await this.getPreferences(options.userId);
        }

        switch (options.format) {
            case 'markdown':
                return this.formatAsMarkdown(data);
            case 'csv':
                return this.formatAsCSV(data);
            default:
                return this.formatAsJSON(data);
        }
    }

    private async getConversations(options: ExportOptions) {
        const where: any = { userId: options.userId };

        if (options.dateRange) {
            where.createdAt = {
                gte: options.dateRange.start,
                lte: options.dateRange.end,
            };
        }

        return db.conversation.findMany({
            where,
            include: {
                messages: {
                    orderBy: { createdAt: 'asc' },
                },
            },
            orderBy: { createdAt: 'desc' },
        });
    }

    private async getMemories(options: ExportOptions) {
        const where: any = { userId: options.userId };

        if (options.dateRange) {
            where.createdAt = {
                gte: options.dateRange.start,
                lte: options.dateRange.end,
            };
        }

        return db.memory.findMany({
            where,
            orderBy: { createdAt: 'desc' },
        });
    }

    private async getPreferences(userId: string) {
        return db.userPreference.findUnique({
            where: { userId },
        });
    }

    private formatAsJSON(data: Record<string, unknown>): ExportResult {
        const content = JSON.stringify(data, null, 2);
        return {
            filename: `export_${Date.now()}.json`,
            content,
            mimeType: 'application/json',
            size: content.length,
        };
    }

    private formatAsMarkdown(data: Record<string, unknown>): ExportResult {
        const lines: string[] = [];

        lines.push('# Alpicia Data Export');
        lines.push(`\nExported: ${data.exportedAt}`);
        lines.push(`User ID: ${data.userId}`);

        if (data.conversations) {
            lines.push('\n## Conversations\n');
            const conversations = data.conversations as any[];

            for (const conv of conversations) {
                lines.push(`### ${conv.title || 'Untitled'}`);
                lines.push(`Created: ${conv.createdAt}`);
                lines.push('');

                for (const msg of conv.messages) {
                    lines.push(`**${msg.role}**: ${msg.content}`);
                    lines.push('');
                }
                lines.push('---\n');
            }
        }

        if (data.memories) {
            lines.push('\n## Memories\n');
            const memories = data.memories as any[];

            for (const mem of memories) {
                lines.push(`- **[${mem.type}]** ${mem.content}`);
                if (mem.tags?.length) {
                    lines.push(`  Tags: ${mem.tags.join(', ')}`);
                }
            }
        }

        const content = lines.join('\n');
        return {
            filename: `export_${Date.now()}.md`,
            content,
            mimeType: 'text/markdown',
            size: content.length,
        };
    }

    private formatAsCSV(data: Record<string, unknown>): ExportResult {
        const lines: string[] = [];

        if (data.conversations) {
            lines.push('conversation_id,title,created_at,message_role,message_content');
            const conversations = data.conversations as any[];

            for (const conv of conversations) {
                for (const msg of conv.messages) {
                    lines.push([
                        conv.id,
                        this.escapeCSV(conv.title || 'Untitled'),
                        conv.createdAt,
                        msg.role,
                        this.escapeCSV(msg.content),
                    ].join(','));
                }
            }
        }

        const content = lines.join('\n');
        return {
            filename: `export_${Date.now()}.csv`,
            content,
            mimeType: 'text/csv',
            size: content.length,
        };
    }

    private escapeCSV(value: string): string {
        if (value.includes(',') || value.includes('"') || value.includes('\n')) {
            return `"${value.replace(/"/g, '""')}"`;
        }
        return value;
    }

    async saveToFile(result: ExportResult, directory: string): Promise<string> {
        await fs.mkdir(directory, { recursive: true });
        const filePath = path.join(directory, result.filename);
        await fs.writeFile(filePath, result.content, 'utf-8');
        return filePath;
    }
}

export class DataImporter {
    async importFromJSON(userId: string, jsonContent: string): Promise<{
        conversationsImported: number;
        memoriesImported: number;
    }> {
        const data = JSON.parse(jsonContent);
        let conversationsImported = 0;
        let memoriesImported = 0;

        if (data.conversations) {
            for (const conv of data.conversations) {
                await db.conversation.create({
                    data: {
                        userId,
                        title: conv.title,
                        platform: conv.platform || 'import',
                        messages: {
                            create: conv.messages.map((msg: any) => ({
                                role: msg.role,
                                content: msg.content,
                            })),
                        },
                    },
                });
                conversationsImported++;
            }
        }

        if (data.memories) {
            for (const mem of data.memories) {
                await db.memory.create({
                    data: {
                        userId,
                        type: mem.type,
                        content: mem.content,
                        tags: mem.tags || [],
                        importance: mem.importance ?? 0.5,
                        metadata: mem.metadata || {},
                    },
                });
                memoriesImported++;
            }
        }

        return { conversationsImported, memoriesImported };
    }
}

export const dataExporter = new DataExporter();
export const dataImporter = new DataImporter();
