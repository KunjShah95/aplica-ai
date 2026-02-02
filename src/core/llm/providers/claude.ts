import Anthropic from '@anthropic-ai/sdk';
import { LLMProvider, LLMMessage, LLMCompletionResult, LLMCompletionOptions } from '../index';
import { LLMConfig } from '../../../config/types';

export class ClaudeProvider extends LLMProvider {
  private client: Anthropic;

  constructor(config: LLMConfig) {
    super(config);
    this.client = new Anthropic({
      apiKey: config.apiKey
    });
  }

  async complete(messages: LLMMessage[], options?: LLMCompletionOptions): Promise<LLMCompletionResult> {
    const maxTokens = options?.maxTokens ?? this.config.maxTokens;
    const temperature = options?.temperature ?? this.config.temperature;

    const systemPrompt = options?.systemPrompt || this.config.systemPrompt;

    const formattedMessages = messages.map(msg => ({
      role: msg.role as 'user' | 'assistant',
      content: msg.content
    }));

    const response = await this.client.messages.create({
      model: this.config.model,
      max_tokens: maxTokens,
      temperature,
      system: systemPrompt,
      messages: formattedMessages
    });

    const content = response.content
      .filter(block => block.type === 'text')
      .map(block => (block as Anthropic.TextBlock).text)
      .join('');

    return {
      content,
      tokensUsed: response.usage.input_tokens + response.usage.output_tokens,
      model: response.model
    };
  }

  async *stream(messages: LLMMessage[], options?: LLMCompletionOptions): AsyncIterable<string> {
    const maxTokens = options?.maxTokens ?? this.config.maxTokens;
    const temperature = options?.temperature ?? this.config.temperature;

    const systemPrompt = options?.systemPrompt || this.config.systemPrompt;

    const formattedMessages = messages.map(msg => ({
      role: msg.role as 'user' | 'assistant',
      content: msg.content
    }));

    const stream = await this.client.messages.create({
      model: this.config.model,
      max_tokens: maxTokens,
      temperature,
      system: systemPrompt,
      messages: formattedMessages,
      stream: true
    });

    for await (const event of stream) {
      if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
        yield event.delta.text;
      }
    }
  }

  isAvailable(): boolean {
    return !!this.config.apiKey;
  }
}
