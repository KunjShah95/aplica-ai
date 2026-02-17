import OpenAI from 'openai';
import { LLMProvider } from '../base.js';
export class GroqProvider extends LLMProvider {
    client;
    constructor(config) {
        super(config);
        this.client = new OpenAI({
            apiKey: config.apiKey,
            baseURL: 'https://api.groq.com/openai/v1',
        });
    }
    async complete(messages, options) {
        const maxTokens = options?.maxTokens ?? this.config.maxTokens;
        const temperature = options?.temperature ?? this.config.temperature;
        const systemPrompt = options?.systemPrompt || this.config.systemPrompt;
        const formattedMessages = this.formatMessages(messages, systemPrompt);
        const response = await this.client.chat.completions.create({
            model: this.config.model,
            messages: formattedMessages,
            max_tokens: maxTokens,
            temperature,
            stream: false,
        });
        const choice = response.choices[0];
        const toolCalls = choice.message.tool_calls;
        return {
            content: choice.message.content || '',
            tokensUsed: response.usage?.total_tokens || 0,
            model: response.model,
            finished: choice.finish_reason === 'stop',
            toolCalls: toolCalls?.map((tc) => ({
                id: tc.id,
                type: 'function',
                function: {
                    name: tc.function.name,
                    arguments: tc.function.arguments,
                },
            })),
        };
    }
    async *stream(messages, options) {
        const maxTokens = options?.maxTokens ?? this.config.maxTokens;
        const temperature = options?.temperature ?? this.config.temperature;
        const systemPrompt = options?.systemPrompt || this.config.systemPrompt;
        const formattedMessages = this.formatMessages(messages, systemPrompt);
        const stream = await this.client.chat.completions.create({
            model: this.config.model,
            messages: formattedMessages,
            max_tokens: maxTokens,
            temperature,
            stream: true,
        });
        for await (const chunk of stream) {
            const content = chunk.choices[0]?.delta?.content;
            if (content) {
                yield content;
            }
        }
    }
    isAvailable() {
        return !!this.config.apiKey;
    }
    formatMessages(messages, systemPrompt) {
        const formatted = [];
        if (systemPrompt) {
            formatted.push({ role: 'system', content: systemPrompt });
        }
        for (const msg of messages) {
            formatted.push({
                role: msg.role,
                content: msg.content,
            });
        }
        return formatted;
    }
}
//# sourceMappingURL=groq.js.map