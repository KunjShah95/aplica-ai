import { randomUUID } from 'crypto';
import { db } from '../db/index.js';

export interface DocumentSource {
  type: 'text' | 'url' | 'file' | 'api' | 'database';
  uri: string;
  metadata?: Record<string, unknown>;
}

export interface ChunkConfig {
  chunkSize: number;
  chunkOverlap: number;
  separator?: string;
}

export interface RAGConfig {
  maxChunks: number;
  similarityThreshold: number;
  rerank: boolean;
  hybridSearch: boolean;
}

export interface RetrievedContext {
  content: string;
  source: string;
  sourceType: string;
  score: number;
  metadata: Record<string, unknown>;
}

export interface MultiSourceRAGOptions {
  sources: DocumentSource[];
  query: string;
  userId: string;
  config?: Partial<RAGConfig>;
}

export class AdvancedRAG {
  private embeddingModel: any = null;
  private rerankerModel: any = null;
  private config: RAGConfig;

  constructor(config?: Partial<RAGConfig>) {
    this.config = {
      maxChunks: config?.maxChunks || 10,
      similarityThreshold: config?.similarityThreshold || 0.7,
      rerank: config?.rerank ?? true,
      hybridSearch: config?.hybridSearch ?? true,
    };
  }

  async initialize(): Promise<void> {
    try {
      this.embeddingModel = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2');
      console.log('RAG embedding model loaded');
    } catch (error) {
      console.error('Failed to load embedding model:', error);
    }
  }

  async addDocument(
    knowledgeBaseId: string,
    source: DocumentSource,
    config?: ChunkConfig
  ): Promise<string> {
    const chunkConfig = {
      chunkSize: config?.chunkSize || 512,
      chunkOverlap: config?.chunkOverlap || 50,
      separator: config?.separator || '\n\n',
    };

    let content: string;

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
        title: (source.metadata?.title as string) || 'Untitled',
        content,
        sourceType: source.type.toUpperCase() as any,
        status: 'INDEXED',
        metadata: source.metadata as any,
      },
    });

    const embeddings = await this.generateEmbeddings(chunks);

    await Promise.all(
      embeddings.map(async (embedding, index) => {
        await db.documentChunk.create({
          data: {
            documentId: document.id,
            content: chunks[index],
            index,
          },
        });
      })
    );

    return document.id;
  }

  private chunkText(text: string, config: ChunkConfig): string[] {
    const chunks: string[] = [];
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
        } else {
          currentChunk = paragraph;
        }
      } else {
        currentChunk += (currentChunk ? separator : '') + paragraph;
      }
    }

    if (currentChunk) {
      chunks.push(currentChunk.trim());
    }

    return chunks;
  }

  private splitLongText(text: string, chunkSize: number, overlap: number): string[] {
    const chunks: string[] = [];
    let start = 0;

    while (start < text.length) {
      const end = Math.min(start + chunkSize, text.length);
      chunks.push(text.slice(start, end));
      start = end - overlap;
    }

    return chunks;
  }

  async search(
    knowledgeBaseId: string,
    query: string,
    options?: Partial<RAGConfig>
  ): Promise<RetrievedContext[]> {
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

  async multiSourceSearch(
    options: MultiSourceRAGOptions
  ): Promise<Map<string, RetrievedContext[]>> {
    const results = new Map<string, RetrievedContext[]>();

    for (const source of options.sources) {
      const kbId = source.metadata?.knowledgeBaseId as string;
      if (!kbId) continue;

      const contexts = await this.search(kbId, options.query, {
        ...this.config,
        ...options.config,
      });

      results.set(source.uri, contexts);
    }

    return results;
  }

  async globalSearch(
    userId: string,
    query: string,
    options?: Partial<RAGConfig>
  ): Promise<RetrievedContext[]> {
    const knowledgeBases = await db.knowledgeBase.findMany({
      where: {
        workspace: {
          team: {
            members: { some: { userId } },
          },
        },
      },
    });

    const allResults: RetrievedContext[] = [];

    for (const kb of knowledgeBases) {
      const results = await this.search(kb.id, query, options);
      allResults.push(...results);
    }

    return this.mergeAndDeduplicate(allResults).slice(
      0,
      options?.maxChunks || this.config.maxChunks
    );
  }

  private async vectorSearch(
    knowledgeBaseId: string,
    embedding: number[],
    limit: number
  ): Promise<RetrievedContext[]> {
    const results = await db.$queryRaw<any[]>`
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

    return results.map((r: any) => ({
      content: r.chunk,
      source: r.title,
      sourceType: r.sourceType,
      score: parseFloat(r.score),
      metadata: r.metadata || {},
    }));
  }

  private async keywordSearch(knowledgeBaseId: string, query: string): Promise<RetrievedContext[]> {
    const keywords = query.toLowerCase().split(/\s+/);

    const documents = await db.knowledgeDocument.findMany({
      where: { knowledgeBaseId },
      include: { chunks: true },
    });

    const results: RetrievedContext[] = [];

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
            metadata: (doc.metadata as Record<string, unknown>) || {},
          });
        }
      }
    }

    return results.sort((a, b) => b.score - a.score).slice(0, 10);
  }

  private mergeResults(
    vectorResults: RetrievedContext[],
    keywordResults: RetrievedContext[],
    threshold: number
  ): RetrievedContext[] {
    const merged = new Map<string, RetrievedContext>();

    for (const r of vectorResults) {
      const key = r.content.substring(0, 50);
      merged.set(key, { ...r, score: r.score * 0.7 });
    }

    for (const r of keywordResults) {
      const key = r.content.substring(0, 50);
      const existing = merged.get(key);

      if (existing) {
        existing.score = Math.min(1, existing.score + r.score * 0.3);
      } else if (r.score >= threshold) {
        merged.set(key, { ...r, score: r.score * 0.3 });
      }
    }

    return Array.from(merged.values()).sort((a, b) => b.score - a.score);
  }

  private async rerankResults(
    query: string,
    results: RetrievedContext[]
  ): Promise<RetrievedContext[]> {
    const scored = results.map((r) => ({
      ...r,
      score: r.score * (r.content.toLowerCase().includes(query.toLowerCase()) ? 1.2 : 1),
    }));

    return scored.sort((a, b) => b.score - a.score);
  }

  private mergeAndDeduplicate(results: RetrievedContext[]): RetrievedContext[] {
    const seen = new Map<string, RetrievedContext>();

    for (const r of results) {
      const key = r.content.substring(0, 100);
      const existing = seen.get(key);

      if (existing) {
        existing.score = Math.max(existing.score, r.score);
      } else {
        seen.set(key, r);
      }
    }

    return Array.from(seen.values()).sort((a, b) => b.score - a.score);
  }

  private async generateEmbeddings(chunks: string[]): Promise<number[][]> {
    if (!this.embeddingModel) {
      await this.initialize();
    }

    const embeddings: number[][] = [];

    for (const chunk of chunks) {
      const output = await this.embeddingModel(chunk, {
        pooling: 'mean',
        normalize: true,
      });

      embeddings.push(Array.from(output.data));
    }

    return embeddings;
  }

  private async generateQueryEmbedding(query: string): Promise<number[]> {
    if (!this.embeddingModel) {
      await this.initialize();
    }

    const output = await this.embeddingModel(query, {
      pooling: 'mean',
      normalize: true,
    });

    return Array.from(output.data);
  }

  private async fetchUrl(url: string): Promise<string> {
    const response = await fetch(url);
    const html = await response.text();

    return this.extractTextFromHtml(html);
  }

  private extractTextFromHtml(html: string): string {
    return html
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  private async readFile(filepath: string): Promise<string> {
    const fs = await import('fs/promises');
    return fs.readFile(filepath, 'utf-8');
  }

  async getRelevantContext(
    userId: string,
    query: string,
    options?: Partial<RAGConfig>
  ): Promise<string> {
    const results = await this.globalSearch(userId, query, options);

    if (results.length === 0) {
      return '';
    }

    const context = results.map((r, i) => `[${i + 1}] ${r.source}:\n${r.content}`).join('\n\n');

    return `Relevant context:\n${context}`;
  }
}

async function pipeline(task: string, modelName: string): Promise<any> {
  try {
    const transformers = await import('@xenova/transformers' as any);
    const transformersPipeline = (transformers as any).pipeline;
    return await transformersPipeline(task, modelName);
  } catch (error) {
    console.error(`Failed to load pipeline for task: ${task}, model: ${modelName}`, error);
    throw error;
  }
}

export const advancedRAG = new AdvancedRAG();

