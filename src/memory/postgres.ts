import { db } from '../db/index.js';
import { MemoryType, Prisma } from '@prisma/client';

export interface EmbeddingProvider {
  embed(text: string): Promise<number[]>;
  embedBatch(texts: string[]): Promise<number[][]>;
}

export interface MemoryInput {
  userId: string;
  type: MemoryType;
  content: string;
  metadata?: Record<string, unknown>;
  tags?: string[];
  importance?: number;
  expiresAt?: Date;
}

export interface MemorySearchOptions {
  userId: string;
  query?: string;
  embedding?: number[];
  type?: MemoryType;
  tags?: string[];
  limit?: number;
  minSimilarity?: number;
}

export interface MemoryResult {
  id: string;
  type: MemoryType;
  content: string;
  metadata: Record<string, unknown>;
  tags: string[];
  importance: number;
  similarity?: number;
  createdAt: Date;
}

export class PostgresMemory {
  private embeddingProvider?: EmbeddingProvider;

  constructor(embeddingProvider?: EmbeddingProvider) {
    this.embeddingProvider = embeddingProvider;
  }

  setEmbeddingProvider(provider: EmbeddingProvider): void {
    this.embeddingProvider = provider;
  }

  async add(input: MemoryInput): Promise<MemoryResult> {
    let embeddingData: Prisma.InputJsonValue | undefined;

    if (this.embeddingProvider) {
      try {
        const embedding = await this.embeddingProvider.embed(input.content);
        embeddingData = embedding as unknown as Prisma.InputJsonValue;
      } catch (error) {
        console.error('Failed to generate embedding:', error);
      }
    }

    const memory = await db.$queryRaw<any[]>`
      INSERT INTO "Memory" (
        id, "userId", type, content, metadata, tags, importance, "expiresAt", "createdAt", "updatedAt"
        ${embeddingData ? Prisma.sql`, embedding` : Prisma.empty}
      )
      VALUES (
        gen_random_uuid(),
        ${input.userId},
        ${input.type}::"MemoryType",
        ${input.content},
        ${JSON.stringify(input.metadata || {})}::jsonb,
        ${input.tags || []}::text[],
        ${input.importance ?? 0.5},
        ${input.expiresAt || null},
        NOW(),
        NOW()
        ${embeddingData ? Prisma.sql`, ${JSON.stringify(embeddingData)}::vector` : Prisma.empty}
      )
      RETURNING id, type, content, metadata, tags, importance, "createdAt"
    `;

    const result = memory[0];
    return {
      id: result.id,
      type: result.type,
      content: result.content,
      metadata: result.metadata || {},
      tags: result.tags || [],
      importance: result.importance,
      createdAt: result.createdAt,
    };
  }

  async search(options: MemorySearchOptions): Promise<MemoryResult[]> {
    const { userId, query, embedding, type, tags, limit = 10, minSimilarity = 0.5 } = options;

    let queryEmbedding = embedding;

    if (query && !queryEmbedding && this.embeddingProvider) {
      try {
        queryEmbedding = await this.embeddingProvider.embed(query);
      } catch (error) {
        console.error('Failed to generate query embedding:', error);
      }
    }

    if (queryEmbedding) {
      const results = await db.$queryRaw<any[]>`
        SELECT 
          id, type, content, metadata, tags, importance, "createdAt",
          1 - (embedding <=> ${JSON.stringify(queryEmbedding)}::vector) as similarity
        FROM "Memory"
        WHERE "userId" = ${userId}
          AND embedding IS NOT NULL
          ${type ? Prisma.sql`AND type = ${type}::"MemoryType"` : Prisma.empty}
          ${tags?.length ? Prisma.sql`AND tags && ${tags}::text[]` : Prisma.empty}
          AND ("expiresAt" IS NULL OR "expiresAt" > NOW())
        ORDER BY embedding <=> ${JSON.stringify(queryEmbedding)}::vector
        LIMIT ${limit}
      `;

      return results
        .filter((r) => r.similarity >= minSimilarity)
        .map((r) => ({
          id: r.id,
          type: r.type,
          content: r.content,
          metadata: r.metadata || {},
          tags: r.tags || [],
          importance: r.importance,
          similarity: r.similarity,
          createdAt: r.createdAt,
        }));
    }

    if (query) {
      const memories = await db.memory.findMany({
        where: {
          userId,
          type,
          ...(tags?.length && { tags: { hasSome: tags } }),
          OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
          content: { contains: query, mode: 'insensitive' },
        },
        orderBy: [{ importance: 'desc' }, { createdAt: 'desc' }],
        take: limit,
      });

      return memories.map((m) => ({
        id: m.id,
        type: m.type,
        content: m.content,
        metadata: (m.metadata as Record<string, unknown>) || {},
        tags: m.tags,
        importance: m.importance,
        createdAt: m.createdAt,
      }));
    }

    const memories = await db.memory.findMany({
      where: {
        userId,
        type,
        ...(tags?.length && { tags: { hasSome: tags } }),
        OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
      },
      orderBy: [{ importance: 'desc' }, { createdAt: 'desc' }],
      take: limit,
    });

    return memories.map((m) => ({
      id: m.id,
      type: m.type,
      content: m.content,
      metadata: (m.metadata as Record<string, unknown>) || {},
      tags: m.tags,
      importance: m.importance,
      createdAt: m.createdAt,
    }));
  }

  async get(id: string): Promise<MemoryResult | null> {
    const memory = await db.memory.findUnique({
      where: { id },
    });

    if (!memory) return null;

    return {
      id: memory.id,
      type: memory.type,
      content: memory.content,
      metadata: (memory.metadata as Record<string, unknown>) || {},
      tags: memory.tags,
      importance: memory.importance,
      createdAt: memory.createdAt,
    };
  }

  async update(
    id: string,
    data: Partial<{
      content: string;
      metadata: Record<string, unknown>;
      tags: string[];
      importance: number;
    }>
  ): Promise<MemoryResult | null> {
    const memory = await db.memory.update({
      where: { id },
      data: {
        ...data,
        metadata: data.metadata ? (data.metadata as Prisma.InputJsonValue) : undefined,
      },
    });

    return {
      id: memory.id,
      type: memory.type,
      content: memory.content,
      metadata: (memory.metadata as Record<string, unknown>) || {},
      tags: memory.tags,
      importance: memory.importance,
      createdAt: memory.createdAt,
    };
  }

  async delete(id: string): Promise<boolean> {
    try {
      await db.memory.delete({ where: { id } });
      return true;
    } catch {
      return false;
    }
  }

  async deleteByUser(userId: string): Promise<number> {
    const result = await db.memory.deleteMany({
      where: { userId },
    });
    return result.count;
  }

  async clear(): Promise<void> {
    await db.memory.deleteMany({});
  }

  async recordAccess(id: string): Promise<void> {
    await db.memory.update({
      where: { id },
      data: {
        accessCount: { increment: 1 },
        lastAccessedAt: new Date(),
      },
    });
  }

  async decay(userId: string, decayFactor: number = 0.95): Promise<void> {
    await db.$executeRaw`
      UPDATE "Memory"
      SET importance = importance * ${decayFactor}
      WHERE "userId" = ${userId}
        AND "lastAccessedAt" < NOW() - INTERVAL '7 days'
    `;
  }

  async prune(userId: string, minImportance: number = 0.1): Promise<number> {
    const result = await db.memory.deleteMany({
      where: {
        userId,
        importance: { lt: minImportance },
        OR: [
          { expiresAt: { lt: new Date() } },
          {
            lastAccessedAt: { lt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
          },
        ],
      },
    });
    return result.count;
  }

  async getStats(userId: string): Promise<{
    total: number;
    byType: Record<string, number>;
    avgImportance: number;
  }> {
    const [total, byType, avgResult] = await Promise.all([
      db.memory.count({ where: { userId } }),
      db.memory.groupBy({
        by: ['type'],
        where: { userId },
        _count: true,
      }),
      db.memory.aggregate({
        where: { userId },
        _avg: { importance: true },
      }),
    ]);

    const typeMap: Record<string, number> = {};
    for (const item of byType) {
      typeMap[item.type] = item._count;
    }

    return {
      total,
      byType: typeMap,
      avgImportance: avgResult._avg.importance || 0,
    };
  }
}

export const postgresMemory = new PostgresMemory();
