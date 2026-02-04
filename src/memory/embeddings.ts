import OpenAI from 'openai';
import { EmbeddingProvider } from './postgres.js';
export type { EmbeddingProvider };

const EMBEDDING_MODEL = process.env.EMBEDDING_MODEL || 'text-embedding-3-small';
const EMBEDDING_DIMENSIONS = 1536;

export class OpenAIEmbeddings implements EmbeddingProvider {
    private client: any;
    private model: string;

    constructor(apiKey?: string, model?: string) {
        this.client = new OpenAI({
            apiKey: apiKey || process.env.OPENAI_API_KEY,
        });
        this.model = model || EMBEDDING_MODEL;
    }

    async embed(text: string): Promise<number[]> {
        const response = await this.client.embeddings.create({
            model: this.model,
            input: text,
            dimensions: EMBEDDING_DIMENSIONS,
        });

        return response.data[0].embedding;
    }

    async embedBatch(texts: string[]): Promise<number[][]> {
        const response = await this.client.embeddings.create({
            model: this.model,
            input: texts,
            dimensions: EMBEDDING_DIMENSIONS,
        });

        return response.data.map((d: any) => d.embedding);
    }
}

export class OllamaEmbeddings implements EmbeddingProvider {
    private baseUrl: string;
    private model: string;

    constructor(baseUrl?: string, model?: string) {
        this.baseUrl = baseUrl || process.env.OLLAMA_BASE_URL || 'http://localhost:11434';
        this.model = model || 'nomic-embed-text';
    }

    async embed(text: string): Promise<number[]> {
        const response = await fetch(`${this.baseUrl}/api/embeddings`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                model: this.model,
                prompt: text,
            }),
        });

        if (!response.ok) {
            throw new Error(`Ollama embedding failed: ${response.statusText}`);
        }

        const data = await response.json() as { embedding: number[] };
        return data.embedding;
    }

    async embedBatch(texts: string[]): Promise<number[][]> {
        const embeddings: number[][] = [];
        for (const text of texts) {
            const embedding = await this.embed(text);
            embeddings.push(embedding);
        }
        return embeddings;
    }
}

export function createEmbeddingProvider(type: 'openai' | 'ollama' = 'openai'): EmbeddingProvider {
    switch (type) {
        case 'openai':
            return new OpenAIEmbeddings();
        case 'ollama':
            return new OllamaEmbeddings();
        default:
            return new OpenAIEmbeddings();
    }
}
