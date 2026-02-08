import { LLMProvider } from '../index.js';
export class OllamaProvider extends LLMProvider {
    baseUrl;
    defaultModel;
    availableModels = new Set();
    constructor(config) {
        super(config);
        this.baseUrl = process.env.OLLAMA_BASE_URL || 'http://localhost:11434';
        this.defaultModel = config.model || 'llama3';
    }
    async complete(messages, options) {
        const prompt = this.buildPrompt(messages);
        const model = this.config.model || this.defaultModel;
        const maxTokens = options?.maxTokens || this.config.maxTokens || 2048;
        const temperature = options?.temperature || this.config.temperature || 0.7;
        const request = {
            model,
            prompt,
            options: {
                num_predict: maxTokens,
                temperature,
            },
        };
        if (options?.systemPrompt) {
            request.system = options.systemPrompt;
        }
        try {
            const response = await this.callOllama('/api/generate', request);
            const data = response;
            return {
                content: data.response,
                tokensUsed: this.estimateTokens(data.response),
                model: data.model,
            };
        }
        catch (error) {
            console.error('Ollama completion error:', error);
            throw new Error(`Ollama API error: ${error instanceof Error ? error.message : String(error)}`);
        }
    }
    async *stream(messages, options) {
        const prompt = this.buildPrompt(messages);
        const model = this.config.model || this.defaultModel;
        const maxTokens = options?.maxTokens || this.config.maxTokens || 2048;
        const temperature = options?.temperature || this.config.temperature || 0.7;
        const request = {
            model,
            prompt,
            stream: true,
            options: {
                num_predict: maxTokens,
                temperature,
            },
        };
        if (options?.systemPrompt) {
            request.system = options.systemPrompt;
        }
        try {
            const response = await fetch(`${this.baseUrl}/api/generate`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(request),
            });
            if (!response.ok) {
                throw new Error(`Ollama API error: ${response.status}`);
            }
            const reader = response.body?.getReader();
            if (!reader)
                throw new Error('No response body');
            const decoder = new TextDecoder();
            for await (const chunk of this.readStream(reader, decoder)) {
                try {
                    const data = JSON.parse(chunk);
                    yield data.response;
                    if (data.done)
                        break;
                }
                catch {
                }
            }
        }
        catch (error) {
            console.error('Ollama streaming error:', error);
            throw error;
        }
    }
    async *readStream(reader, decoder) {
        let buffer = '';
        while (true) {
            const { done, value } = await reader.read();
            if (done)
                break;
            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n');
            buffer = lines.pop() || '';
            for (const line of lines) {
                if (line.trim())
                    yield line;
            }
        }
        if (buffer.trim())
            yield buffer;
    }
    async isAvailable() {
        try {
            await this.callOllama('/api/tags');
            return true;
        }
        catch {
            return false;
        }
    }
    async getAvailableModels() {
        try {
            const response = await this.callOllama('/api/tags');
            const data = response;
            this.availableModels.clear();
            for (const model of data.models || []) {
                this.availableModels.add(model.name);
            }
            return Array.from(this.availableModels);
        }
        catch {
            return [];
        }
    }
    async pullModel(modelName) {
        try {
            const response = await fetch(`${this.baseUrl}/api/pull`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: modelName }),
            });
            if (!response.ok) {
                throw new Error(`Failed to pull model: ${response.status}`);
            }
            return { success: true, status: 'Model pulled successfully' };
        }
        catch (error) {
            return {
                success: false,
                status: `Failed to pull model: ${error instanceof Error ? error.message : String(error)}`,
            };
        }
    }
    async deleteModel(modelName) {
        try {
            const response = await fetch(`${this.baseUrl}/api/delete`, {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: modelName }),
            });
            if (!response.ok) {
                throw new Error(`Failed to delete model: ${response.status}`);
            }
            this.availableModels.delete(modelName);
            return { success: true, status: 'Model deleted successfully' };
        }
        catch (error) {
            return {
                success: false,
                status: `Failed to delete model: ${error instanceof Error ? error.message : String(error)}`,
            };
        }
    }
    async callOllama(endpoint, body) {
        const response = await fetch(`${this.baseUrl}${endpoint}`, {
            method: body ? 'POST' : 'GET',
            headers: { 'Content-Type': 'application/json' },
            body: body ? JSON.stringify(body) : undefined,
        });
        if (!response.ok) {
            throw new Error(`Ollama API error: ${response.status} ${response.statusText}`);
        }
        return response.json();
    }
    buildPrompt(messages) {
        return messages
            .map((m) => {
            switch (m.role) {
                case 'system':
                    return `### System\n${m.content}`;
                case 'user':
                    return `### User\n${m.content}`;
                case 'assistant':
                    return `### Assistant\n${m.content}`;
                default:
                    return m.content;
            }
        })
            .join('\n\n');
    }
    estimateTokens(text) {
        return Math.ceil(text.length / 4);
    }
    getStats() {
        return {
            baseUrl: this.baseUrl,
            defaultModel: this.defaultModel,
            availableModels: this.availableModels.size,
        };
    }
}
//# sourceMappingURL=ollama.js.map