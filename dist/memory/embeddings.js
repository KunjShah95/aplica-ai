import OpenAI from 'openai';
const EMBEDDING_MODEL = process.env.EMBEDDING_MODEL || 'text-embedding-3-small';
const EMBEDDING_DIMENSIONS = 1536;
export class OpenAIEmbeddings {
    client;
    model;
    constructor(apiKey, model) {
        this.client = new OpenAI({
            apiKey: apiKey || process.env.OPENAI_API_KEY,
        });
        this.model = model || EMBEDDING_MODEL;
    }
    async embed(text) {
        const response = await this.client.embeddings.create({
            model: this.model,
            input: text,
            dimensions: EMBEDDING_DIMENSIONS,
        });
        return response.data[0].embedding;
    }
    async embedBatch(texts) {
        const response = await this.client.embeddings.create({
            model: this.model,
            input: texts,
            dimensions: EMBEDDING_DIMENSIONS,
        });
        return response.data.map((d) => d.embedding);
    }
}
export class OllamaEmbeddings {
    baseUrl;
    model;
    constructor(baseUrl, model) {
        this.baseUrl = baseUrl || process.env.OLLAMA_BASE_URL || 'http://localhost:11434';
        this.model = model || 'nomic-embed-text';
    }
    async embed(text) {
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
        const data = await response.json();
        return data.embedding;
    }
    async embedBatch(texts) {
        const embeddings = [];
        for (const text of texts) {
            const embedding = await this.embed(text);
            embeddings.push(embedding);
        }
        return embeddings;
    }
}
export function createEmbeddingProvider(type = 'openai') {
    switch (type) {
        case 'openai':
            return new OpenAIEmbeddings();
        case 'ollama':
            return new OllamaEmbeddings();
        default:
            return new OpenAIEmbeddings();
    }
}
//# sourceMappingURL=embeddings.js.map