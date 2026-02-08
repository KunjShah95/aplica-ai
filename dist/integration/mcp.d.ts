import { EventEmitter } from 'events';
export interface MCPMessage {
    jsonrpc: '2.0';
    id?: string | number;
    method?: string;
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
    inputSchema: {
        type: 'object';
        properties?: Record<string, {
            type: string;
            description?: string;
        }>;
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
export declare class MCPClient extends EventEmitter {
    private servers;
    private tools;
    private options;
    constructor(options: MCPClientOptions);
    initialize(): Promise<void>;
    callTool(toolName: string, params?: Record<string, unknown>): Promise<unknown>;
    getTools(): MCPTool[];
    findTool(name: string): MCPTool | undefined;
    callToolByName(toolName: string, params?: Record<string, unknown>): Promise<unknown>;
    shutdown(): Promise<void>;
    getStats(): {
        serverCount: number;
        toolCount: number;
    };
}
export declare function createMCPClient(options: MCPClientOptions): MCPClient;
//# sourceMappingURL=mcp.d.ts.map