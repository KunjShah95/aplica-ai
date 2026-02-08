import { LLMConfig } from '../../config/types.js';
import { ClaudeProvider } from './providers/claude.js';
import { LLMProvider } from './base.js';

export { LLMProvider } from './base.js';
export type { LLMMessage, LLMCompletionResult, LLMCompletionOptions } from './base.js';

export { AnthropicProvider } from './providers/anthropic.js';

export function createProvider(config: LLMConfig): LLMProvider {
  switch (config.provider) {
    case 'claude':
      return new ClaudeProvider(config);
    case 'ollama':
      // return new OllamaProvider(config); // Need import
      throw new Error('Ollama provider dynamic import not yet refactored for ESM. Please use Claude.');
    case 'openai':
      // return new OpenAIProvider(config); // Need import
      throw new Error('OpenAI provider dynamic import not yet refactored for ESM. Please use Claude.');
    default:
      throw new Error(`Unsupported LLM provider: ${config.provider}`);
  }
}
