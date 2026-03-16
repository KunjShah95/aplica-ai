import { randomUUID } from 'crypto';
import { EventEmitter } from 'events';

export interface MCPConnection {
  id: string;
  name: string;
  transport: 'http' | 'stdio' | 'sse';
  status: 'connected' | 'disconnected' | 'error';
  capabilities?: string[];
  lastMessage?: Date;
}

export interface MCPMessage {
  jsonrpc: '2.0';
  id?: string;
  method: string;
  params?: Record<string, unknown>;
  result?: unknown;
  error?: {
    code: number;
    message: string;
    data?: unknown;
  };
}

export interface MCPTool {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
}

export interface MCPResource {
  uri: string;
  name: string;
  description?: string;
  mimeType?: string;
}

export interface MCPServerConfig {
  id: string;
  name: string;
  command?: string;
  args?: string[];
  env?: Record<string, string>;
  url?: string;
  transport: 'http' | 'stdio' | 'sse';
  capabilities?: string[];
}

export class MCPClient extends EventEmitter {
  private serverConfig: MCPServerConfig;
  private connection?: any;
  private tools: Map<string, MCPTool> = new Map();
  private resources: Map<string, MCPResource> = new Map();
  private messageHandlers: Map<string, (result: any) => void> = new Map();
  private sseEndpoint?: string;

  constructor(config: MCPServerConfig) {
    super();
    this.serverConfig = config;
  }

  async connect(): Promise<void> {
    switch (this.serverConfig.transport) {
      case 'http':
        await this.connectHTTP();
        break;
      case 'sse':
        await this.connectSSE();
        break;
      case 'stdio':
        await this.connectStdio();
        break;
    }
  }

  private async connectHTTP(): Promise<void> {
    if (!this.serverConfig.url) {
      throw new Error('URL required for HTTP transport');
    }

    this.connection = fetch(this.serverConfig.url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });

    console.log(`MCP client connected to ${this.serverConfig.name} via HTTP`);
  }

  private async connectSSE(): Promise<void> {
    if (!this.serverConfig.url) {
      throw new Error('URL required for SSE transport');
    }

    this.sseEndpoint = this.serverConfig.url;

    const response = await fetch(this.serverConfig.url, {
      method: 'GET',
    });

    const reader = response.body?.getReader();
    const decoder = new TextDecoder();

    if (!reader) {
      throw new Error('Failed to connect to SSE endpoint');
    }

    let buffer = '';

    const read = async () => {
      const { done, value } = await reader.read();

      if (done) {
        this.emit('disconnected');
        return;
      }

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6);
          this.handleSSEMessage(data);
        }
      }

      read();
    };

    read();
    console.log(`MCP client connected to ${this.serverConfig.name} via SSE`);
  }

  private handleSSEMessage(data: string): void {
    try {
      const message = JSON.parse(data) as MCPMessage;

      if (message.id && this.messageHandlers.has(message.id)) {
        const handler = this.messageHandlers.get(message.id)!;
        handler(message);
        this.messageHandlers.delete(message.id);
      }

      this.emit('message', message);
    } catch (error) {
      console.error('Failed to parse SSE message:', error);
    }
  }

  private async connectStdio(): Promise<void> {
    console.log(`MCP client connecting to ${this.serverConfig.name} via stdio`);
  }

  async disconnect(): Promise<void> {
    if (this.connection) {
      this.connection = undefined;
    }
    this.tools.clear();
    this.resources.clear();
    this.emit('disconnected');
  }

  async initialize(): Promise<{ tools: MCPTool[]; resources: MCPResource[] }> {
    const response = await this.sendRequest('initialize', {
      protocolVersion: '2024-11-05',
      capabilities: {},
      clientInfo: {
        name: 'alpicia',
        version: '1.0.0',
      },
    });

    this.serverConfig.capabilities = response.capabilities;

    if (response.capabilities?.tools) {
      await this.listTools();
    }

    if (response.capabilities?.resources) {
      await this.listResources();
    }

    await this.sendNotification('initialized', {});

    return {
      tools: Array.from(this.tools.values()),
      resources: Array.from(this.resources.values()),
    };
  }

  async listTools(): Promise<MCPTool[]> {
    const response = await this.sendRequest('tools/list');

    const tools: MCPTool[] = [];
    for (const tool of response.tools || []) {
      const mcpTool: MCPTool = {
        name: tool.name,
        description: tool.description || '',
        inputSchema: tool.inputSchema || {},
      };
      this.tools.set(tool.name, mcpTool);
      tools.push(mcpTool);
    }

    return tools;
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<unknown> {
    const response = await this.sendRequest('tools/call', {
      name,
      arguments: args,
    });

    return response;
  }

  async listResources(): Promise<MCPResource[]> {
    const response = await this.sendRequest('resources/list');

    const resources: MCPResource[] = [];
    for (const resource of response.resources || []) {
      const mcpResource: MCPResource = {
        uri: resource.uri,
        name: resource.name,
        description: resource.description,
        mimeType: resource.mimeType,
      };
      this.resources.set(resource.uri, mcpResource);
      resources.push(mcpResource);
    }

    return resources;
  }

  async readResource(uri: string): Promise<string> {
    const response = await this.sendRequest('resources/read', { uri });
    return response.contents?.[0]?.text || '';
  }

  async subscribeToResource(uri: string): Promise<void> {
    await this.sendNotification('resources/subscribe', { uri });
  }

  private async sendRequest(method: string, params?: Record<string, unknown>): Promise<any> {
    const id = randomUUID();

    return new Promise((resolve, reject) => {
      this.messageHandlers.set(id, (message) => {
        if (message.error) {
          reject(new Error(message.error.message));
        } else {
          resolve(message.result);
        }
      });

      const request: MCPMessage = {
        jsonrpc: '2.0',
        id,
        method,
        params,
      };

      this.sendMessage(request);

      setTimeout(() => {
        this.messageHandlers.delete(id);
        reject(new Error(`Request ${method} timed out`));
      }, 30000);
    });
  }

  private async sendNotification(method: string, params?: Record<string, unknown>): Promise<void> {
    const notification: MCPMessage = {
      jsonrpc: '2.0',
      method,
      params,
    };

    this.sendMessage(notification);
  }

  private sendMessage(message: MCPMessage): void {
    if (this.serverConfig.transport === 'sse' && this.sseEndpoint) {
      fetch(this.sseEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(message),
      }).catch(console.error);
    }
  }

  getTools(): MCPTool[] {
    return Array.from(this.tools.values());
  }

  getResources(): MCPResource[] {
    return Array.from(this.resources.values());
  }

  hasTool(name: string): boolean {
    return this.tools.has(name);
  }
}

export class MCPManager extends EventEmitter {
  private servers: Map<string, MCPClient> = new Map();

  async addServer(config: MCPServerConfig): Promise<void> {
    const client = new MCPClient(config);

    try {
      await client.connect();
      const { tools, resources } = await client.initialize();

      this.servers.set(config.id, client);

      console.log(
        `MCP server "${config.name}" connected with ${tools.length} tools and ${resources.length} resources`
      );
    } catch (error) {
      console.error(`Failed to connect MCP server "${config.name}":`, error);
      throw error;
    }
  }

  async removeServer(serverId: string): Promise<void> {
    const client = this.servers.get(serverId);
    if (client) {
      await client.disconnect();
      this.servers.delete(serverId);
    }
  }

  getServer(serverId: string): MCPClient | undefined {
    return this.servers.get(serverId);
  }

  listServers(): { id: string; name: string; status: string }[] {
    return Array.from(this.servers.entries()).map(([id, client]) => ({
      id,
      name: client['serverConfig'].name,
      status: 'connected',
    }));
  }

  async findTool(toolName: string): Promise<{ serverId: string; tool: MCPTool } | null> {
    for (const [serverId, client] of this.servers.entries()) {
      if (client.hasTool(toolName)) {
        const tools = client.getTools();
        const tool = tools.find((t) => t.name === toolName);
        if (tool) {
          return { serverId, tool };
        }
      }
    }
    return null;
  }

  async callTool(
    serverId: string,
    toolName: string,
    args: Record<string, unknown>
  ): Promise<unknown> {
    const client = this.servers.get(serverId);
    if (!client) {
      throw new Error(`MCP server not found: ${serverId}`);
    }

    return client.callTool(toolName, args);
  }

  async broadcastToolDiscovery(): Promise<void> {
    for (const [serverId, client] of this.servers.entries()) {
      const tools = client.getTools();
      this.emit('toolsDiscovered', { serverId, tools });
    }
  }
}

export const mcpManager = new MCPManager();
