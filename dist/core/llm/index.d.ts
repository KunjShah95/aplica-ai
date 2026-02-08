import { LLMConfig } from '../../config/types.js';
import { LLMProvider } from './base.js';
export { LLMProvider } from './base.js';
export type { LLMMessage, LLMCompletionResult, LLMCompletionOptions } from './base.js';
export { AnthropicProvider } from './providers/anthropic.js';
export declare function createProvider(config: LLMConfig): LLMProvider;
//# sourceMappingURL=index.d.ts.map