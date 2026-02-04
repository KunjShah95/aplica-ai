export interface LLMConfig {
  model: string;
  maxTokens?: number;
  temperature?: number;
  topP?: number;
  frequencyPenalty?: number;
  presencePenalty?: number;
  stop?: string[];
}

export interface LLMMessage {
  role: 'system' | 'user' | 'assistant' | 'function';
  content: string;
  name?: string;
  functionCall?: {
    name: string;
    arguments: string;
  };
}

export interface LLMResponse {
  content: string;
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  latency: number;
  model: string;
  finishReason: 'stop' | 'length' | 'tool_calls' | 'content_filter' | 'function_call';
  functionCalls?: FunctionCall[];
}

export interface FunctionCall {
  name: string;
  arguments: Record<string, any>;
}

export interface StreamCallback {
  (data: { content: string; delta: string; finished: boolean }): void | Promise<void>;
}

export interface ToolDefinition {
  name: string;
  description: string;
  parameters: {
    type: 'object';
    properties: Record<
      string,
      {
        type: string;
        description: string;
        enum?: string[];
      }
    >;
    required: string[];
  };
}

export interface TokenUsage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
}

export interface LLMProvider {
  complete(
    messages: LLMMessage[],
    options?: {
      temperature?: number;
      maxTokens?: number;
      stream?: boolean;
      onStream?: StreamCallback;
    }
  ): Promise<LLMResponse>;

  embed(text: string | string[]): Promise<number[][]>;

  countTokens(text: string): Promise<number>;

  getModelInfo(): Promise<{
    name: string;
    contextLength: number;
    capabilities: string[];
  }>;

  listModels(): Promise<string[]>;
}

export { LLMProvider };
