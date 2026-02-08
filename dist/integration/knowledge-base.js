import { db } from '../db/index.js';
import OpenAI from 'openai';
const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY || process.env.LLM_API_KEY,
});
export class KnowledgeBaseService {
    defaultChunkSize = 1000;
    defaultChunkOverlap = 200;
    async create(input) {
        const knowledgeBase = await db.knowledgeBase.create({
            data: {
                workspaceId: input.workspaceId || '',
                name: input.name,
                description: input.description,
                settings: input.settings || {},
            },
        });
        return knowledgeBase;
    }
    async getById(id) {
        return db.knowledgeBase.findUnique({
            where: { id },
            include: {
                documents: {
                    select: {
                        id: true,
                        title: true,
                        source: true,
                        sourceType: true,
                        status: true,
                        createdAt: true,
                        _count: {
                            select: { chunks: true },
                        },
                    },
                    orderBy: { createdAt: 'desc' },
                },
            },
        });
    }
    async listByUser(userId, workspaceId) {
        return db.knowledgeBase.findMany({
            where: {
                ...(workspaceId && { workspaceId }),
            },
            include: {
                _count: {
                    select: { documents: true },
                },
            },
            orderBy: { createdAt: 'desc' },
        });
    }
    async delete(id) {
        const result = await db.knowledgeBase.delete({
            where: { id },
        });
        return !!result;
    }
    async addDocument(input) {
        const knowledgeBase = await this.getById(input.knowledgeBaseId);
        if (!knowledgeBase) {
            throw new Error('Knowledge base not found');
        }
        const settings = knowledgeBase.settings || {};
        const chunkSize = settings.chunkSize || this.defaultChunkSize;
        const chunkOverlap = settings.chunkOverlap || this.defaultChunkOverlap;
        const document = await db.knowledgeDocument.create({
            data: {
                knowledgeBaseId: input.knowledgeBaseId,
                title: input.title,
                content: input.content,
                source: input.source,
                sourceType: input.sourceType || 'TEXT',
                metadata: (input.metadata || {}),
                status: 'PENDING',
            },
        });
        const chunks = this.chunkContent(input.content, chunkSize, chunkOverlap);
        const chunkRecords = await Promise.all(chunks.map(async (chunk, index) => {
            let embedding;
            try {
                const embeddingResult = await openai.embeddings.create({
                    model: 'text-embedding-3-small',
                    input: chunk,
                });
                embedding = embeddingResult.data[0].embedding;
            }
            catch (error) {
                console.error('Failed to generate embedding for chunk:', error);
            }
            return db.documentChunk.create({
                data: {
                    documentId: document.id,
                    index,
                    content: chunk,
                    metadata: {
                        chunkIndex: index,
                        totalChunks: chunks.length,
                        ...(input.metadata || {}),
                    },
                },
            });
        }));
        await db.knowledgeDocument.update({
            where: { id: document.id },
            data: { status: 'INDEXED' },
        });
        return {
            ...document,
            chunks: chunkRecords.length,
        };
    }
    async getDocument(documentId) {
        return db.knowledgeDocument.findUnique({
            where: { id: documentId },
            include: {
                chunks: {
                    orderBy: { index: 'asc' },
                },
            },
        });
    }
    async deleteDocument(documentId) {
        const result = await db.knowledgeDocument.delete({
            where: { id: documentId },
        });
        return !!result;
    }
    async query(input) {
        let queryEmbedding;
        try {
            const embeddingResult = await openai.embeddings.create({
                model: 'text-embedding-3-small',
                input: input.query,
            });
            queryEmbedding = embeddingResult.data[0].embedding;
        }
        catch (error) {
            console.error('Failed to generate query embedding:', error);
            throw new Error('Failed to generate query embedding');
        }
        if (!queryEmbedding) {
            throw new Error('Failed to generate query embedding');
        }
        const embeddingStr = `[${queryEmbedding.join(',')}]`;
        let query = `
      SELECT
        dc.id,
        dc.content,
        dc.metadata,
        dc.document_id,
        kd.title as document_title,
        1 - (dc.embedding <=> $1::vector) as similarity
      FROM "DocumentChunk" dc
      JOIN "KnowledgeDocument" kd ON kd.id = dc.document_id
      JOIN "KnowledgeBase" kb ON kb.id = kd.knowledge_base_id
      WHERE kb.user_id = $2
    `;
        const params = [embeddingStr, input.userId];
        if (input.knowledgeBaseId) {
            query += ` AND kb.id = $3`;
            params.push(input.knowledgeBaseId);
        }
        query += `
      AND dc.embedding IS NOT NULL
      AND kd.status = 'INDEXED'
      ORDER BY dc.embedding <=> $1::vector
      LIMIT $4
    `;
        params.push(input.maxResults || 10);
        const chunks = await db.$queryRawUnsafe(query, ...params);
        const filteredChunks = chunks.filter((c) => (c.similarity || 0) >= (input.minSimilarity || 0.5));
        const context = filteredChunks
            .map((c) => `[Source: ${c.document_title}]\n${c.content}`)
            .join('\n\n---\n\n');
        const systemPrompt = `You are a helpful assistant answering questions based on the provided knowledge base documents. Use the context below to answer the user's question. If you cannot find the answer in the context, say so clearly.

Context:
${context}`;
        try {
            const completion = await openai.chat.completions.create({
                model: 'gpt-4-turbo-preview',
                messages: [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: input.query },
                ],
                max_tokens: 2000,
                temperature: 0.3,
            });
            return {
                answer: completion.choices[0]?.message?.content || 'No answer generated',
                sources: filteredChunks.map((c) => ({
                    documentId: c.document_id,
                    documentTitle: c.document_title,
                    chunkContent: c.content,
                    similarity: c.similarity || 0,
                })),
            };
        }
        catch (error) {
            console.error('Failed to generate answer:', error);
            throw error;
        }
    }
    chunkContent(content, chunkSize, chunkOverlap) {
        const chunks = [];
        let startIndex = 0;
        while (startIndex < content.length) {
            const endIndex = Math.min(startIndex + chunkSize, content.length);
            let chunk = content.slice(startIndex, endIndex);
            if (endIndex < content.length) {
                const lastNewline = chunk.lastIndexOf('\n');
                const lastPeriod = chunk.lastIndexOf('. ');
                const splitPoint = lastNewline > lastPeriod ? lastNewline : lastPeriod;
                if (splitPoint > chunkSize * 0.5) {
                    chunk = chunk.slice(0, splitPoint);
                }
            }
            chunks.push(chunk.trim());
            startIndex += chunk.length - chunkOverlap;
            if (startIndex >= content.length)
                break;
        }
        return chunks;
    }
    async getStats(knowledgeBaseId) {
        const documents = await db.knowledgeDocument.findMany({
            where: { knowledgeBaseId },
            include: {
                _count: { select: { chunks: true } },
            },
        });
        const statusCounts = {};
        let chunkCount = 0;
        let indexedChunks = 0;
        for (const doc of documents) {
            statusCounts[doc.status] = (statusCounts[doc.status] || 0) + 1;
            chunkCount += doc._count.chunks;
            if (doc.status === 'INDEXED') {
                indexedChunks += doc._count.chunks;
            }
        }
        return {
            documentCount: documents.length,
            chunkCount,
            indexedChunks,
            statusCounts,
        };
    }
}
export const knowledgeBaseService = new KnowledgeBaseService();
//# sourceMappingURL=knowledge-base.js.map