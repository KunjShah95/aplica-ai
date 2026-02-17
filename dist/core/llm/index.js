import { ClaudeProvider } from './providers/claude.js';
import { GroqProvider } from './providers/groq.js';
import { CustomProvider } from './providers/custom.js';
export { LLMProvider } from './base.js';
export { AnthropicProvider } from './providers/anthropic.js';
export { GroqProvider } from './providers/groq.js';
export { CustomProvider } from './providers/custom.js';
export function createProvider(config) {
    switch (config.provider) {
        case 'claude':
            return new ClaudeProvider(config);
        case 'groq':
            return new GroqProvider(config);
        case 'custom':
            if (!config.baseURL) {
                throw new Error('Custom provider requires baseURL configuration');
            }
            return new CustomProvider(config);
        case 'ollama':
            throw new Error('Ollama provider needs to be updated. Please use groq or custom provider for local models.');
        case 'openai':
            throw new Error('OpenAI provider needs to be updated. Please use groq or custom provider.');
        default:
            throw new Error(`Unsupported LLM provider: ${config.provider}`);
    }
}
//# sourceMappingURL=index.js.map