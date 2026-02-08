import { EventEmitter } from 'events';
import { spawn } from 'child_process';
export class MCPClient extends EventEmitter {
    servers = new Map();
    tools = new Map();
    options;
    constructor(options) {
        super();
        this.options = {
            maxRetries: 3,
            retryDelay: 1000,
            ...options,
        };
    }
    async initialize() {
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
            }
            catch (error) {
                console.error(`Failed to initialize MCP server "${serverConfig.name}":`, error);
            }
        }
        console.log(`MCP client initialized: ${this.tools.size} total tools`);
    }
    async callTool(toolName, params = {}) {
        const [serverName, actualToolName] = toolName.split('/');
        const server = this.servers.get(serverName);
        if (!server) {
            throw new Error(`MCP server "${serverName}" not found`);
        }
        return server.callTool(actualToolName, params);
    }
    getTools() {
        return Array.from(this.tools.values());
    }
    findTool(name) {
        return this.tools.get(name);
    }
    async callToolByName(toolName, params = {}) {
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
    async shutdown() {
        for (const server of this.servers.values()) {
            await server.stop();
        }
        this.servers.clear();
        this.tools.clear();
        console.log('MCP client shut down');
    }
    getStats() {
        return {
            serverCount: this.servers.size,
            toolCount: this.tools.size,
        };
    }
}
class MCPChildProcess {
    process = null;
    config;
    messageQueue = [];
    pendingRequests = new Map();
    nextId = 1;
    constructor(config) {
        this.config = config;
    }
    async start() {
        return new Promise((resolve, reject) => {
            this.process = spawn(this.config.command, this.config.args || [], {
                env: { ...process.env, ...this.config.env },
                stdio: ['pipe', 'pipe', 'pipe'],
            });
            if (!this.process) {
                reject(new Error('Failed to spawn process'));
                return;
            }
            this.process.stdout?.on('data', (data) => {
                this.handleOutput(data.toString());
            });
            this.process.stderr?.on('data', (data) => {
                console.error(`[MCP ${this.config.name}] stderr:`, data.toString());
            });
            this.process.on('error', (error) => {
                reject(error);
            });
            this.process.on('exit', (code) => {
                if (code !== 0 && code !== null) {
                    console.error(`[MCP ${this.config.name}] exited with code ${code}`);
                }
            });
            setTimeout(() => resolve(), 100);
        });
    }
    handleOutput(data) {
        const lines = data.split('\n').filter(Boolean);
        for (const line of lines) {
            try {
                const message = JSON.parse(line);
                if (message.id !== undefined && this.pendingRequests.has(message.id)) {
                    const request = this.pendingRequests.get(message.id);
                    this.pendingRequests.delete(message.id);
                    if (message.error) {
                        request.reject(new Error(message.error.message));
                    }
                    else {
                        request.resolve(message.result);
                    }
                }
            }
            catch {
            }
        }
    }
    async listTools() {
        const result = await this.sendRequest('tools/list', {});
        return result?.tools || [];
    }
    async callTool(name, params) {
        return this.sendRequest('tools/call', { name, arguments: params });
    }
    sendRequest(method, params) {
        return new Promise((resolve, reject) => {
            const id = this.nextId++;
            const message = {
                jsonrpc: '2.0',
                id,
                method,
                params,
            };
            this.pendingRequests.set(id, { resolve, reject });
            this.send(message);
        });
    }
    send(message) {
        if (this.process && this.process.stdin) {
            this.process.stdin.write(JSON.stringify(message) + '\n');
        }
    }
    async stop() {
        if (this.process) {
            this.process.kill();
            this.process = null;
        }
    }
}
export function createMCPClient(options) {
    return new MCPClient(options);
}
//# sourceMappingURL=mcp.js.map