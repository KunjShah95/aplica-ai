import { EmbeddingProvider } from './postgres.js';
export type { EmbeddingProvider };
export declare class OpenAIEmbeddings implements EmbeddingProvider {
    private client;
    private model;
    constructor(apiKey?: string, model?: string);
    embed(text: string): Promise<number[]>;
    embedBatch(texts: string[]): Promise<number[][]>;
}
export declare class OllamaEmbeddings implements EmbeddingProvider {
    private baseUrl;
    private model;
    constructor(baseUrl?: string, model?: string);
    embed(text: string): Promise<number[]>;
    embedBatch(texts: string[]): Promise<number[][]>;
}
export declare function createEmbeddingProvider(type?: 'openai' | 'ollama'): EmbeddingProvider;
//# sourceMappingURL=embeddings.d.ts.map