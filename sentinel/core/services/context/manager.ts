import { EventEmitter } from 'events';
import { Tracer } from '../observability/tracing/tracer.js';

export interface ContextState {
  sessionId: string;
  userId: string;
  messages: Message[];
  workingMemory: WorkingMemory;
  entityStates: Map<string, EntityState>;
  conversationMode: ConversationMode;
  taskStack: TaskStack;
  references: ReferenceGraph;
  metadata: ContextMetadata;
}

export interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  metadata?: Record<string, any>;
}

export interface WorkingMemory {
  currentFocus: string;
  shortTermGoals: string[];
  recentEntities: string[];
  临时变量: Map<string, any>;
  constraints: string[];
  successCriteria: string[];
}

export interface EntityState {
  id: string;
  type: 'user' | 'file' | 'task' | 'conversation' | 'tool' | 'custom';
  properties: Record<string, any>;
  history: StateHistory[];
  confidence: number;
  lastUpdated: Date;
}

export interface StateHistory {
  timestamp: Date;
  operation: 'create' | 'update' | 'delete' | 'read';
  changes?: Record<string, any>;
  source: string;
}

export type ConversationMode =
  | 'casual'
  | 'task_oriented'
  | 'tutorial'
  | 'negotiation'
  | 'creative'
  | 'debugging'
  | 'analysis';

export interface TaskStack {
  tasks: Task[];
  currentTask?: Task;
  parentTask?: Task;
  taskHistory: CompletedTask[];
}

export interface Task {
  id: string;
  description: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed' | 'blocked';
  priority: 'low' | 'medium' | 'high' | 'critical';
  subtasks: string[];
  dependencies: string[];
  createdAt: Date;
  updatedAt: Date;
  result?: any;
}

export interface CompletedTask {
  id: string;
  description: string;
  result: any;
  completedAt: Date;
  duration: number;
}

export interface ReferenceGraph {
  nodes: ReferenceNode[];
  edges: ReferenceEdge[];
}

export interface ReferenceNode {
  id: string;
  type: 'entity' | 'concept' | 'action' | 'value';
  label: string;
  properties: Record<string, any>;
}

export interface ReferenceEdge {
  source: string;
  target: string;
  relation: 'refers_to' | 'part_of' | 'depends_on' | 'causes' | 'contradicts';
  strength: number;
}

export interface ContextMetadata {
  totalTokens: number;
  maxTokens: number;
  compressionRatio: number;
  lastAccessed: Date;
  accessCount: number;
  expiresAt: Date;
}

export class ContextManager extends EventEmitter {
  private contextStore: Map<string, ContextState>;
  private memoryCache: Map<string, any>;
  private referenceResolver: ReferenceResolver;
  private tracer: Tracer;
  private defaultMaxTokens: number;
  private contextRetentionMs: number;

  constructor() {
    super();
    this.contextStore = new Map();
    this.memoryCache = new Map();
    this.referenceResolver = new ReferenceResolver();
    this.tracer = new Tracer('context-manager');
    this.defaultMaxTokens = 8000;
    this.contextRetentionMs = 86400000;
  }

  async loadContext(sessionId: string, userId: string): Promise<ContextState> {
    return this.tracer.trace('loadContext', async (span) => {
      span.setAttribute('sessionId', sessionId);
      span.setAttribute('userId', userId);

      let context = this.contextStore.get(sessionId);

      if (!context || this.isExpired(context)) {
        context = await this.createContext(sessionId, userId);
      }

      context.metadata.lastAccessed = new Date();
      context.metadata.accessCount++;

      span.setAttribute('messages', context.messages.length);
      span.setAttribute('tokens', context.metadata.totalTokens);

      return context;
    });
  }

  async saveContext(context: ContextState): Promise<void> {
    await this.tracer.trace('saveContext', async () => {
      this.contextStore.set(context.sessionId, context);
      this.emit('contextSaved', context);
    });
  }

  async addMessage(context: ContextState, message: Message): Promise<void> {
    context.messages.push(message);
    context.metadata.totalTokens += this.estimateTokens(message.content);
    context.metadata.lastAccessed = new Date();

    if (context.metadata.totalTokens > context.metadata.maxTokens * 0.9) {
      await this.compressContext(context);
    }
  }

  async updateWorkingMemory(context: ContextState, updates: Partial<WorkingMemory>): Promise<void> {
    Object.assign(context.workingMemory, updates);
    context.metadata.lastAccessed = Date.now();
  }

  async pushTask(context: ContextState, task: Task): Promise<void> {
    context.taskStack.taskHistory.push({
      id: task.id,
      description: task.description,
      result: null,
      completedAt: new Date(),
      duration: 0,
    });

    context.taskStack.tasks.push(task);
    context.taskStack.currentTask = task;
    context.metadata.lastAccessed = new Date();
  }

  async popTask(context: ContextState): Promise<Task | undefined> {
    const task = context.taskStack.tasks.pop();
    if (task) {
      context.taskStack.currentTask = context.taskStack.tasks[context.taskStack.tasks.length - 1];
    }
    return task;
  }

  async updateEntity(context: ContextState, entity: EntityState): Promise<void> {
    const existing = context.entityStates.get(entity.id);
    if (existing) {
      existing.history.push({
        timestamp: new Date(),
        operation: 'update',
        changes: this.diff(existing.properties, entity.properties),
        source: 'context-manager',
      });
    }

    context.entityStates.set(entity.id, {
      ...entity,
      lastUpdated: new Date(),
      history: existing?.history || [
        {
          timestamp: new Date(),
          operation: existing ? 'update' : 'create',
          source: 'context-manager',
        },
      ],
    });
  }

  async getEntity(context: ContextState, entityId: string): Promise<EntityState | undefined> {
    return context.entityStates.get(entityId);
  }

  async addReference(
    context: ContextState,
    node: ReferenceNode,
    edges?: ReferenceEdge[]
  ): Promise<void> {
    const existing = context.references.nodes.find((n) => n.id === node.id);
    if (!existing) {
      context.references.nodes.push(node);
    }

    if (edges) {
      context.references.edges.push(...edges);
    }

    context.workingMemory.recentEntities.push(node.id);
    if (context.workingMemory.recentEntities.length > 20) {
      context.workingMemory.recentEntities.shift();
    }
  }

  async resolveReferences(context: ContextState, text: string): Promise<string> {
    return this.referenceResolver.resolve(text, context.references);
  }

  async setMode(context: ContextState, mode: ConversationMode): Promise<void> {
    context.conversationMode = mode;
    this.emit('modeChanged', { sessionId: context.sessionId, mode });
  }

  async compressContext(context: ContextState): Promise<void> {
    const summary = await this.summarizeMessages(context.messages);

    const compressedMessages = [
      {
        id: 'system',
        role: 'system' as const,
        content: `Conversation summary: ${summary}`,
        timestamp: context.messages[0]?.timestamp || new Date(),
      },
      {
        id: 'last',
        role: 'user' as const,
        content: context.messages[context.messages.length - 1]?.content || '',
        timestamp: context.messages[context.messages.length - 1]?.timestamp || new Date(),
      },
    ];

    context.messages = compressedMessages as Message[];
    context.metadata.totalTokens = this.estimateTokens(summary);
    context.metadata.compressionRatio = context.messages.length / (context.messages.length + 1);
  }

  async forkContext(context: ContextState): Promise<ContextState> {
    const forked: ContextState = {
      sessionId: `${context.sessionId}-fork-${Date.now()}`,
      userId: context.userId,
      messages: [...context.messages],
      workingMemory: {
        ...context.workingMemory,
        temporaryVariables: new Map(context.workingMemory.temporaryVariables),
      },
      entityStates: new Map(context.entityStates),
      conversationMode: context.conversationMode,
      taskStack: {
        tasks: [],
        taskHistory: [...context.taskStack.taskHistory],
      },
      references: {
        nodes: [...context.references.nodes],
        edges: [...context.references.edges],
      },
      metadata: {
        ...context.metadata,
        lastAccessed: new Date(),
        accessCount: 0,
      },
    };

    this.contextStore.set(forked.sessionId, forked);
    return forked;
  }

  async mergeContexts(primary: ContextState, secondary: ContextState): Promise<void> {
    primary.messages.push(...secondary.messages);

    for (const [id, entity] of secondary.entityStates) {
      if (!primary.entityStates.has(id)) {
        primary.entityStates.set(id, entity);
      }
    }

    primary.references.nodes.push(
      ...secondary.references.nodes.filter(
        (n) => !primary.references.nodes.some((pn) => pn.id === n.id)
      )
    );
    primary.references.edges.push(...secondary.references.edges);

    this.contextStore.delete(secondary.sessionId);
  }

  async clearContext(context: ContextState): Promise<void> {
    context.messages = [];
    context.workingMemory = {
      currentFocus: '',
      shortTermGoals: [],
      recentEntities: [],
      temporaryVariables: new Map(),
      constraints: [],
      successCriteria: [],
    };
    context.entityStates.clear();
    context.taskStack = { tasks: [], taskHistory: [] };
    context.references = { nodes: [], edges: [] };
    context.metadata = {
      totalTokens: 0,
      maxTokens: this.defaultMaxTokens,
      compressionRatio: 0,
      lastAccessed: new Date(),
      accessCount: 0,
      expiresAt: new Date(Date.now() + this.contextRetentionMs),
    };
  }

  private async createContext(sessionId: string, userId: string): Promise<ContextState> {
    return {
      sessionId,
      userId,
      messages: [],
      workingMemory: {
        currentFocus: '',
        shortTermGoals: [],
        recentEntities: [],
        temporaryVariables: new Map(),
        constraints: [],
        successCriteria: [],
      },
      entityStates: new Map(),
      conversationMode: 'casual',
      taskStack: { tasks: [], taskHistory: [] },
      references: { nodes: [], edges: [] },
      metadata: {
        totalTokens: 0,
        maxTokens: this.defaultMaxTokens,
        compressionRatio: 0,
        lastAccessed: new Date(),
        accessCount: 0,
        expiresAt: new Date(Date.now() + this.contextRetentionMs),
      },
    };
  }

  private isExpired(context: ContextState): boolean {
    return Date.now() > context.metadata.expiresAt.getTime();
  }

  private estimateTokens(text: string): number {
    return Math.ceil(text.length / 4);
  }

  private async summarizeMessages(messages: Message[]): Promise<string> {
    const relevantMessages = messages.filter((m) => m.role !== 'system').slice(-20);

    if (relevantMessages.length === 0) {
      return 'No messages in conversation.';
    }

    const content = relevantMessages.map((m) => m.content).join('\n');

    return content.slice(0, 500);
  }

  private diff(oldObj: Record<string, any>, newObj: Record<string, any>): Record<string, any> {
    const changes: Record<string, any> = {};

    for (const key of new Set([...Object.keys(oldObj), ...Object.keys(newObj)])) {
      if (oldObj[key] !== newObj[key]) {
        changes[key] = { from: oldObj[key], to: newObj[key] };
      }
    }

    return changes;
  }
}

class ReferenceResolver {
  private placeholderPattern = /\{([^}]+)\}/g;

  async resolve(text: string, references: ReferenceGraph): Promise<string> {
    return text.replace(this.placeholderPattern, (match, referenceId) => {
      const node = references.nodes.find((n) => n.id === referenceId);
      return node?.properties?.value || match;
    });
  }
}

export { ContextManager };
