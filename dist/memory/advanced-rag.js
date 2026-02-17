import { db } from '../db/index.js';
export class AdvancedRAG {
    embeddingModel = null;
    rerankerModel = null;
    config;
    constructor(config) {
        this.config = {
            maxChunks: config?.maxChunks || 10,
            similarityThreshold: config?.similarityThreshold || 0.7,
            rerank: config?.rerank ?? true,
            hybridSearch: config?.hybridSearch ?? true,
        };
    }
    async initialize() {
        try {
            this.embeddingModel = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2');
            console.log('RAG embedding model loaded');
        }
        catch (error) {
            console.error('Failed to load embedding model:', error);
        }
    }
    async addDocument(knowledgeBaseId, source, config) {
        const chunkConfig = {
            chunkSize: config?.chunkSize || 512,
            chunkOverlap: config?.chunkOverlap || 50,
            separator: config?.separator || '\n\n',
        };
        let content;
        switch (source.type) {
            case 'text':
                content = source.uri;
                break;
            case 'url':
                content = await this.fetchUrl(source.uri);
                break;
            case 'file':
                content = await this.readFile(source.uri);
                break;
            default:
                throw new Error(`Unsupported source type: ${source.type}`);
        }
        const chunks = this.chunkText(content, chunkConfig);
        const document = await db.knowledgeDocument.create({
            data: {
                knowledgeBaseId,
                title: source.metadata?.title || 'Untitled',
                content,
                sourceType: source.type.toUpperCase(),
                status: 'INDEXED',
                metadata: source.metadata,
            },
        });
        const embeddings = await this.generateEmbeddings(chunks);
        await Promise.all(embeddings.map(async (embedding, index) => {
            await db.documentChunk.create({
                data: {
                    documentId: document.id,
                    content: chunks[index],
                    index,
                },
            });
        }));
        return document.id;
    }
    chunkText(text, config) {
        const chunks = [];
        const { chunkSize, chunkOverlap, separator } = config;
        const paragraphs = text.split(separator || '\n\n');
        let currentChunk = '';
        for (const paragraph of paragraphs) {
            if (currentChunk.length + paragraph.length > chunkSize) {
                if (currentChunk) {
                    chunks.push(currentChunk.trim());
                }
                if (paragraph.length > chunkSize) {
                    const subChunks = this.splitLongText(paragraph, chunkSize, chunkOverlap);
                    chunks.push(...subChunks);
                    currentChunk = '';
                }
                else {
                    currentChunk = paragraph;
                }
            }
            else {
                currentChunk += (currentChunk ? separator : '') + paragraph;
            }
        }
        if (currentChunk) {
            chunks.push(currentChunk.trim());
        }
        return chunks;
    }
    splitLongText(text, chunkSize, overlap) {
        const chunks = [];
        let start = 0;
        while (start < text.length) {
            const end = Math.min(start + chunkSize, text.length);
            chunks.push(text.slice(start, end));
            start = end - overlap;
        }
        return chunks;
    }
    async search(knowledgeBaseId, query, options) {
        const config = { ...this.config, ...options };
        const queryEmbedding = await this.generateQueryEmbedding(query);
        let results = await this.vectorSearch(knowledgeBaseId, queryEmbedding, config.maxChunks);
        if (config.hybridSearch) {
            const keywordResults = await this.keywordSearch(knowledgeBaseId, query);
            results = this.mergeResults(results, keywordResults, config.similarityThreshold);
        }
        if (config.rerank && results.length > 1) {
            results = await this.rerankResults(query, results);
        }
        return results.slice(0, config.maxChunks);
    }
    async multiSourceSearch(options) {
        const results = new Map();
        for (const source of options.sources) {
            const kbId = source.metadata?.knowledgeBaseId;
            if (!kbId)
                continue;
            const contexts = await this.search(kbId, options.query, {
                ...this.config,
                ...options.config,
            });
            results.set(source.uri, contexts);
        }
        return results;
    }
    async globalSearch(userId, query, options) {
        const knowledgeBases = await db.knowledgeBase.findMany({
            where: {
                workspace: {
                    team: {
                        members: { some: { userId } },
                    },
                },
            },
        });
        const allResults = [];
        for (const kb of knowledgeBases) {
            const results = await this.search(kb.id, query, options);
            allResults.push(...results);
        }
        return this.mergeAndDeduplicate(allResults).slice(0, options?.maxChunks || this.config.maxChunks);
    }
    async vectorSearch(knowledgeBaseId, embedding, limit) {
        const results = await db.$queryRaw `
      SELECT 
        d.id as "documentId",
        d.title,
        d.content,
        d."sourceType",
        d.metadata,
        c.content as chunk,
        1 - (c.embedding <=> ${JSON.stringify(embedding)}::vector) as score
      FROM "DocumentChunk" c
      JOIN "KnowledgeDocument" d ON d.id = c."documentId"
      WHERE d."knowledgeBaseId" = ${knowledgeBaseId}
      ORDER BY c.embedding <=> ${JSON.stringify(embedding)}::vector
      LIMIT ${limit}
    `;
        return results.map((r) => ({
            content: r.chunk,
            source: r.title,
            sourceType: r.sourceType,
            score: parseFloat(r.score),
            metadata: r.metadata || {},
        }));
    }
    async keywordSearch(knowledgeBaseId, query) {
        const keywords = query.toLowerCase().split(/\s+/);
        const documents = await db.knowledgeDocument.findMany({
            where: { knowledgeBaseId },
            include: { chunks: true },
        });
        const results = [];
        for (const doc of documents) {
            for (const chunk of doc.chunks) {
                const content = chunk.content.toLowerCase();
                const matches = keywords.filter((k) => content.includes(k)).length;
                if (matches > 0) {
                    results.push({
                        content: chunk.content,
                        source: doc.title,
                        sourceType: doc.sourceType || 'text',
                        score: matches / keywords.length,
                        metadata: doc.metadata || {},
                    });
                }
            }
        }
        return results.sort((a, b) => b.score - a.score).slice(0, 10);
    }
    mergeResults(vectorResults, keywordResults, threshold) {
        const merged = new Map();
        for (const r of vectorResults) {
            const key = r.content.substring(0, 50);
            merged.set(key, { ...r, score: r.score * 0.7 });
        }
        for (const r of keywordResults) {
            const key = r.content.substring(0, 50);
            const existing = merged.get(key);
            if (existing) {
                existing.score = Math.min(1, existing.score + r.score * 0.3);
            }
            else if (r.score >= threshold) {
                merged.set(key, { ...r, score: r.score * 0.3 });
            }
        }
        return Array.from(merged.values()).sort((a, b) => b.score - a.score);
    }
    async rerankResults(query, results) {
        const scored = results.map((r) => ({
            ...r,
            score: r.score * (r.content.toLowerCase().includes(query.toLowerCase()) ? 1.2 : 1),
        }));
        return scored.sort((a, b) => b.score - a.score);
    }
    mergeAndDeduplicate(results) {
        const seen = new Map();
        for (const r of results) {
            const key = r.content.substring(0, 100);
            const existing = seen.get(key);
            if (existing) {
                existing.score = Math.max(existing.score, r.score);
            }
            else {
                seen.set(key, r);
            }
        }
        return Array.from(seen.values()).sort((a, b) => b.score - a.score);
    }
    async generateEmbeddings(chunks) {
        if (!this.embeddingModel) {
            await this.initialize();
        }
        const embeddings = [];
        for (const chunk of chunks) {
            const output = await this.embeddingModel(chunk, {
                pooling: 'mean',
                normalize: true,
            });
            embeddings.push(Array.from(output.data));
        }
        return embeddings;
    }
    async generateQueryEmbedding(query) {
        if (!this.embeddingModel) {
            await this.initialize();
        }
        const output = await this.embeddingModel(query, {
            pooling: 'mean',
            normalize: true,
        });
        return Array.from(output.data);
    }
    async fetchUrl(url) {
        const response = await fetch(url);
        const html = await response.text();
        return this.extractTextFromHtml(html);
    }
    extractTextFromHtml(html) {
        return html
            .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
            .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
            .replace(/<[^>]+>/g, ' ')
            .replace(/\s+/g, ' ')
            .trim();
    }
    async readFile(filepath) {
        const fs = await import('fs/promises');
        return fs.readFile(filepath, 'utf-8');
    }
    async getRelevantContext(userId, query, options) {
        const results = await this.globalSearch(userId, query, options);
        if (results.length === 0) {
            return '';
        }
        const context = results.map((r, i) => `[${i + 1}] ${r.source}:\n${r.content}`).join('\n\n');
        return `Relevant context:\n${context}`;
    }
}
async function pipeline(task, modelName) {
    try {
        const transformers = await import('@xenova/transformers');
        const transformersPipeline = transformers.pipeline;
        return await transformersPipeline(task, modelName);
    }
    catch (error) {
        console.error(`Failed to load pipeline for task: ${task}, model: ${modelName}`, error);
        throw error;
    }
}
export const advancedRAG = new AdvancedRAG();
//# sourceMappingURL=advanced-rag.js.map