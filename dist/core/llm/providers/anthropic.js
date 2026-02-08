import Anthropic from '@anthropic-ai/sdk';
export class AnthropicProvider {
    client;
    config;
    defaultModel = 'claude-sonnet-4-20250514';
    constructor(config) {
        this.config = {
            apiKey: config.apiKey || process.env.ANTHROPIC_API_KEY || '',
            model: config.model || this.defaultModel,
            maxTokens: config.maxTokens || 4096,
            temperature: config.temperature ?? 0.7,
            topK: config.topK ?? -1,
            stopSequences: config.stopSequences || [],
            ...config,
        };
        this.client = new Anthropic({
            apiKey: this.config.apiKey,
        });
    }
    async complete(messages, options) {
        const startTime = Date.now();
        const effectiveTemperature = options?.temperature ?? this.config.temperature ?? 0.7;
        const effectiveMaxTokens = options?.maxTokens ?? this.config.maxTokens ?? 4096;
        try {
            const systemMessage = messages.find((m) => m.role === 'system');
            const userMessages = messages.filter((m) => m.role !== 'system');
            if (options?.stream && options.onStream) {
                return await this.streamComplete(systemMessage?.content || '', userMessages, effectiveTemperature, effectiveMaxTokens, options.onStream, startTime);
            }
            const response = await this.client.messages.create({
                model: this.config.model,
                max_tokens: effectiveMaxTokens,
                temperature: effectiveTemperature,
                top_k: this.config.topK === -1 ? undefined : this.config.topK,
                stop_sequences: this.config.stopSequences?.length ? this.config.stopSequences : undefined,
                system: systemMessage?.content,
                messages: userMessages.map((m) => ({
                    role: m.role,
                    content: m.content,
                    name: m.name,
                })),
            });
            const latency = Date.now() - startTime;
            const contentBlocks = response.content;
            const textContent = contentBlocks
                .filter((block) => block.type === 'text')
                .map((block) => block.text)
                .join('');
            return {
                content: textContent,
                usage: {
                    promptTokens: response.usage.input_tokens,
                    completionTokens: response.usage.output_tokens,
                    totalTokens: response.usage.input_tokens + response.usage.output_tokens,
                },
                latency,
                model: this.config.model,
                finishReason: response.stop_reason === 'end_turn'
                    ? 'stop'
                    : response.stop_reason === 'max_tokens'
                        ? 'length'
                        : response.stop_reason || 'stop',
            };
        }
        catch (error) {
            throw this.handleError(error);
        }
    }
    async streamComplete(systemPrompt, messages, temperature, maxTokens, onStream, startTime) {
        const stream = await this.client.messages.stream({
            model: this.config.model,
            max_tokens: maxTokens,
            temperature,
            top_k: this.config.topK === -1 ? undefined : this.config.topK,
            stop_sequences: this.config.stopSequences?.length ? this.config.stopSequences : undefined,
            system: systemPrompt,
            messages: messages.map((m) => ({
                role: m.role,
                content: m.content,
                name: m.name,
            })),
        });
        let fullContent = '';
        let hasFinished = false;
        for await (const event of stream) {
            if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
                const content = event.delta.text;
                fullContent += content;
                onStream({
                    content,
                    delta: content,
                    finished: false,
                });
            }
            if (event.type === 'message_stop') {
                hasFinished = true;
                break;
            }
        }
        onStream({
            content: '',
            delta: '',
            finished: true,
        });
        return {
            content: fullContent,
            usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
            latency: Date.now() - startTime,
            model: this.config.model,
            finishReason: hasFinished ? 'stop' : 'length',
        };
    }
    async embed(text) {
        throw new Error('Anthropic does not currently support embeddings API');
    }
    async countTokens(text) {
        return Math.ceil(text.length / 4);
    }
    async getModelInfo() {
        const modelInfo = {
            'claude-sonnet-4-20250514': {
                contextLength: 200000,
                capabilities: ['completion', 'function-calling', 'json-mode', 'vision'],
            },
            'claude-opus-4-20250514': {
                contextLength: 200000,
                capabilities: ['completion', 'function-calling', 'json-mode', 'vision'],
            },
            'claude-haiku-3-20250514': {
                contextLength: 200000,
                capabilities: ['completion', 'function-calling'],
            },
            'claude-3-opus': {
                contextLength: 200000,
                capabilities: ['completion', 'function-calling', 'vision'],
            },
            'claude-3-sonnet': {
                contextLength: 200000,
                capabilities: ['completion', 'function-calling', 'vision'],
            },
            'claude-3-haiku': { contextLength: 200000, capabilities: ['completion'] },
        };
        const info = modelInfo[this.config.model];
        return {
            name: this.config.model,
            contextLength: info?.contextLength || 100000,
            capabilities: info?.capabilities || ['completion'],
        };
    }
    async listModels() {
        try {
            return ['claude-sonnet-4-20250514', 'claude-opus-4-20250514', 'claude-haiku-3-20250514'];
        }
        catch {
            return ['claude-sonnet-4-20250514', 'claude-opus-4-20250514'];
        }
    }
    handleError(error) {
        if (error instanceof Anthropic.APIError) {
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
//# sourceMappingURL=anthropic.js.map