import { ClaudeProvider } from './providers/claude.js';
export class LLMProvider {
    config;
    constructor(config) {
        this.config = config;
    }
}
export function createProvider(config) {
    switch (config.provider) {
        case 'claude':
            return new ClaudeProvider(config);
        default:
            throw new Error(`Unsupported LLM provider: ${config.provider}`);
    }
}
//# sourceMappingURL=index.js.map