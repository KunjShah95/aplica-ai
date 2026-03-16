import { db } from '../db/index.js';
import { randomUUID } from 'crypto';

export interface MemoryQuery {
  query: string;
  userId: string;
  conversationId?: string;
  limit?: number;
  minSimilarity?: number;
}

export interface RetrievedMemory {
  id: string;
  content: string;
  importance: number;
  source: 'retrieve' | 'extract';
  similarity?: number;
  metadata: Record<string, unknown>;
}

export interface ExtractionResult {
  facts: ExtractedFact[];
  entities: ExtractedEntity[];
  patterns: string[];
}

export interface ExtractedFact {
  statement: string;
  confidence: number;
  category: 'preference' | 'fact' | 'context' | 'relationship';
}

export interface ExtractedEntity {
  name: string;
  type: string;
  mentions: number;
  attributes: Record<string, unknown>;
}

export class HybridMemoryLoop {
  private retrieveThreshold: number = 0.7;
  private extractEnabled: boolean = true;
  private extractionConfidenceThreshold: number = 0.8;

  async retrieve(options: MemoryQuery): Promise<RetrievedMemory[]> {
    const memories = await db.memory.findMany({
      where: {
        userId: options.userId,
        OR: [{ type: 'FACT' }, { type: 'PREFERENCE' }, { type: 'CONTEXT' }, { type: 'ENTITY' }],
      },
      orderBy: { importance: 'desc' },
      take: options.limit || 10,
    });

    const results: RetrievedMemory[] = [];

    for (const memory of memories) {
      const similarity = this.calculateRelevance(memory.content, options.query);

      if (similarity >= this.retrieveThreshold || memory.importance > 0.8) {
        results.push({
          id: memory.id,
          content: memory.content,
          importance: memory.importance,
          source: 'retrieve',
          similarity,
          metadata: memory.metadata as Record<string, unknown>,
        });
      }
    }

    return results.sort((a, b) => (b.similarity || 0) - (a.similarity || 0));
  }

  async extract(userId: string, content: string): Promise<ExtractionResult> {
    const facts: ExtractedFact[] = [];
    const entities: ExtractedEntity[] = [];
    const patterns: string[] = [];

    const preferencePatterns = [
      /I (like|prefer|love|hate|dislike) (.+)/i,
      /my favorite (.+) is (.+)/i,
      /I always (.+)/i,
      /I never (.+)/i,
      /don't (.+) please/i,
      /please (.+)/i,
    ];

    for (const pattern of preferencePatterns) {
      const matches = content.matchAll(new RegExp(pattern.source, pattern.flags));
      for (const match of matches) {
        if (match[1]) {
          facts.push({
            statement: match[0],
            confidence: 0.85,
            category: 'preference',
          });
        }
      }
    }

    const entityPattern = /([A-Z][a-z]+(?:\s[A-Z][a-z]+)*)/g;
    const entityCounts = new Map<string, number>();

    let match;
    while ((match = entityPattern.exec(content)) !== null) {
      const entity = match[1];
      entityCounts.set(entity, (entityCounts.get(entity) || 0) + 1);
    }

    for (const [name, mentions] of entityCounts) {
      if (mentions >= 2) {
        entities.push({
          name,
          type: 'mention',
          mentions,
          attributes: {},
        });
      }
    }

    const timePattern = /\b(\d{1,2}:\d{2}|\d{1,2}\s*(am|pm))\b/gi;
    const timeMatches = content.match(timePattern);
    if (timeMatches) {
      patterns.push(`Time references: ${timeMatches.join(', ')}`);
    }

    const datePattern =
      /\b(\d{1,2}\/\d{1,2}\/\d{2,4}|january|february|march|april|may|june|july|august|september|october|november|december)\b/gi;
    const dateMatches = content.match(datePattern);
    if (dateMatches) {
      patterns.push(`Date references: ${dateMatches.join(', ')}`);
    }

    return { facts, entities, patterns };
  }

  async storeExtracted(userId: string, extraction: ExtractionResult): Promise<void> {
    for (const fact of extraction.facts) {
      if (fact.confidence >= this.extractionConfidenceThreshold) {
        await db.memory.create({
          data: {
            id: randomUUID(),
            userId,
            type: fact.category === 'preference' ? 'PREFERENCE' : 'FACT',
            content: fact.statement,
            importance: fact.confidence,
            metadata: {
              category: fact.category,
              extracted: true,
              confidence: fact.confidence,
            },
          },
        });
      }
    }

    for (const entity of extraction.entities) {
      if (entity.mentions >= 3) {
        await db.memory.create({
          data: {
            id: randomUUID(),
            userId,
            type: 'ENTITY',
            content: `${entity.name} (${entity.type})`,
            importance: Math.min(1, entity.mentions / 10),
            metadata: {
              mentions: entity.mentions,
              extracted: true,
            },
          },
        });
      }
    }
  }

  async processMessage(
    userId: string,
    message: string,
    conversationId?: string
  ): Promise<{
    retrieved: RetrievedMemory[];
    extraction: ExtractionResult | null;
  }> {
    const retrieved = await this.retrieve({
      query: message,
      userId,
      conversationId,
    });

    let extraction: ExtractionResult | null = null;

    if (this.extractEnabled && message.length > 100) {
      extraction = await this.extract(userId, message);
      await this.storeExtracted(userId, extraction);
    }

    return { retrieved, extraction };
  }

  private calculateRelevance(memoryContent: string, query: string): number {
    const memoryWords = new Set(memoryContent.toLowerCase().split(/\s+/));
    const queryWords = new Set(query.toLowerCase().split(/\s+/));

    let matchCount = 0;
    for (const word of queryWords) {
      if (word.length > 2 && memoryWords.has(word)) {
        matchCount++;
      }
    }

    return queryWords.size > 0 ? matchCount / queryWords.size : 0;
  }

  async summarizeConversation(
    userId: string,
    conversationId: string,
    messages: string[]
  ): Promise<string> {
    const conversationText = messages.join('\n');
    const extraction = await this.extract(userId, conversationText);

    const summaryParts: string[] = [];

    if (extraction.facts.length > 0) {
      summaryParts.push(
        `Key facts: ${extraction.facts
          .slice(0, 3)
          .map((f) => f.statement)
          .join('; ')}`
      );
    }

    if (extraction.entities.length > 0) {
      summaryParts.push(`Entities: ${extraction.entities.map((e) => e.name).join(', ')}`);
    }

    if (extraction.patterns.length > 0) {
      summaryParts.push(extraction.patterns.join('; '));
    }

    const summary = summaryParts.join('\n') || 'No significant patterns found';

    await db.memory.create({
      data: {
        id: randomUUID(),
        userId,
        type: 'CONVERSATION_SUMMARY',
        content: summary,
        importance: 0.6,
        metadata: {
          conversationId,
          messageCount: messages.length,
          summarized: true,
        },
      },
    });

    return summary;
  }
}

export const hybridMemoryLoop = new HybridMemoryLoop();

export class MemoryAgent {
  private memoryLoop: HybridMemoryLoop;
  private contextWindow: string[] = [];
  private maxContextLength: number = 5;

  constructor(memoryLoop?: HybridMemoryLoop) {
    this.memoryLoop = memoryLoop || hybridMemoryLoop;
  }

  async think(
    userId: string,
    message: string
  ): Promise<{
    context: string;
    shouldExtract: boolean;
    keyMemories: RetrievedMemory[];
  }> {
    const { retrieved, extraction } = await this.memoryLoop.processMessage(userId, message);

    this.contextWindow.push(message);
    if (this.contextWindow.length > this.maxContextLength) {
      this.contextWindow.shift();
    }

    const context = retrieved.map((m) => `[${m.source}] ${m.content}`).join('\n');

    const shouldExtract = extraction !== null && extraction.facts.length > 0;

    return {
      context,
      shouldExtract,
      keyMemories: retrieved.slice(0, 3),
    };
  }

  async remember(userId: string, query: string): Promise<RetrievedMemory[]> {
    return this.memoryLoop.retrieve({
      query,
      userId,
    });
  }
}

export const memoryAgent = new MemoryAgent();
