import * as fs from 'fs';
import * as path from 'path';
import { randomUUID } from 'crypto';

export interface SecondBrainConfig {
  vaultPath: string;
  format: 'obsidian' | 'logseq';
  bidirectional: boolean;
  syncInterval: number;
  autoSync: boolean;
}

export interface SyncedNote {
  id: string;
  title: string;
  content: string;
  source: 'local' | 'external';
  lastSynced: Date;
  tags: string[];
}

export interface ContextualRecall {
  query: string;
  matchedNotes: SyncedNote[];
  relevanceScore: number;
  suggestedForConversation: boolean;
}

export class SecondBrainSync {
  private config: SecondBrainConfig;
  private cache: Map<string, SyncedNote> = new Map();
  private lastSync: Date | null = null;

  constructor(config: Partial<SecondBrainConfig> = {}) {
    this.config = {
      vaultPath: config.vaultPath || './vault',
      format: config.format || 'obsidian',
      bidirectional: config.bidirectional ?? true,
      syncInterval: config.syncInterval || 300000,
      autoSync: config.autoSync ?? true,
    };
  }

  async sync(): Promise<{ added: number; updated: number; errors: string[] }> {
    const errors: string[] = [];
    let added = 0;
    let updated = 0;

    try {
      if (!fs.existsSync(this.config.vaultPath)) {
        return { added: 0, updated: 0, errors: ['Vault path does not exist'] };
      }

      const notes = await this.scanVault();

      for (const note of notes) {
        try {
          const existing = this.cache.get(note.id);

          if (!existing) {
            this.cache.set(note.id, note);
            added++;
          } else if (new Date(note.lastSynced) > new Date(existing.lastSynced)) {
            this.cache.set(note.id, note);
            updated++;
          }
        } catch (e) {
          errors.push(`Failed to process ${note.title}: ${e}`);
        }
      }

      if (this.config.bidirectional) {
        await this.pushLocalChanges();
      }

      this.lastSync = new Date();
    } catch (e) {
      errors.push(`Sync failed: ${e}`);
    }

    return { added, updated, errors };
  }

  private async scanVault(): Promise<SyncedNote[]> {
    const notes: SyncedNote[] = [];
    const ext = this.config.format === 'obsidian' ? '.md' : '.md';

    const scanDir = (dir: string) => {
      const entries = fs.readdirSync(dir, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);

        if (entry.isDirectory() && !entry.name.startsWith('.')) {
          scanDir(fullPath);
        } else if (entry.isFile() && entry.name.endsWith(ext)) {
          const note = this.parseNoteFile(fullPath);
          if (note) {
            notes.push(note);
          }
        }
      }
    };

    scanDir(this.config.vaultPath);
    return notes;
  }

  private parseNoteFile(filePath: string): SyncedNote | null {
    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      const fileName = path.basename(filePath, '.md');

      let title = fileName;
      let body = content;
      const tags: string[] = [];

      const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);

      if (frontmatterMatch) {
        const frontmatter = frontmatterMatch[1];
        body = frontmatterMatch[2];

        const titleMatch = frontmatter.match(/title:\s*(.+)/);
        if (titleMatch) {
          title = titleMatch[1].trim().replace(/^["']|["']$/g, '');
        }

        const tagsMatch = frontmatter.match(/tags:\s*\[([^\]]+)\]/);
        if (tagsMatch) {
          tags.push(...tagsMatch[1].split(',').map((t) => t.trim().replace(/["']/g, '')));
        }
      }

      return {
        id: this.generateNoteId(filePath),
        title,
        content: body.trim(),
        source: 'external',
        lastSynced: fs.statSync(filePath).mtime,
        tags,
      };
    } catch {
      return null;
    }
  }

  private generateNoteId(filePath: string): string {
    return Buffer.from(filePath).toString('base64').slice(0, 16);
  }

  private async pushLocalChanges(): Promise<void> {
    const outputDir = path.join(process.cwd(), 'memory', 'second-brain-output');

    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    for (const [id, note] of this.cache) {
      if (note.source === 'local') {
        const fileName = `${note.title.replace(/[^a-zA-Z0-9]/g, '-')}.md`;
        const filePath = path.join(outputDir, fileName);

        const frontmatter = `---
id: ${id}
lastSynced: ${note.lastSynced.toISOString()}
tags: [${note.tags.join(', ')}]
---

`;
        fs.writeFileSync(filePath, frontmatter + note.content);
      }
    }
  }

  async findContextuallyRelevant(
    query: string,
    conversationContext?: string
  ): Promise<ContextualRecall[]> {
    if (this.cache.size === 0) {
      await this.sync();
    }

    const queryTerms = query.toLowerCase().split(/\s+/);
    const contextTerms = conversationContext?.toLowerCase().split(/\s+/) || [];
    const allTerms = [...queryTerms, ...contextTerms];

    const scored: { note: SyncedNote; score: number }[] = [];

    for (const note of this.cache.values()) {
      let score = 0;
      const noteText = (note.title + ' ' + note.content).toLowerCase();

      for (const term of allTerms) {
        if (noteText.includes(term)) {
          score += 1;
        }
      }

      for (const tag of note.tags) {
        if (allTerms.some((t) => tag.toLowerCase().includes(t))) {
          score += 0.5;
        }
      }

      if (score > 0) {
        scored.push({ note, score });
      }
    }

    return scored
      .sort((a, b) => b.score - a.score)
      .slice(0, 5)
      .map(({ note, score }) => ({
        query,
        matchedNotes: [note],
        relevanceScore: score / allTerms.length,
        suggestedForConversation: score / allTerms.length > 0.3,
      }));
  }

  async getNoteById(id: string): Promise<SyncedNote | null> {
    return this.cache.get(id) || null;
  }

  async searchByTitle(title: string): Promise<SyncedNote | null> {
    for (const note of this.cache.values()) {
      if (note.title.toLowerCase().includes(title.toLowerCase())) {
        return note;
      }
    }
    return null;
  }

  async createLocalNote(title: string, content: string, tags: string[] = []): Promise<SyncedNote> {
    const note: SyncedNote = {
      id: randomUUID(),
      title,
      content,
      source: 'local',
      lastSynced: new Date(),
      tags,
    };

    this.cache.set(note.id, note);

    if (this.config.bidirectional) {
      await this.pushLocalChanges();
    }

    return note;
  }

  getStatus(): { lastSync: Date | null; noteCount: number; config: SecondBrainConfig } {
    return {
      lastSync: this.lastSync,
      noteCount: this.cache.size,
      config: this.config,
    };
  }
}

export const secondBrainSync = new SecondBrainSync();
