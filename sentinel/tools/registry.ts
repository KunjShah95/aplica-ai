import { EventEmitter } from 'events';

export interface ToolDefinition {
  name: string;
  description: string;
  category: ToolCategory;
  parameters: ToolParameter[];
  returns: ToolReturn;
  permissions: string[];
  examples: string[];
  version: string;
  author?: string;
  tags: string[];
  deprecated?: boolean;
}

export interface ToolParameter {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'array' | 'object';
  description: string;
  required: boolean;
  default?: any;
  enum?: string[];
  properties?: Record<string, ToolParameter>;
}

export interface ToolReturn {
  type: 'string' | 'number' | 'boolean' | 'array' | 'object';
  description: string;
  properties?: Record<string, any>;
}

export type ToolCategory =
  | 'productivity'
  | 'development'
  | 'knowledge'
  | 'creative'
  | 'physical'
  | 'communication'
  | 'analysis'
  | 'system'
  | 'custom';

export interface ToolExecutionContext {
  userId: string;
  sessionId: string;
  conversationId?: string;
  permissions: string[];
  environment?: Record<string, any>;
}

export interface ToolExecutionResult {
  success: boolean;
  output: any;
  error?: string;
  executionTime: number;
  tokensUsed?: { input: number; output: number };
}

export interface Tool {
  definition: ToolDefinition;
  executor: (params: Record<string any>) => Promise<ToolExecutionResult>;
  validator?: (params: Record<string any>) => ValidationResult;
}

export interface ValidationResult {
  valid: boolean;
  errors?: string[];
  warnings?: string[];
}

export class ToolRegistry extends EventEmitter {
  private tools: Map<string, Tool>;
  private categories: Map<ToolCategory, string[]>;
  private aliases: Map<string, string>;
  private pluginLoaders: Map<string, PluginLoader>;

  constructor() {
    super();
    this.tools = new Map();
    this.categories = new Map();
    this.aliases = new Map();
    this.pluginLoaders = new Map();

    this.initializeBuiltInCategories();
  }

  private initializeBuiltInCategories(): void {
    const defaultCategories: ToolCategory[] = [
      'productivity',
      'development',
      'knowledge',
      'creative',
      'physical',
      'communication',
      'analysis',
      'system',
      'custom',
    ];

    for (const category of defaultCategories) {
      this.categories.set(category, []);
    }
  }

  register(tool: Tool): void {
    if (this.tools.has(tool.definition.name)) {
      console.warn(`Tool ${tool.definition.name} is already registered. Overwriting.`);
    }

    this.tools.set(tool.definition.name, tool);
    this.categories.get(tool.definition.category)?.push(tool.definition.name);

    if (tool.definition.tags) {
      for (const tag of tool.definition.tags) {
        this.aliases.set(tag, tool.definition.name);
      }
    }

    this.emit('toolRegistered', tool.definition);
  }

  registerPlugin(id: string, loader: PluginLoader): void {
    this.pluginLoaders.set(id, loader);
  }

  async loadPlugins(): Promise<void> {
    for (const [, loader] of this.pluginLoaders) {
      const plugins = await loader.load();
      for (const plugin of plugins) {
        this.register(plugin);
      }
    }
  }

  getTool(name: string): Tool | null {
    const canonicalName = this.aliases.get(name) || name;
    return this.tools.get(canonicalName) || null;
  }

  getToolsByCategory(category: ToolCategory): ToolDefinition[] {
    const toolNames = this.categories.get(category) || [];
    return toolNames
      .map((name) => this.tools.get(name)?.definition)
      .filter((def): def is ToolDefinition => def !== undefined);
  }

  searchTools(query: string): ToolDefinition[] {
    const results: ToolDefinition[] = [];

    for (const [, tool] of this.tools) {
      const def = tool.definition;
      const searchText = `${def.name} ${def.description} ${def.tags.join(' ')}`.toLowerCase();

      if (searchText.includes(query.toLowerCase())) {
        results.push(def);
      }
    }

    return results;
  }

  async execute(
    name: string,
    params: Record<string, any>,
    context: ToolExecutionContext
  ): Promise<ToolExecutionResult> {
    const tool = this.getTool(name);

    if (!tool) {
      return {
        success: false,
        output: null,
        error: `Tool '${name}' not found`,
        executionTime: 0,
      };
    }

    const startTime = Date.now();

    try {
      const validation = this.validateParams(tool, params);
      if (!validation.valid) {
        return {
          success: false,
          output: null,
          error: `Validation failed: ${validation.errors?.join(', ')}`,
          executionTime: Date.now() - startTime,
        };
      }

      const permissionCheck = this.checkPermissions(tool, context.permissions);
      if (!permissionCheck.allowed) {
        return {
          success: false,
          output: null,
          error: `Permission denied: ${permissionCheck.reason}`,
          executionTime: Date.now() - startTime,
        };
      }

      this.emit('toolExecutionStarted', {
        tool: name,
        userId: context.userId,
        sessionId: context.sessionId,
      });

      const result = await tool.executor(params);

      result.executionTime = Date.now() - startTime;

      this.emit('toolExecutionCompleted', {
        tool: name,
        userId: context.userId,
        sessionId: context.sessionId,
        result,
      });

      return result;
    } catch (error) {
      const result: ToolExecutionResult = {
        success: false,
        output: null,
        error: error instanceof Error ? error.message : String(error),
        executionTime: Date.now() - startTime,
      };

      this.emit('toolExecutionFailed', {
        tool: name,
        userId: context.userId,
        sessionId: context.sessionId,
        error,
      });

      return result;
    }
  }

  private validateParams(
    tool: Tool,
    params: Record<string, any>
  ): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    for (const param of tool.definition.parameters) {
      if (param.required && params[param.name] === undefined) {
        errors.push(`Missing required parameter: ${param.name}`);
        continue;
      }

      if (params[param.name] !== undefined) {
        const typeCheck = this.checkType(params[param.name], param.type);
        if (!typeCheck.valid) {
          errors.push(`Invalid type for ${param.name}: ${typeCheck.reason}`);
        }

        if (param.enum && !param.enum.includes(params[param.name])) {
          warnings.push(
            `${param.name} value '${params[param.name]}' is not in the recommended enum values`
          );
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors: errors.length > 0 ? errors : undefined,
      warnings: warnings.length > 0 ? warnings : undefined,
    };
  }

  private checkType(
    value: any,
    expectedType: string
  ): { valid: boolean; reason?: string } {
    const typeMap: Record<string, string> = {
      string: 'string',
      number: 'number',
      boolean: 'boolean',
      array: 'array',
      object: 'object',
    };

    const actualType = Array.isArray(value) ? 'array' : typeof value;

    if (typeMap[expectedType] !== actualType) {
      return {
        valid: false,
        reason: `Expected ${expectedType}, got ${actualType}`,
      };
    }

    return { valid: true };
  }

  private checkPermissions(
    tool: Tool,
    userPermissions: string[]
  ): { allowed: boolean; reason?: string } {
    const missingPermissions = tool.definition.permissions.filter(
      (p) => !userPermissions.includes(p)
    );

    if (missingPermissions.length > 0) {
      return {
        allowed: false,
        reason: `Missing permissions: ${missingPermissions.join(', ')}`,
      };
    }

    return { allowed: true };
  }

  createToolDefinition(
    partial: Partial<ToolDefinition>
  ): ToolDefinition {
    return {
      name: partial.name || 'unnamed-tool',
      description: partial.description || '',
      category: partial.category || 'custom',
      parameters: partial.parameters || [],
      returns: partial.returns || { type: 'string', description: '' },
      permissions: partial.permissions || [],
      examples: partial.examples || [],
      version: partial.version || '1.0.0',
      tags: partial.tags || [],
      ...partial,
    };
  }

  getAllTools(): ToolDefinition[] {
    return Array.from(this.tools.values()).map((t) => t.definition);
  }

  getToolCount(): number {
    return this.tools.size;
  }

  getCategoryCount(): Map<ToolCategory, number> {
    const counts = new Map<ToolCategory, number>();

    for (const [category, tools] of this.categories) {
      counts.set(category, tools.length);
    }

    return counts;
  }

  async unregister(name: string): Promise<boolean> {
    const tool = this.tools.get(name);
    if (!tool) {
      return false;
    }

    this.tools.delete(name);

    const categoryTools = this.categories.get(tool.definition.category);
    if (categoryTools) {
      const index = categoryTools.indexOf(name);
      if (index !== -1) {
        categoryTools.splice(index, 1);
      }
    }

    this.emit('toolUnregistered', tool.definition);
    return true;
  }

  clear(): void {
    this.tools.clear();
    for (const [, tools] of this.categories) {
      tools.length = 0;
    }
    this.emit('registryCleared');
  }
}

interface PluginLoader {
  load(): Promise<Tool[]>;
}

export { ToolRegistry };
