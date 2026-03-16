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
export declare class MCPClient extends EventEmitter {
    private serverConfig;
    private connection?;
    private tools;
    private resources;
    private messageHandlers;
    private sseEndpoint?;
    constructor(config: MCPServerConfig);
    connect(): Promise<void>;
    private connectHTTP;
    private connectSSE;
    private handleSSEMessage;
    private connectStdio;
    disconnect(): Promise<void>;
    initialize(): Promise<{
        tools: MCPTool[];
        resources: MCPResource[];
    }>;
    listTools(): Promise<MCPTool[]>;
    callTool(name: string, args: Record<string, unknown>): Promise<unknown>;
    listResources(): Promise<MCPResource[]>;
    readResource(uri: string): Promise<string>;
    subscribeToResource(uri: string): Promise<void>;
    private sendRequest;
    private sendNotification;
    private sendMessage;
    getTools(): MCPTool[];
    getResources(): MCPResource[];
    hasTool(name: string): boolean;
}
export declare class MCPManager extends EventEmitter {
    private servers;
    addServer(config: MCPServerConfig): Promise<void>;
    removeServer(serverId: string): Promise<void>;
    getServer(serverId: string): MCPClient | undefined;
    listServers(): {
        id: string;
        name: string;
        status: string;
    }[];
    findTool(toolName: string): Promise<{
        serverId: string;
        tool: MCPTool;
    } | null>;
    callTool(serverId: string, toolName: string, args: Record<string, unknown>): Promise<unknown>;
    broadcastToolDiscovery(): Promise<void>;
}
export declare const mcpManager: MCPManager;
//# sourceMappingURL=index.d.ts.map