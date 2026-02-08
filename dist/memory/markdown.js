import * as fs from 'fs';
import * as path from 'path';
export class MarkdownMemory {
    directory;
    notesDir;
    logsDir;
    dailyLogsEnabled;
    notesEnabled;
    constructor(options) {
        this.directory = options.directory || './memory';
        this.notesDir = path.join(this.directory, 'notes');
        this.logsDir = path.join(this.directory, 'logs');
        this.dailyLogsEnabled = options.dailyLogs !== false;
        this.notesEnabled = options.notes !== false;
        this.initialize();
    }
    initialize() {
        if (this.notesEnabled && !fs.existsSync(this.notesDir)) {
            fs.mkdirSync(this.notesDir, { recursive: true });
        }
        if (this.dailyLogsEnabled && !fs.existsSync(this.logsDir)) {
            fs.mkdirSync(this.logsDir, { recursive: true });
        }
    }
    formatDate(date) {
        return date.toISOString().split('T')[0];
    }
    formatTime(date) {
        return date.toTimeString().split(' ')[0].substring(0, 5);
    }
    async createNote(note) {
        if (!this.notesEnabled) {
            throw new Error('Notes are not enabled');
        }
        const now = new Date();
        const fullNote = {
            ...note,
            createdAt: now,
            updatedAt: now,
        };
        const fileName = `${this.slugify(note.title)}-${this.formatDate(now)}.md`;
        const filePath = path.join(this.notesDir, fileName);
        const content = this.renderNoteToMarkdown(fullNote);
        fs.writeFileSync(filePath, content, 'utf-8');
        return fullNote;
    }
    async updateNote(fileName, updates) {
        if (!this.notesEnabled) {
            throw new Error('Notes are not enabled');
        }
        const filePath = path.join(this.notesDir, fileName);
        if (!fs.existsSync(filePath)) {
            return null;
        }
        const existing = await this.readNote(fileName);
        if (!existing)
            return null;
        const updated = {
            ...existing,
            ...updates,
            updatedAt: new Date(),
        };
        const content = this.renderNoteToMarkdown(updated);
        fs.writeFileSync(filePath, content, 'utf-8');
        return updated;
    }
    async readNote(fileName) {
        if (!this.notesEnabled) {
            throw new Error('Notes are not enabled');
        }
        const filePath = path.join(this.notesDir, fileName);
        if (!fs.existsSync(filePath)) {
            return null;
        }
        const content = fs.readFileSync(filePath, 'utf-8');
        return this.parseMarkdownToNote(content);
    }
    async listNotes(category) {
        if (!this.notesEnabled) {
            return [];
        }
        const files = fs.readdirSync(this.notesDir).filter((f) => f.endsWith('.md'));
        const notes = [];
        for (const file of files) {
            const note = await this.readNote(file);
            if (note && (!category || note.category === category)) {
                notes.push({ fileName: file, note });
            }
        }
        return notes.sort((a, b) => b.note.updatedAt.getTime() - a.note.updatedAt.getTime());
    }
    async deleteNote(fileName) {
        if (!this.notesEnabled) {
            throw new Error('Notes are not enabled');
        }
        const filePath = path.join(this.notesDir, fileName);
        if (!fs.existsSync(filePath)) {
            return false;
        }
        fs.unlinkSync(filePath);
        return true;
    }
    async addLogEntry(entry) {
        if (!this.dailyLogsEnabled) {
            throw new Error('Daily logs are not enabled');
        }
        const today = this.formatDate(new Date());
        const logFile = `${today}.md`;
        const filePath = path.join(this.logsDir, logFile);
        let log;
        if (fs.existsSync(filePath)) {
            const content = fs.readFileSync(filePath, 'utf-8');
            log = await this.parseMarkdownToLog(content);
        }
        else {
            log = { date: today, entries: [] };
        }
        const newEntry = {
            ...entry,
            time: this.formatTime(new Date()),
        };
        log.entries.push(newEntry);
        fs.writeFileSync(filePath, this.renderLogToMarkdown(log), 'utf-8');
        return log;
    }
    async getDailyLog(date) {
        if (!this.dailyLogsEnabled) {
            throw new Error('Daily logs are not enabled');
        }
        const filePath = path.join(this.logsDir, `${date}.md`);
        if (!fs.existsSync(filePath)) {
            return null;
        }
        const content = fs.readFileSync(filePath, 'utf-8');
        return this.parseMarkdownToLog(content);
    }
    async getRecentLogs(days = 7) {
        if (!this.dailyLogsEnabled) {
            return [];
        }
        const logs = [];
        const files = fs.readdirSync(this.logsDir).filter((f) => f.endsWith('.md'));
        for (let i = 0; i < days; i++) {
            const date = new Date();
            date.setDate(date.getDate() - i);
            const dateStr = this.formatDate(date);
            const log = await this.getDailyLog(dateStr);
            if (log) {
                logs.push(log);
            }
        }
        return logs;
    }
    async searchNotes(query) {
        if (!this.notesEnabled) {
            return [];
        }
        const notes = await this.listNotes();
        const results = [];
        const queryLower = query.toLowerCase();
        for (const { fileName, note } of notes) {
            let score = 0;
            const contentLower = (note.title + ' ' + note.content).toLowerCase();
            if (contentLower.includes(queryLower)) {
                score = contentLower.split(queryLower).length;
            }
            if (note.tags.some((t) => t.toLowerCase().includes(queryLower))) {
                score += 3;
            }
            if (note.title.toLowerCase().includes(queryLower)) {
                score += 5;
            }
            if (score > 0) {
                results.push({ fileName, note, score });
            }
        }
        return results.sort((a, b) => b.score - a.score);
    }
    slugify(text) {
        return text
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/(^-|-$)/g, '');
    }
    renderNoteToMarkdown(note) {
        const tags = note.tags.map((t) => `\`${t}\``).join(' ');
        return `---
title: ${note.title}
category: ${note.category || 'uncategorized'}
tags: ${tags}
created: ${note.createdAt.toISOString()}
updated: ${note.updatedAt.toISOString()}
---

# ${note.title}

${note.content}
`;
    }
    parseMarkdownToNote(content) {
        const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
        if (!frontmatterMatch)
            return null;
        try {
            const frontmatter = frontmatterMatch[1];
            const body = frontmatterMatch[2].trim();
            const titleMatch = frontmatter.match(/title:\s*(.+)/);
            const categoryMatch = frontmatter.match(/category:\s*(.+)/);
            const tagsMatch = frontmatter.match(/tags:\s*(.+)/);
            const createdMatch = frontmatter.match(/created:\s*(.+)/);
            const updatedMatch = frontmatter.match(/updated:\s*(.+)/);
            const tags = tagsMatch ? tagsMatch[1].split(',').map((t) => t.trim().replace(/`/g, '')) : [];
            return {
                title: titleMatch ? titleMatch[1].trim() : 'Untitled',
                category: categoryMatch ? categoryMatch[1].trim() : undefined,
                tags,
                content: body,
                createdAt: createdMatch ? new Date(createdMatch[1].trim()) : new Date(),
                updatedAt: updatedMatch ? new Date(updatedMatch[1].trim()) : new Date(),
            };
        }
        catch {
            return null;
        }
    }
    renderLogToMarkdown(log) {
        return `---
date: ${log.date}
entries: ${log.entries.length}
---

# Daily Log - ${log.date}

${log.summary ? `## Summary\n${log.summary}\n` : ''}
## Entries

${log.entries
            .map((entry) => `### [${entry.time}] ${entry.type}\n${entry.content}${entry.tags ? `\nTags: ${entry.tags.map((t) => `\`${t}\``).join(' ')}` : ''}`)
            .join('\n\n')}
`;
    }
    async parseMarkdownToLog(content) {
        const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
        if (!frontmatterMatch) {
            return { date: '', entries: [] };
        }
        const frontmatter = frontmatterMatch[1];
        const body = frontmatterMatch[2].trim();
        const dateMatch = frontmatter.match(/date:\s*(.+)/);
        const summaryMatch = body.match(/## Summary\n([\s\S]*?)(?=\n##|$)/);
        const entries = [];
        const entrySection = body.match(/## Entries\n([\s\S]*)$/);
        if (entrySection) {
            const entryTexts = entrySection[1].split(/### \[/).filter(Boolean);
            for (const entryText of entryTexts) {
                const timeMatch = entryText.match(/^(\d{2}:\d{2})\]/);
                const typeMatch = entryText.match(/\]\s*(\w+)\n/);
                const tagsMatch = entryText.match(/Tags:\s*(.+)/);
                if (timeMatch && typeMatch) {
                    const contentMatch = entryText
                        .replace(/^(\d{2}:\d{2})\].*\n/, '')
                        .replace(/\nTags:.*$/, '')
                        .trim();
                    entries.push({
                        time: timeMatch[1],
                        type: typeMatch[1],
                        content: contentMatch,
                        tags: tagsMatch
                            ? tagsMatch[1].split(',').map((t) => t.trim().replace(/`/g, ''))
                            : undefined,
                    });
                }
            }
        }
        return {
            date: dateMatch ? dateMatch[1].trim() : '',
            entries,
            summary: summaryMatch ? summaryMatch[1].trim() : undefined,
        };
    }
    getStatus() {
        const notesCount = this.notesEnabled
            ? fs.existsSync(this.notesDir)
                ? fs.readdirSync(this.notesDir).length
                : 0
            : 0;
        const logsCount = this.dailyLogsEnabled
            ? fs.existsSync(this.logsDir)
                ? fs.readdirSync(this.logsDir).length
                : 0
            : 0;
        return {
            notesEnabled: this.notesEnabled,
            dailyLogsEnabled: this.dailyLogsEnabled,
            notesCount,
            logsCount,
        };
    }
}
export const markdownMemory = new MarkdownMemory({ directory: './memory' });
//# sourceMappingURL=markdown.js.map