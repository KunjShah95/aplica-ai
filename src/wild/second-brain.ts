import { randomUUID } from 'crypto';

export interface BrainNode {
  id: string;
  type: 'concept' | 'note' | 'task' | 'person' | 'project' | 'resource';
  title: string;
  content: string;
  tags: string[];
  links: string[];
  createdAt: Date;
  updatedAt: Date;
  accessCount: number;
  importance: number;
}

export interface SearchResult {
  node: BrainNode;
  score: number;
  matchedTerms: string[];
  context: string;
}

export interface SyncConfig {
  provider: 'obsidian' | 'notion' | 'local' | 'both';
  vaultPath?: string;
  notionApiKey?: string;
  autoSync: boolean;
  syncInterval: number;
}

const DEFAULT_CONFIG: SyncConfig = {
  provider: 'local',
  autoSync: false,
  syncInterval: 300000,
};

export class SecondBrainSync {
  private nodes: Map<string, BrainNode> = new Map();
  private config: SyncConfig;
  private syncTimer?: NodeJS.Timeout;

  constructor(config: Partial<SyncConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  async createNode(
    type: BrainNode['type'],
    title: string,
    content: string,
    tags: string[] = []
  ): Promise<BrainNode> {
    const node: BrainNode = {
      id: randomUUID(),
      type,
      title,
      content,
      tags,
      links: [],
      createdAt: new Date(),
      updatedAt: new Date(),
      accessCount: 0,
      importance: 0.5,
    };

    this.nodes.set(node.id, node);
    return node;
  }

  async updateNode(id: string, updates: Partial<BrainNode>): Promise<BrainNode | null> {
    const node = this.nodes.get(id);
    if (!node) return null;

    const updated = {
      ...node,
      ...updates,
      updatedAt: new Date(),
    };

    this.nodes.set(id, updated);
    return updated;
  }

  async deleteNode(id: string): Promise<boolean> {
    return this.nodes.delete(id);
  }

  async linkNodes(sourceId: string, targetId: string): Promise<boolean> {
    const source = this.nodes.get(sourceId);
    const target = this.nodes.get(targetId);

    if (!source || !target) return false;

    if (!source.links.includes(targetId)) {
      source.links.push(targetId);
    }
    if (!target.links.includes(sourceId)) {
      target.links.push(sourceId);
    }

    return true;
  }

  async search(query: string, limit: number = 10): Promise<SearchResult[]> {
    const queryTerms = query.toLowerCase().split(/\s+/);
    const results: SearchResult[] = [];

    for (const node of this.nodes.values()) {
      const titleLower = node.title.toLowerCase();
      const contentLower = node.content.toLowerCase();
      const tagsLower = node.tags.map((t) => t.toLowerCase());

      let score = 0;
      const matchedTerms: string[] = [];

      for (const term of queryTerms) {
        if (titleLower.includes(term)) {
          score += 10;
          matchedTerms.push(term);
        }
        if (contentLower.includes(term)) {
          score += 5;
          if (!matchedTerms.includes(term)) matchedTerms.push(term);
        }
        if (tagsLower.some((t) => t.includes(term))) {
          score += 7;
          if (!matchedTerms.includes(term)) matchedTerms.push(term);
        }
      }

      if (score > 0) {
        score *= node.importance;
        const linkScore = node.links.length * 0.1;
        score += linkScore;

        results.push({
          node,
          score,
          matchedTerms,
          context: this.extractContext(node.content, queryTerms),
        });
      }
    }

    return results.sort((a, b) => b.score - a.score).slice(0, limit);
  }

  private extractContext(content: string, terms: string[]): string {
    const contentLower = content.toLowerCase();
    const firstMatch = terms.find((t) => contentLower.includes(t));

    if (!firstMatch) {
      return content.slice(0, 150) + '...';
    }

    const idx = contentLower.indexOf(firstMatch);
    const start = Math.max(0, idx - 50);
    const end = Math.min(content.length, idx + 100);

    return (
      (start > 0 ? '...' : '') + content.slice(start, end) + (end < content.length ? '...' : '')
    );
  }

  getRelatedNodes(nodeId: string, depth: number = 1): BrainNode[] {
    const node = this.nodes.get(nodeId);
    if (!node) return [];

    const related = new Set<string>();
    const queue = [nodeId];
    let currentDepth = 0;

    while (queue.length > 0 && currentDepth < depth) {
      const currentId = queue.shift()!;
      const current = this.nodes.get(currentId);

      if (current) {
        for (const linkId of current.links) {
          if (!related.has(linkId)) {
            related.add(linkId);
            queue.push(linkId);
          }
        }
      }
      currentDepth++;
    }

    return Array.from(related)
      .map((id) => this.nodes.get(id))
      .filter(Boolean) as BrainNode[];
  }

  async recordAccess(nodeId: string): Promise<void> {
    const node = this.nodes.get(nodeId);
    if (node) {
      node.accessCount++;
      node.importance = Math.min(1, 0.5 + node.accessCount * 0.01);
    }
  }

  async getGraph(): Promise<{
    nodes: BrainNode[];
    links: Array<{ source: string; target: string }>;
  }> {
    const graphNodes = Array.from(this.nodes.values());
    const links: Array<{ source: string; target: string }> = [];

    for (const node of graphNodes) {
      for (const linkId of node.links) {
        links.push({ source: node.id, target: linkId });
      }
    }

    return { nodes: graphNodes, links };
  }

  async importFromMarkdown(markdown: string): Promise<BrainNode[]> {
    const nodes: BrainNode[] = [];
    const blocks = markdown.split(/^# /m).filter(Boolean);

    for (const block of blocks) {
      const lines = block.split('\n');
      const title = lines[0].trim();
      const content = lines.slice(1).join('\n').trim();

      const tags: string[] = [];
      const tagMatches = content.match(/#[a-zA-Z0-9_-]+/g);
      if (tagMatches) {
        tags.push(...tagMatches.map((t) => t.slice(1)));
      }

      const node = await this.createNode('note', title, content, tags);
      nodes.push(node);
    }

    return nodes;
  }

  async exportToMarkdown(): Promise<string> {
    const nodes = Array.from(this.nodes.values());
    return nodes
      .map((node) => {
        const tags = node.tags.map((t) => `#${t}`).join(' ');
        return `# ${node.title}\n\n${node.content}\n\n${tags}\n`;
      })
      .join('\n\n');
  }

  async sync(): Promise<{ imported: number; exported: number }> {
    let imported = 0;
    let exported = 0;

    if (this.config.provider === 'obsidian' || this.config.provider === 'both') {
      imported += await this.syncObsidian();
    }

    if (this.config.provider === 'notion' || this.config.provider === 'both') {
      imported += await this.syncNotion();
    }

    exported = this.nodes.size;

    return { imported, exported };
  }

  private async syncObsidian(): Promise<number> {
    if (!this.config.vaultPath) return 0;
    return 0;
  }

  private async syncNotion(): Promise<number> {
    if (!this.config.notionApiKey) return 0;
    return 0;
  }

  startAutoSync(): void {
    if (this.syncTimer) return;

    this.syncTimer = setInterval(() => {
      this.sync().catch(console.error);
    }, this.config.syncInterval);
  }

  stopAutoSync(): void {
    if (this.syncTimer) {
      clearInterval(this.syncTimer);
      this.syncTimer = undefined;
    }
  }

  getStats(): { totalNodes: number; byType: Record<string, number>; avgImportance: number } {
    const byType: Record<string, number> = {};
    let totalImportance = 0;

    for (const node of this.nodes.values()) {
      byType[node.type] = (byType[node.type] || 0) + 1;
      totalImportance += node.importance;
    }

    return {
      totalNodes: this.nodes.size,
      byType,
      avgImportance: this.nodes.size > 0 ? totalImportance / this.nodes.size : 0,
    };
  }
}

export const secondBrain = new SecondBrainSync();
