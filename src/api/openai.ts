import { createServer, IncomingMessage, ServerResponse } from 'http';
import { createHash } from 'crypto';
import { randomUUID } from 'crypto';
import { Agent } from '../core/agent.js';
import { MessageRouter } from '../gateway/router.js';

export interface OpenAICompletionRequest {
  model: string;
  messages: Array<{
    role: 'system' | 'user' | 'assistant' | 'function';
    content: string;
    name?: string;
  }>;
  max_tokens?: number;
  temperature?: number;
  top_p?: number;
  stream?: boolean;
  stop?: string | string[];
  presence_penalty?: number;
  frequency_penalty?: number;
  logit_bias?: Record<string, number>;
  user?: string;
}

export interface OpenAICompletionResponse {
  id: string;
  object: 'chat.completion';
  created: number;
  model: string;
  choices: Array<{
    index: number;
    message: { role: 'assistant'; content: string; tool_calls?: unknown[] };
    finish_reason: 'stop' | 'length' | 'tool_calls' | 'content_filter' | null;
  }>;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

export interface OpenAIChatCompletionsOptions {
  port?: number;
  apiKey?: string;
  authToken?: string;
}

export class OpenAIEndpoint {
  private server: ReturnType<typeof createServer> | null = null;
  private port: number;
  private apiKey: string | null;
  private agent: Agent;
  private router: MessageRouter;

  constructor(agent: Agent, router: MessageRouter, options: OpenAIChatCompletionsOptions = {}) {
    this.port = options.port || 3002;
    this.apiKey = options.apiKey || null;
    this.agent = agent;
    this.router = router;
  }

  async start(): Promise<void> {
    this.server = createServer(async (req, res) => {
      await this.handleRequest(req, res);
    });

    this.server.listen(this.port, () => {
      console.log(`OpenAI-compatible API listening on port ${this.port}`);
    });

    this.server.on('error', (error) => {
      console.error('OpenAI API server error:', error);
    });
  }

  private async handleRequest(req: IncomingMessage, res: ServerResponse): Promise<void> {
    const headers = this.getCorsHeaders();
    Object.entries(headers).forEach(([key, value]) => {
      res.setHeader(key, value);
    });

    if (req.method === 'OPTIONS') {
      res.writeHead(204);
      res.end();
      return;
    }

    const url = new URL(req.url || '/', `http://localhost:${this.port}`);

    try {
      if (url.pathname === '/v1/chat/completions' && req.method === 'POST') {
        await this.handleChatCompletion(req, res);
      } else if (url.pathname === '/v1/models' && req.method === 'GET') {
        this.handleModelsList(res);
      } else if (url.pathname === '/health' && req.method === 'GET') {
        this.handleHealth(res);
      } else {
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: { message: 'Not found' } }));
      }
    } catch (error) {
      console.error('API error:', error);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(
        JSON.stringify({
          error: { message: error instanceof Error ? error.message : 'Internal server error' },
        })
      );
    }
  }

  private async handleChatCompletion(req: IncomingMessage, res: ServerResponse): Promise<void> {
    if (this.apiKey && !this.validateApiKey(req)) {
      res.writeHead(401, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: { message: 'Unauthorized' } }));
      return;
    }

    const chunks: Buffer[] = [];
    for await (const chunk of req) {
      chunks.push(chunk as Buffer);
    }
    const body = Buffer.concat(chunks).toString();

    let completionRequest: OpenAICompletionRequest;
    try {
      completionRequest = JSON.parse(body);
    } catch {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: { message: 'Invalid JSON' } }));
      return;
    }

    const isStream = completionRequest.stream || false;

    if (isStream) {
      res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      });
      await this.handleStreamingCompletion(completionRequest, res);
    } else {
      const response = await this.processCompletion(completionRequest);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(response));
    }
  }

  private async handleStreamingCompletion(
    request: OpenAICompletionRequest,
    res: ServerResponse
  ): Promise<void> {
    const response = await this.processCompletion(request);

    for (const choice of response.choices) {
      const chunk = {
        id: response.id,
        object: 'chat.completion.chunk',
        created: response.created,
        model: response.model,
        choices: [
          {
            index: choice.index,
            delta: choice.message,
            finish_reason: choice.finish_reason,
          },
        ],
      };

      res.write(`data: ${JSON.stringify(chunk)}\n\n`);
    }

    res.write('data: [DONE]\n\n');
    res.end();
  }

  private async processCompletion(
    request: OpenAICompletionRequest
  ): Promise<OpenAICompletionResponse> {
    const lastUserMessage = [...request.messages].reverse().find((m) => m.role === 'user');

    if (!lastUserMessage) {
      return {
        id: this.generateId(),
        object: 'chat.completion',
        created: Math.floor(Date.now() / 1000),
        model: request.model,
        choices: [
          {
            index: 0,
            message: { role: 'assistant', content: 'No user message found' },
            finish_reason: 'stop',
          },
        ],
        usage: { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 },
      };
    }

    try {
      const response = await this.router.handleFromWebSocket(
        request.user || 'api-user',
        lastUserMessage.content
      );

      return {
        id: this.generateId(),
        object: 'chat.completion',
        created: Math.floor(Date.now() / 1000),
        model: request.model,
        choices: [
          {
            index: 0,
            message: { role: 'assistant', content: response.content },
            finish_reason: 'stop',
          },
        ],
        usage: {
          prompt_tokens: this.estimateTokens(JSON.stringify(request.messages)),
          completion_tokens: this.estimateTokens(response.content),
          total_tokens:
            this.estimateTokens(JSON.stringify(request.messages)) +
            this.estimateTokens(response.content),
        },
      };
    } catch (error) {
      return {
        id: this.generateId(),
        object: 'chat.completion',
        created: Math.floor(Date.now() / 1000),
        model: request.model,
        choices: [
          {
            index: 0,
            message: {
              role: 'assistant',
              content: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
            },
            finish_reason: 'stop',
          },
        ],
        usage: { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 },
      };
    }
  }

  private handleModelsList(res: ServerResponse): void {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(
      JSON.stringify({
        object: 'list',
        data: [
          {
            id: 'alpicia-claude',
            object: 'model',
            created: Math.floor(Date.now() / 1000),
            owned_by: 'alpicia',
          },
          {
            id: 'alpicia Sonnet',
            object: 'model',
            created: Math.floor(Date.now() / 1000),
            owned_by: 'alpicia',
          },
          {
            id: 'alpicia-haiku',
            object: 'model',
            created: Math.floor(Date.now() / 1000),
            owned_by: 'alpicia',
          },
        ],
      })
    );
  }

  private handleHealth(res: ServerResponse): void {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(
      JSON.stringify({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        model: this.agent.getConfig().llm.model,
      })
    );
  }

  private validateApiKey(req: IncomingMessage): boolean {
    const authHeader = req.headers.authorization;
    if (!authHeader) return false;

    const expectedHash = createHash('sha256').update(this.apiKey!).digest('hex');
    return authHeader === `Bearer ${expectedHash}` || authHeader === `Bearer ${this.apiKey}`;
  }

  private generateId(): string {
    return `chatcmpl-${randomUUID().replace(/-/g, '').substring(0, 12)}`;
  }

  private estimateTokens(text: string): number {
    return Math.ceil(text.length / 4);
  }

  private getCorsHeaders(): Record<string, string> {
    return {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    };
  }

  async stop(): Promise<void> {
    if (this.server) {
      this.server.close();
      console.log('OpenAI-compatible API stopped');
    }
  }
}
