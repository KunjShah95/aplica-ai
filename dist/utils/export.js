import { db } from '../db/index.js';
import * as fs from 'fs/promises';
import * as path from 'path';
export class DataExporter {
    async exportUserData(options) {
        const data = {
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
    async getConversations(options) {
        const where = { userId: options.userId };
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
    async getMemories(options) {
        const where = { userId: options.userId };
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
    async getPreferences(userId) {
        return db.userPreference.findUnique({
            where: { userId },
        });
    }
    formatAsJSON(data) {
        const content = JSON.stringify(data, null, 2);
        return {
            filename: `export_${Date.now()}.json`,
            content,
            mimeType: 'application/json',
            size: content.length,
        };
    }
    formatAsMarkdown(data) {
        const lines = [];
        lines.push('# Alpicia Data Export');
        lines.push(`\nExported: ${data.exportedAt}`);
        lines.push(`User ID: ${data.userId}`);
        if (data.conversations) {
            lines.push('\n## Conversations\n');
            const conversations = data.conversations;
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
            const memories = data.memories;
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
    formatAsCSV(data) {
        const lines = [];
        if (data.conversations) {
            lines.push('conversation_id,title,created_at,message_role,message_content');
            const conversations = data.conversations;
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
    escapeCSV(value) {
        if (value.includes(',') || value.includes('"') || value.includes('\n')) {
            return `"${value.replace(/"/g, '""')}"`;
        }
        return value;
    }
    async saveToFile(result, directory) {
        await fs.mkdir(directory, { recursive: true });
        const filePath = path.join(directory, result.filename);
        await fs.writeFile(filePath, result.content, 'utf-8');
        return filePath;
    }
}
export class DataImporter {
    async importFromJSON(userId, jsonContent) {
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
                            create: conv.messages.map((msg) => ({
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
//# sourceMappingURL=export.js.map