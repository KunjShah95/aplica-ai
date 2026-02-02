import { LLMProvider, LLMMessage, LLMCompletionOptions, LLMCompletionResult } from '../index.js';
import { LLMConfig } from '../../../config/types.js';

interface OllamaModel {
  name: string;
  size: number;
  digest: string;
  modified_at: string;
}

interface OllamaGenerateRequest {
  model: string;
  prompt: string;
  system?: string;
  template?: string;
  context?: number[];
  stream?: boolean;
  options?: {
    num_predict?: number;
    temperature?: number;
    top_k?: number;
    top_p?: number;
    repeat_penalty?: number;
    seed?: number;
  };
}

interface OllamaGenerateResponse {
  model: string;
  response: string;
  context?: number[];
  done: boolean;
  total_duration?: number;
  load_duration?: number;
  prompt_eval_count?: number;
  prompt_eval_duration?: number;
  eval_count?: number;
  eval_duration?: number;
}

export class OllamaProvider extends LLMProvider {
  private baseUrl: string;
  private defaultModel: string;
  private availableModels: Set<string> = new Set();

  constructor(config: LLMConfig) {
    super(config);
    this.baseUrl = process.env.OLLAMA_BASE_URL || 'http://localhost:11434';
    this.defaultModel = config.model || 'llama3';
  }

  async complete(
    messages: LLMMessage[],
    options?: LLMCompletionOptions
  ): Promise<LLMCompletionResult> {
    const prompt = this.buildPrompt(messages);
    const model = this.config.model || this.defaultModel;
    const maxTokens = options?.maxTokens || this.config.maxTokens || 2048;
    const temperature = options?.temperature || this.config.temperature || 0.7;

    const request: OllamaGenerateRequest = {
      model,
      prompt,
      options: {
        num_predict: maxTokens,
        temperature,
      },
    };

    if (options?.systemPrompt) {
      request.system = options.systemPrompt;
    }

    try {
      const response = await this.callOllama('/api/generate', request);
      const data = response as OllamaGenerateResponse;

      return {
        content: data.response,
        tokensUsed: this.estimateTokens(data.response),
        model: data.model,
      };
    } catch (error) {
      console.error('Ollama completion error:', error);
      throw new Error(
        `Ollama API error: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  async *stream(messages: LLMMessage[], options?: LLMCompletionOptions): AsyncIterable<string> {
    const prompt = this.buildPrompt(messages);
    const model = this.config.model || this.defaultModel;
    const maxTokens = options?.maxTokens || this.config.maxTokens || 2048;
    const temperature = options?.temperature || this.config.temperature || 0.7;

    const request: OllamaGenerateRequest = {
      model,
      prompt,
      stream: true,
      options: {
        num_predict: maxTokens,
        temperature,
      },
    };

    if (options?.systemPrompt) {
      request.system = options.systemPrompt;
    }

    try {
      const response = await fetch(`${this.baseUrl}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(request),
      });

      if (!response.ok) {
        throw new Error(`Ollama API error: ${response.status}`);
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error('No response body');

      const decoder = new TextDecoder();

      for await (const chunk of this.readStream(reader, decoder)) {
        try {
          const data = JSON.parse(chunk) as OllamaGenerateResponse;
          yield data.response;
          if (data.done) break;
        } catch {
        }
      }
    } catch (error) {
      console.error('Ollama streaming error:', error);
      throw error;
    }
  }

  private async *readStream(
    reader: ReadableStreamDefaultReader,
    decoder: any
  ): AsyncGenerator<string> {
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (line.trim()) yield line;
      }
    }

    if (buffer.trim()) yield buffer;
  }

  async isAvailable(): Promise<boolean> {
    try {
      await this.callOllama('/api/tags');
      return true;
    } catch {
      return false;
    }
  }

  async getAvailableModels(): Promise<string[]> {
    try {
      const response = await this.callOllama('/api/tags');
      const data = response as { models: OllamaModel[] };

      this.availableModels.clear();
      for (const model of data.models || []) {
        this.availableModels.add(model.name);
      }

      return Array.from(this.availableModels);
    } catch {
      return [];
    }
  }

  async pullModel(modelName: string): Promise<{ success: boolean; status: string }> {
    try {
      const response = await fetch(`${this.baseUrl}/api/pull`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: modelName }),
      });

      if (!response.ok) {
        throw new Error(`Failed to pull model: ${response.status}`);
      }

      return { success: true, status: 'Model pulled successfully' };
    } catch (error) {
      return {
        success: false,
        status: `Failed to pull model: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  }

  async deleteModel(modelName: string): Promise<{ success: boolean; status: string }> {
    try {
      const response = await fetch(`${this.baseUrl}/api/delete`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: modelName }),
      });

      if (!response.ok) {
        throw new Error(`Failed to delete model: ${response.status}`);
      }

      this.availableModels.delete(modelName);
      return { success: true, status: 'Model deleted successfully' };
    } catch (error) {
      return {
        success: false,
        status: `Failed to delete model: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  }

  private async callOllama(endpoint: string, body?: unknown): Promise<unknown> {
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      method: body ? 'POST' : 'GET',
      headers: { 'Content-Type': 'application/json' },
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!response.ok) {
      throw new Error(`Ollama API error: ${response.status} ${response.statusText}`);
    }

    return response.json();
  }

  private buildPrompt(messages: LLMMessage[]): string {
    return messages
      .map((m) => {
        switch (m.role) {
          case 'system':
            return `### System\n${m.content}`;
          case 'user':
            return `### User\n${m.content}`;
          case 'assistant':
            return `### Assistant\n${m.content}`;
          default:
            return m.content;
        }
      })
      .join('\n\n');
  }

  private estimateTokens(text: string): number {
    return Math.ceil(text.length / 4);
  }

  getStats(): { baseUrl: string; defaultModel: string; availableModels: number } {
    return {
      baseUrl: this.baseUrl,
      defaultModel: this.defaultModel,
      availableModels: this.availableModels.size,
    };
  }
}
