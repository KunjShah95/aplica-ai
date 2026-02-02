import { EventEmitter } from 'events';
import { ChildProcess, spawn } from 'child_process';
import { Readable } from 'stream';

export interface MCPMessage {
  jsonrpc: '2.0';
  id?: string | number;
  method?: string;
  params?: Record<string, unknown>;
  result?: unknown;
  error?: { code: number; message: string; data?: unknown };
}

export interface MCPTool {
  name: string;
  description: string;
  inputSchema: {
    type: 'object';
    properties?: Record<string, { type: string; description?: string }>;
    required?: string[];
  };
}

export interface MCPServerConfig {
  name: string;
  version: string;
  command: string;
  args?: string[];
  env?: Record<string, string>;
}

export interface MCPClientOptions {
  servers: MCPServerConfig[];
  maxRetries?: number;
  retryDelay?: number;
}

export class MCPClient extends EventEmitter {
  private servers: Map<string, MCPChildProcess> = new Map();
  private tools: Map<string, MCPTool> = new Map();
  private options: MCPClientOptions;

  constructor(options: MCPClientOptions) {
    super();
    this.options = {
      maxRetries: 3,
      retryDelay: 1000,
      ...options,
    };
  }

  async initialize(): Promise<void> {
    for (const serverConfig of this.options.servers) {
      try {
        const server = new MCPChildProcess(serverConfig);
        await server.start();

        const tools = await server.listTools();
        for (const tool of tools) {
          this.tools.set(`${serverConfig.name}/${tool.name}`, tool);
        }

        this.servers.set(serverConfig.name, server);
        console.log(`MCP server "${serverConfig.name}" initialized with ${tools.length} tools`);
      } catch (error) {
        console.error(`Failed to initialize MCP server "${serverConfig.name}":`, error);
      }
    }

    console.log(`MCP client initialized: ${this.tools.size} total tools`);
  }

  async callTool(toolName: string, params: Record<string, unknown> = {}): Promise<unknown> {
    const [serverName, actualToolName] = toolName.split('/');
    const server = this.servers.get(serverName);

    if (!server) {
      throw new Error(`MCP server "${serverName}" not found`);
    }

    return server.callTool(actualToolName, params);
  }

  getTools(): MCPTool[] {
    return Array.from(this.tools.values());
  }

  findTool(name: string): MCPTool | undefined {
    return this.tools.get(name);
  }

  async callToolByName(toolName: string, params: Record<string, unknown> = {}): Promise<unknown> {
    let tool = this.tools.get(toolName);

    if (!tool) {
      for (const [fullName, t] of this.tools) {
        if (t.name === toolName || fullName.endsWith(`/${toolName}`)) {
          tool = t;
          break;
        }
      }
    }

    if (!tool) {
      throw new Error(`Tool "${toolName}" not found`);
    }

    return this.callTool(toolName, params);
  }

  async shutdown(): Promise<void> {
    for (const server of this.servers.values()) {
      await server.stop();
    }
    this.servers.clear();
    this.tools.clear();
    console.log('MCP client shut down');
  }

  getStats(): { serverCount: number; toolCount: number } {
    return {
      serverCount: this.servers.size,
      toolCount: this.tools.size,
    };
  }
}

class MCPChildProcess {
  private process: ChildProcess | null = null;
  private config: MCPServerConfig;
  private messageQueue: Array<{
    message: MCPMessage;
    resolve: (result: unknown) => void;
    reject: (error: Error) => void;
  }> = [];
  private pendingRequests: Map<
    string | number,
    { resolve: (result: unknown) => void; reject: (error: Error) => void }
  > = new Map();
  private nextId: number = 1;

  constructor(config: MCPServerConfig) {
    this.config = config;
  }

  async start(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.process = spawn(this.config.command, this.config.args || [], {
        env: { ...process.env, ...this.config.env },
        stdio: ['pipe', 'pipe', 'pipe'],
      });

      if (!this.process) {
        reject(new Error('Failed to spawn process'));
        return;
      }

      this.process.stdout?.on('data', (data: Buffer) => {
        this.handleOutput(data.toString());
      });

      this.process.stderr?.on('data', (data: Buffer) => {
        console.error(`[MCP ${this.config.name}] stderr:`, data.toString());
      });

      this.process.on('error', (error: Error) => {
        reject(error);
      });

      this.process.on('exit', (code: number | null) => {
        if (code !== 0 && code !== null) {
          console.error(`[MCP ${this.config.name}] exited with code ${code}`);
        }
      });

      setTimeout(() => resolve(), 100);
    });
  }

  private handleOutput(data: string): void {
    const lines = data.split('\n').filter(Boolean);

    for (const line of lines) {
      try {
        const message: MCPMessage = JSON.parse(line);

        if (message.id !== undefined && this.pendingRequests.has(message.id)) {
          const request = this.pendingRequests.get(message.id)!;
          this.pendingRequests.delete(message.id);

          if (message.error) {
            request.reject(new Error(message.error.message));
          } else {
            request.resolve(message.result);
          }
        }
      } catch {
      }
    }
  }

  async listTools(): Promise<MCPTool[]> {
    const result = await this.sendRequest('tools/list', {});
    return (result as { tools?: MCPTool[] })?.tools || [];
  }

  async callTool(name: string, params: Record<string, unknown>): Promise<unknown> {
    return this.sendRequest('tools/call', { name, arguments: params });
  }

  private sendRequest(method: string, params: Record<string, unknown>): Promise<unknown> {
    return new Promise((resolve, reject) => {
      const id = this.nextId++;

      const message: MCPMessage = {
        jsonrpc: '2.0',
        id,
        method,
        params,
      };

      this.pendingRequests.set(id, { resolve, reject });
      this.send(message);
    });
  }

  private send(message: MCPMessage): void {
    if (this.process && this.process.stdin) {
      this.process.stdin.write(JSON.stringify(message) + '\n');
    }
  }

  async stop(): Promise<void> {
    if (this.process) {
      this.process.kill();
      this.process = null;
    }
  }
}

export function createMCPClient(options: MCPClientOptions): MCPClient {
  return new MCPClient(options);
}
