export interface ToolDefinition {
    name: string;
    description: string;
    schema: {
        type: 'object';
        properties: Record<string, {
            type: string;
            description?: string;
            enum?: string[];
            items?: {
                type: string;
            };
            default?: unknown;
        }>;
        required?: string[];
    };
    handler: string;
    category?: string;
    permissions?: string[];
}
export interface ToolExecutionInput {
    toolId: string;
    input: Record<string, unknown>;
    userId?: string;
}
export interface ToolExecutionResult {
    id: string;
    output: unknown;
    status: 'COMPLETED' | 'FAILED' | 'PENDING_APPROVAL';
    duration: number;
    error?: string;
}
type ToolHandler = (input: Record<string, unknown>) => Promise<unknown>;
export declare class ToolRegistry {
    private handlers;
    constructor();
    private registerBuiltinHandlers;
    register(tool: ToolDefinition): Promise<void>;
    registerHandler(name: string, handler: ToolHandler): void;
    execute(input: ToolExecutionInput): Promise<ToolExecutionResult>;
    list(category?: string): Promise<{
        name: string;
        description: string;
        id: string;
        permissions: string[];
        createdAt: Date;
        updatedAt: Date;
        category: string | null;
        handler: string;
        isEnabled: boolean;
        schema: import("@prisma/client/runtime/library").JsonValue;
        isBuiltin: boolean;
    }[]>;
    getEnabled(): Promise<{
        name: string;
        description: string;
        id: string;
        permissions: string[];
        createdAt: Date;
        updatedAt: Date;
        category: string | null;
        handler: string;
        isEnabled: boolean;
        schema: import("@prisma/client/runtime/library").JsonValue;
        isBuiltin: boolean;
    }[]>;
    enable(name: string): Promise<void>;
    disable(name: string): Promise<void>;
    getExecutionHistory(toolId: string, limit?: number): Promise<{
        error: string | null;
        status: import(".prisma/client").$Enums.ExecutionStatus;
        id: string;
        createdAt: Date;
        duration: number | null;
        input: import("@prisma/client/runtime/library").JsonValue;
        output: import("@prisma/client/runtime/library").JsonValue | null;
        toolId: string;
    }[]>;
    seedBuiltinTools(): Promise<void>;
}
export declare const toolRegistry: ToolRegistry;
export {};
//# sourceMappingURL=tools.d.ts.map