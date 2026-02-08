import OpenAI from 'openai';
export class OpenAIProvider {
    client;
    config;
    defaultModel = 'gpt-4-turbo-preview';
    constructor(config) {
        this.config = {
            apiKey: config.apiKey || process.env.OPENAI_API_KEY || '',
            model: config.model || this.defaultModel,
            maxTokens: config.maxTokens || 4096,
            temperature: config.temperature ?? 0.7,
            topP: config.topP ?? 1.0,
            frequencyPenalty: config.frequencyPenalty ?? 0,
            presencePenalty: config.presencePenalty ?? 0,
            stop: config.stop || [],
            stream: config.stream ?? false,
            ...config,
        };
        this.client = new OpenAI({
            apiKey: this.config.apiKey,
        });
    }
    async complete(messages, options) {
        const startTime = Date.now();
        const effectiveTemperature = options?.temperature ?? this.config.temperature ?? 0.7;
        const effectiveMaxTokens = options?.maxTokens ?? this.config.maxTokens ?? 4096;
        try {
            if (options?.stream && options.onStream) {
                return await this.streamComplete(messages, effectiveTemperature, effectiveMaxTokens, options.onStream, startTime);
            }
            const response = await this.client.chat.completions.create({
                model: this.config.model,
                messages: messages.map((m) => {
                    const msg = {
                        role: m.role,
                        content: m.content,
                    };
                    if (m.name) {
                        msg.name = m.name;
                    }
                    return msg;
                }),
                temperature: effectiveTemperature,
                max_tokens: effectiveMaxTokens,
                top_p: this.config.topP,
                frequency_penalty: this.config.frequencyPenalty,
                presence_penalty: this.config.presencePenalty,
                stop: this.config.stop,
            });
            const latency = Date.now() - startTime;
            return {
                content: response.choices[0]?.message?.content || '',
                usage: {
                    promptTokens: response.usage?.prompt_tokens || 0,
                    completionTokens: response.usage?.completion_tokens || 0,
                    totalTokens: response.usage?.total_tokens || 0,
                },
                latency,
                model: this.config.model,
                finishReason: response.choices[0]?.finish_reason || 'stop',
            };
        }
        catch (error) {
            throw this.handleError(error);
        }
    }
    async streamComplete(messages, temperature, maxTokens, onStream, startTime) {
        const stream = await this.client.chat.completions.create({
            model: this.config.model,
            messages: messages.map((m) => {
                const msg = {
                    role: m.role,
                    content: m.content,
                };
                if (m.name) {
                    msg.name = m.name;
                }
                return msg;
            }),
            temperature,
            max_tokens: maxTokens,
            top_p: this.config.topP,
            stream: true,
        });
        let fullContent = '';
        let hasFinished = false;
        for await (const chunk of stream) {
            const content = chunk.choices[0]?.delta?.content || '';
            fullContent += content;
            onStream({
                content,
                delta: content,
                finished: chunk.choices[0]?.finish_reason !== null,
            });
            if (chunk.choices[0]?.finish_reason !== null) {
                hasFinished = true;
                break;
            }
        }
        return {
            content: fullContent,
            usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
            latency: Date.now() - startTime,
            model: this.config.model,
            finishReason: hasFinished ? 'stop' : 'length',
        };
    }
    async embed(text) {
        try {
            const response = await this.client.embeddings.create({
                model: 'text-embedding-3-small',
                input: Array.isArray(text) ? text : [text],
            });
            return response.data.map((item) => item.embedding);
        }
        catch (error) {
            throw this.handleError(error);
        }
    }
    async countTokens(text) {
        try {
            const response = await this.client.chat.completions.create({
                model: this.config.model,
                messages: [{ role: 'user', content: text }],
                max_tokens: 0,
            });
            return response.usage?.prompt_tokens || 0;
        }
        catch {
            return Math.ceil(text.length / 4);
        }
    }
    async getModelInfo() {
        const modelInfo = {
            'gpt-4-turbo-preview': {
                contextLength: 128000,
                capabilities: ['completion', 'function-calling', 'json-mode', 'vision'],
            },
            'gpt-4': {
                contextLength: 8192,
                capabilities: ['completion', 'function-calling', 'json-mode'],
            },
            'gpt-4o': {
                contextLength: 128000,
                capabilities: ['completion', 'function-calling', 'json-mode', 'vision', 'audio'],
            },
            'gpt-3.5-turbo': {
                contextLength: 16385,
                capabilities: ['completion', 'function-calling', 'json-mode'],
            },
        };
        const info = modelInfo[this.config.model];
        return {
            name: this.config.model,
            contextLength: info?.contextLength || 4096,
            capabilities: info?.capabilities || ['completion'],
        };
    }
    async listModels() {
        try {
            const response = await this.client.models.list();
            return response.data.filter((m) => m.id.startsWith('gpt')).map((m) => m.id);
        }
        catch {
            return ['gpt-4-turbo-preview', 'gpt-4', 'gpt-4o', 'gpt-3.5-turbo'];
        }
    }
    handleError(error) {
        if (error instanceof OpenAI.APIError) {
            if (error.status === 401) {
                return new Error('Invalid API key');
            }
            if (error.status === 429) {
                return new Error('Rate limit exceeded');
            }
            if (error.status === 400) {
                return new Error(`Bad request: ${error.message}`);
            }
        }
        return error;
    }
}
//# sourceMappingURL=openai.js.map