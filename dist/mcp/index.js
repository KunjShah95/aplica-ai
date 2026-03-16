import { randomUUID } from 'crypto';
import { EventEmitter } from 'events';
export class MCPClient extends EventEmitter {
    serverConfig;
    connection;
    tools = new Map();
    resources = new Map();
    messageHandlers = new Map();
    sseEndpoint;
    constructor(config) {
        super();
        this.serverConfig = config;
    }
    async connect() {
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
    async connectHTTP() {
        if (!this.serverConfig.url) {
            throw new Error('URL required for HTTP transport');
        }
        this.connection = fetch(this.serverConfig.url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
        });
        console.log(`MCP client connected to ${this.serverConfig.name} via HTTP`);
    }
    async connectSSE() {
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
    handleSSEMessage(data) {
        try {
            const message = JSON.parse(data);
            if (message.id && this.messageHandlers.has(message.id)) {
                const handler = this.messageHandlers.get(message.id);
                handler(message);
                this.messageHandlers.delete(message.id);
            }
            this.emit('message', message);
        }
        catch (error) {
            console.error('Failed to parse SSE message:', error);
        }
    }
    async connectStdio() {
        console.log(`MCP client connecting to ${this.serverConfig.name} via stdio`);
    }
    async disconnect() {
        if (this.connection) {
            this.connection = undefined;
        }
        this.tools.clear();
        this.resources.clear();
        this.emit('disconnected');
    }
    async initialize() {
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
    async listTools() {
        const response = await this.sendRequest('tools/list');
        const tools = [];
        for (const tool of response.tools || []) {
            const mcpTool = {
                name: tool.name,
                description: tool.description || '',
                inputSchema: tool.inputSchema || {},
            };
            this.tools.set(tool.name, mcpTool);
            tools.push(mcpTool);
        }
        return tools;
    }
    async callTool(name, args) {
        const response = await this.sendRequest('tools/call', {
            name,
            arguments: args,
        });
        return response;
    }
    async listResources() {
        const response = await this.sendRequest('resources/list');
        const resources = [];
        for (const resource of response.resources || []) {
            const mcpResource = {
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
    async readResource(uri) {
        const response = await this.sendRequest('resources/read', { uri });
        return response.contents?.[0]?.text || '';
    }
    async subscribeToResource(uri) {
        await this.sendNotification('resources/subscribe', { uri });
    }
    async sendRequest(method, params) {
        const id = randomUUID();
        return new Promise((resolve, reject) => {
            this.messageHandlers.set(id, (message) => {
                if (message.error) {
                    reject(new Error(message.error.message));
                }
                else {
                    resolve(message.result);
                }
            });
            const request = {
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
    async sendNotification(method, params) {
        const notification = {
            jsonrpc: '2.0',
            method,
            params,
        };
        this.sendMessage(notification);
    }
    sendMessage(message) {
        if (this.serverConfig.transport === 'sse' && this.sseEndpoint) {
            fetch(this.sseEndpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(message),
            }).catch(console.error);
        }
    }
    getTools() {
        return Array.from(this.tools.values());
    }
    getResources() {
        return Array.from(this.resources.values());
    }
    hasTool(name) {
        return this.tools.has(name);
    }
}
export class MCPManager extends EventEmitter {
    servers = new Map();
    async addServer(config) {
        const client = new MCPClient(config);
        try {
            await client.connect();
            const { tools, resources } = await client.initialize();
            this.servers.set(config.id, client);
            console.log(`MCP server "${config.name}" connected with ${tools.length} tools and ${resources.length} resources`);
        }
        catch (error) {
            console.error(`Failed to connect MCP server "${config.name}":`, error);
            throw error;
        }
    }
    async removeServer(serverId) {
        const client = this.servers.get(serverId);
        if (client) {
            await client.disconnect();
            this.servers.delete(serverId);
        }
    }
    getServer(serverId) {
        return this.servers.get(serverId);
    }
    listServers() {
        return Array.from(this.servers.entries()).map(([id, client]) => ({
            id,
            name: client['serverConfig'].name,
            status: 'connected',
        }));
    }
    async findTool(toolName) {
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
    async callTool(serverId, toolName, args) {
        const client = this.servers.get(serverId);
        if (!client) {
            throw new Error(`MCP server not found: ${serverId}`);
        }
        return client.callTool(toolName, args);
    }
    async broadcastToolDiscovery() {
        for (const [serverId, client] of this.servers.entries()) {
            const tools = client.getTools();
            this.emit('toolsDiscovered', { serverId, tools });
        }
    }
}
export const mcpManager = new MCPManager();
//# sourceMappingURL=index.js.map