import { db } from '../db/index.js';
import { DocumentSourceType, DocumentStatus, Prisma } from '@prisma/client';
import { EmbeddingProvider } from './embeddings.js';

export interface CreateKnowledgeBaseInput {
    workspaceId: string;
    name: string;
    description?: string;
    settings?: Record<string, unknown>;
}

export interface AddDocumentInput {
    knowledgeBaseId: string;
    title: string;
    content: string;
    source?: string;
    sourceType: DocumentSourceType;
    metadata?: Record<string, unknown>;
}

export interface KnowledgeSearchResult {
    documentId: string;
    chunkId: string;
    title: string;
    content: string;
    similarity: number;
    metadata: Record<string, unknown>;
}

const CHUNK_SIZE = 1000;
const CHUNK_OVERLAP = 200;

export class KnowledgeBaseService {
    private embeddingProvider?: EmbeddingProvider;

    constructor(embeddingProvider?: EmbeddingProvider) {
        this.embeddingProvider = embeddingProvider;
    }

    setEmbeddingProvider(provider: EmbeddingProvider): void {
        this.embeddingProvider = provider;
    }

    async create(input: CreateKnowledgeBaseInput) {
        return db.knowledgeBase.create({
            data: {
                workspaceId: input.workspaceId,
                name: input.name,
                description: input.description,
                settings: input.settings as Prisma.InputJsonValue || {},
            },
        });
    }

    async list(workspaceId: string) {
        return db.knowledgeBase.findMany({
            where: { workspaceId },
            include: {
                _count: { select: { documents: true } },
            },
            orderBy: { createdAt: 'desc' },
        });
    }

    async addDocument(input: AddDocumentInput) {
        const document = await db.knowledgeDocument.create({
            data: {
                knowledgeBaseId: input.knowledgeBaseId,
                title: input.title,
                content: input.content,
                source: input.source,
                sourceType: input.sourceType,
                metadata: input.metadata as Prisma.InputJsonValue || {},
                status: DocumentStatus.PENDING,
            },
        });

        this.processDocument(document.id).catch((error) => {
            console.error(`Failed to process document ${document.id}:`, error);
        });

        return document;
    }

    private async processDocument(documentId: string): Promise<void> {
        try {
            await db.knowledgeDocument.update({
                where: { id: documentId },
                data: { status: DocumentStatus.PROCESSING },
            });

            const document = await db.knowledgeDocument.findUnique({
                where: { id: documentId },
            });

            if (!document) {
                throw new Error('Document not found');
            }

            const chunks = this.chunkText(document.content);

            for (let i = 0; i < chunks.length; i++) {
                const chunk = chunks[i];
                let embedding: number[] | undefined;

                if (this.embeddingProvider) {
                    try {
                        embedding = await this.embeddingProvider.embed(chunk);
                    } catch (error) {
                        console.error(`Failed to embed chunk ${i}:`, error);
                    }
                }

                if (embedding) {
                    await db.$executeRaw`
            INSERT INTO "DocumentChunk" (id, "documentId", index, content, embedding, metadata, "createdAt")
            VALUES (
              gen_random_uuid(),
              ${documentId},
              ${i},
              ${chunk},
              ${JSON.stringify(embedding)}::vector,
              ${JSON.stringify({})}::jsonb,
              NOW()
            )
          `;
                } else {
                    await db.documentChunk.create({
                        data: {
                            documentId,
                            index: i,
                            content: chunk,
                            metadata: {},
                        },
                    });
                }
            }

            await db.knowledgeDocument.update({
                where: { id: documentId },
                data: { status: DocumentStatus.INDEXED },
            });
        } catch (error) {
            await db.knowledgeDocument.update({
                where: { id: documentId },
                data: {
                    status: DocumentStatus.FAILED,
                    errorMessage: error instanceof Error ? error.message : String(error),
                },
            });
        }
    }

    private chunkText(text: string): string[] {
        const chunks: string[] = [];
        let start = 0;

        while (start < text.length) {
            let end = start + CHUNK_SIZE;

            if (end < text.length) {
                const lastNewline = text.lastIndexOf('\n', end);
                const lastPeriod = text.lastIndexOf('. ', end);
                const lastSpace = text.lastIndexOf(' ', end);

                if (lastNewline > start + CHUNK_SIZE / 2) {
                    end = lastNewline + 1;
                } else if (lastPeriod > start + CHUNK_SIZE / 2) {
                    end = lastPeriod + 2;
                } else if (lastSpace > start + CHUNK_SIZE / 2) {
                    end = lastSpace + 1;
                }
            }

            chunks.push(text.slice(start, end).trim());
            start = Math.max(start + 1, end - CHUNK_OVERLAP);
        }

        return chunks.filter((c) => c.length > 0);
    }

    async search(
        knowledgeBaseId: string,
        query: string,
        limit: number = 5
    ): Promise<KnowledgeSearchResult[]> {
        if (!this.embeddingProvider) {
            const documents = await db.knowledgeDocument.findMany({
                where: {
                    knowledgeBaseId,
                    status: DocumentStatus.INDEXED,
                    OR: [
                        { title: { contains: query, mode: 'insensitive' } },
                        { content: { contains: query, mode: 'insensitive' } },
                    ],
                },
                take: limit,
            });

            return documents.map((doc) => ({
                documentId: doc.id,
                chunkId: doc.id,
                title: doc.title,
                content: doc.content.slice(0, 500),
                similarity: 1,
                metadata: doc.metadata as Record<string, unknown> || {},
            }));
        }

        const queryEmbedding = await this.embeddingProvider.embed(query);

        const results = await db.$queryRaw<any[]>`
      SELECT 
        dc.id as "chunkId",
        dc."documentId",
        dc.content,
        dc.metadata,
        kd.title,
        1 - (dc.embedding <=> ${JSON.stringify(queryEmbedding)}::vector) as similarity
      FROM "DocumentChunk" dc
      JOIN "KnowledgeDocument" kd ON kd.id = dc."documentId"
      WHERE kd."knowledgeBaseId" = ${knowledgeBaseId}
        AND kd.status = 'INDEXED'
        AND dc.embedding IS NOT NULL
      ORDER BY dc.embedding <=> ${JSON.stringify(queryEmbedding)}::vector
      LIMIT ${limit}
    `;

        return results.map((r) => ({
            documentId: r.documentId,
            chunkId: r.chunkId,
            title: r.title,
            content: r.content,
            similarity: r.similarity,
            metadata: r.metadata || {},
        }));
    }

    async searchMultiple(
        knowledgeBaseIds: string[],
        query: string,
        limit: number = 5
    ): Promise<KnowledgeSearchResult[]> {
        if (!this.embeddingProvider || knowledgeBaseIds.length === 0) {
            return [];
        }

        const queryEmbedding = await this.embeddingProvider.embed(query);

        const results = await db.$queryRaw<any[]>`
      SELECT 
        dc.id as "chunkId",
        dc."documentId",
        dc.content,
        dc.metadata,
        kd.title,
        1 - (dc.embedding <=> ${JSON.stringify(queryEmbedding)}::vector) as similarity
      FROM "DocumentChunk" dc
      JOIN "KnowledgeDocument" kd ON kd.id = dc."documentId"
      WHERE kd."knowledgeBaseId" = ANY(${knowledgeBaseIds}::text[])
        AND kd.status = 'INDEXED'
        AND dc.embedding IS NOT NULL
      ORDER BY dc.embedding <=> ${JSON.stringify(queryEmbedding)}::vector
      LIMIT ${limit}
    `;

        return results.map((r) => ({
            documentId: r.documentId,
            chunkId: r.chunkId,
            title: r.title,
            content: r.content,
            similarity: r.similarity,
            metadata: r.metadata || {},
        }));
    }

    async deleteDocument(documentId: string): Promise<void> {
        await db.knowledgeDocument.delete({
            where: { id: documentId },
        });
    }

    async deleteKnowledgeBase(id: string): Promise<void> {
        await db.knowledgeBase.delete({
            where: { id },
        });
    }

    async getStats(knowledgeBaseId: string) {
        const [kb, docCount, chunkCount] = await Promise.all([
            db.knowledgeBase.findUnique({
                where: { id: knowledgeBaseId },
            }),
            db.knowledgeDocument.count({
                where: { knowledgeBaseId },
            }),
            db.documentChunk.count({
                where: { document: { knowledgeBaseId } },
            }),
        ]);

        const statusCounts = await db.knowledgeDocument.groupBy({
            by: ['status'],
            where: { knowledgeBaseId },
            _count: true,
        });

        return {
            knowledgeBase: kb,
            documentCount: docCount,
            chunkCount,
            statusCounts: Object.fromEntries(statusCounts.map((s) => [s.status, s._count])),
        };
    }
}

export const knowledgeBaseService = new KnowledgeBaseService();
