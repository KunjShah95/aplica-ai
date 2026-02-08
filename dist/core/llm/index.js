import { ClaudeProvider } from './providers/claude.js';
export { LLMProvider } from './base.js';
export { AnthropicProvider } from './providers/anthropic.js';
export function createProvider(config) {
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
//# sourceMappingURL=index.js.map