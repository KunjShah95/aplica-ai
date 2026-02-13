import { AppConfig } from '../config/types.js';
import { LLMProvider } from '../core/llm/index.js';
export interface CLIContext {
    config: AppConfig;
    llm: LLMProvider;
}
export declare function handleChat(context: CLIContext): Promise<void>;
export declare function handleStatus(context: CLIContext): Promise<void>;
export declare function handleConfig(context: CLIContext): Promise<void>;
export declare function handleViral(context: CLIContext): Promise<void>;
export declare function handleShare(context: CLIContext, platform: string): Promise<void>;
export declare function handleHelp(): Promise<void>;
//# sourceMappingURL=commands.d.ts.map