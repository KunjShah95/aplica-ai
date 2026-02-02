import { LLMConfig } from '../../config/types';
import { ClaudeProvider } from './providers/claude.js';

export interface LLMMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface LLMCompletionOptions {
  maxTokens?: number;
  temperature?: number;
  systemPrompt?: string;
}

export interface LLMCompletionResult {
  content: string;
  tokensUsed: number;
  model: string;
}

export abstract class LLMProvider {
  protected config: LLMConfig;

  constructor(config: LLMConfig) {
    this.config = config;
  }

  abstract complete(
    messages: LLMMessage[],
    options?: LLMCompletionOptions
  ): Promise<LLMCompletionResult>;
  abstract stream(messages: LLMMessage[], options?: LLMCompletionOptions): AsyncIterable<string>;
  abstract isAvailable(): boolean | Promise<boolean>;
}

export function createProvider(config: LLMConfig): LLMProvider {
  switch (config.provider) {
    case 'claude':
      return new ClaudeProvider(config);
    case 'ollama':
      import('./providers/ollama.js').then(({ OllamaProvider }) => new OllamaProvider(config));
    default:
      throw new Error(`Unsupported LLM provider: ${config.provider}`);
  }
}
