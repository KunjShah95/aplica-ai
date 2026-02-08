import { randomUUID } from 'crypto';

export interface AgentSession {
  id: string;
  name: string;
  type: 'coordinator' | 'researcher' | 'executor' | 'analyst' | 'creative' | 'custom';
  status: 'active' | 'idle' | 'busy' | 'terminated';
  createdAt: Date;
  lastActivity: Date;
  metadata: AgentSessionMetadata;
}

export interface AgentSessionMetadata {
  description?: string;
  capabilities: string[];
  tools: string[];
  model?: string;
  context?: Record<string, unknown>;
}

export interface SessionMessage {
  id: string;
  fromSession: string;
  toSession: string;
  content: string;
  timestamp: Date;
  replyTo?: string;
  priority?: 'low' | 'normal' | 'high' | 'urgent';
  metadata?: Record<string, unknown>;
}

export interface SessionHistoryEntry {
  id: string;
  sessionId: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  metadata?: Record<string, unknown>;
}

export class SessionManager {
  private sessions: Map<string, AgentSession> = new Map();
  private messageQueue: Map<string, SessionMessage[]> = new Map();
  private history: Map<string, SessionHistoryEntry[]> = new Map();
  private pendingReplies: Map<
    string,
    { resolve: (value: string) => void; reject: (error: Error) => void; timeout: NodeJS.Timeout }
  > = new Map();

  constructor() {
    this.createDefaultSessions();
  }

  private createDefaultSessions(): void {
    const defaultSessions: Omit<AgentSession, 'createdAt' | 'lastActivity'>[] = [
      {
        id: 'main',
        name: 'Main Agent',
        type: 'coordinator',
        status: 'active',
        metadata: {
          description: 'Primary coordinating agent',
          capabilities: ['reasoning', 'planning', 'communication'],
          tools: ['shell', 'filesystem', 'browser'],
        },
      },
      {
        id: 'researcher',
        name: 'Research Agent',
        type: 'researcher',
        status: 'idle',
        metadata: {
          description: 'Specialized in research and information gathering',
          capabilities: ['web_search', 'document_analysis', 'fact_checking'],
          tools: ['browser', 'filesystem'],
        },
      },
      {
        id: 'executor',
        name: 'Executor Agent',
        type: 'executor',
        status: 'idle',
        metadata: {
          description: 'Handles execution and implementation tasks',
          capabilities: ['code_execution', 'file_operations', 'system_commands'],
          tools: ['shell', 'filesystem', 'sandbox'],
        },
      },
    ];

    for (const session of defaultSessions) {
      this.createSession(session.id, session.name, session.type, session.metadata);
    }
  }

  createSession(
    id: string,
    name: string,
    type: 'coordinator' | 'researcher' | 'executor' | 'analyst' | 'creative' | 'custom',
    metadata: AgentSessionMetadata
  ): AgentSession {
    const session: AgentSession = {
      id,
      name,
      type,
      status: 'active',
      createdAt: new Date(),
      lastActivity: new Date(),
      metadata,
    };

    this.sessions.set(id, session);
    this.messageQueue.set(id, []);
    this.history.set(id, []);

    console.log(`Agent session created: ${name} (${id})`);
    return session;
  }

  getSession(sessionId: string): AgentSession | undefined {
    return this.sessions.get(sessionId);
  }

  getAllSessions(): AgentSession[] {
    return Array.from(this.sessions.values());
  }

  getActiveSessions(): AgentSession[] {
    return Array.from(this.sessions.values()).filter(
      (s) => s.status === 'active' || s.status === 'idle'
    );
  }

  updateSessionStatus(
    sessionId: string,
    status: 'active' | 'idle' | 'busy' | 'terminated'
  ): boolean {
    const session = this.sessions.get(sessionId);
    if (!session) return false;

    session.status = status;
    session.lastActivity = new Date();
    this.sessions.set(sessionId, session);

    console.log(`Session ${sessionId} status updated: ${status}`);
    return true;
  }

  terminateSession(sessionId: string): boolean {
    const session = this.sessions.get(sessionId);
    if (!session) return false;

    session.status = 'terminated';
    session.lastActivity = new Date();
    this.sessions.set(sessionId, session);

    const queue = this.messageQueue.get(sessionId);
    if (queue) {
      this.messageQueue.delete(sessionId);
    }

    console.log(`Session ${sessionId} terminated`);
    return true;
  }

  async sendMessage(
    fromSession: string,
    toSession: string,
    content: string,
    options?: {
      replyTo?: string;
      priority?: 'low' | 'normal' | 'high' | 'urgent';
      metadata?: Record<string, unknown>;
    }
  ): Promise<string | null> {
    const from = this.sessions.get(fromSession);
    const to = this.sessions.get(toSession);

    if (!from || !to) {
      throw new Error('Invalid session IDs');
    }

    const message: SessionMessage = {
      id: randomUUID(),
      fromSession,
      toSession,
      content,
      timestamp: new Date(),
      replyTo: options?.replyTo,
      priority: options?.priority || 'normal',
      metadata: options?.metadata,
    };

    from.lastActivity = new Date();
    this.sessions.set(fromSession, from);

    const queue = this.messageQueue.get(toSession) || [];
    queue.push(message);

    if (options?.replyTo) {
      return new Promise<string>((resolve, reject) => {
        const timeout = setTimeout(() => {
          this.pendingReplies.delete(message.id);
          reject(new Error('Reply timeout'));
        }, 30000);

        this.pendingReplies.set(message.id, { resolve, reject, timeout });
      });
    }

    return message.id;
  }

  receiveMessage(sessionId: string): SessionMessage | null {
    const queue = this.messageQueue.get(sessionId);
    if (!queue || queue.length === 0) return null;

    const message = queue.shift()!;
    const session = this.sessions.get(sessionId);
    if (session) {
      session.lastActivity = new Date();
      this.sessions.set(sessionId, session);
    }

    return message;
  }

  receiveAllMessages(sessionId: string): SessionMessage[] {
    const queue = this.messageQueue.get(sessionId) || [];
    this.messageQueue.set(sessionId, []);
    return queue;
  }

  async replyTo(originalMessageId: string, content: string): Promise<void> {
    const pending = this.pendingReplies.get(originalMessageId);
    if (!pending) {
      throw new Error('No pending reply for this message');
    }

    clearTimeout(pending.timeout);
    pending.resolve(content);
    this.pendingReplies.delete(originalMessageId);
  }

  addToHistory(
    sessionId: string,
    role: 'user' | 'assistant' | 'system',
    content: string,
    metadata?: Record<string, unknown>
  ): void {
    const history = this.history.get(sessionId) || [];

    history.push({
      id: randomUUID(),
      sessionId,
      role,
      content,
      timestamp: new Date(),
      metadata,
    });

    const session = this.sessions.get(sessionId);
    if (session) {
      session.lastActivity = new Date();
      this.sessions.set(sessionId, session);
    }

    this.history.set(sessionId, history);
  }

  getHistory(sessionId: string, limit?: number): SessionHistoryEntry[] {
    const history = this.history.get(sessionId) || [];
    if (limit) {
      return history.slice(-limit);
    }
    return history;
  }

  clearHistory(sessionId: string): void {
    this.history.set(sessionId, []);
  }

  async broadcastMessage(
    fromSession: string,
    content: string,
    exclude?: string[]
  ): Promise<string[]> {
    const results: string[] = [];

    for (const [sessionId, session] of this.sessions.entries()) {
      if (sessionId === fromSession) continue;
      if (exclude?.includes(sessionId)) continue;
      if (session.status === 'terminated') continue;

      try {
        const messageId = await this.sendMessage(fromSession, sessionId, content);
        if (messageId) {
          results.push(messageId);
        }
      } catch (error) {
        console.error(`Failed to broadcast to ${sessionId}:`, error);
      }
    }

    return results;
  }

  getStats(): {
    total: number;
    active: number;
    idle: number;
    busy: number;
    terminated: number;
    pendingMessages: number;
  } {
    const stats = {
      total: this.sessions.size,
      active: 0,
      idle: 0,
      busy: 0,
      terminated: 0,
      pendingMessages: 0,
    };

    for (const session of this.sessions.values()) {
      switch (session.status) {
        case 'active':
          stats.active++;
          break;
        case 'idle':
          stats.idle++;
          break;
        case 'busy':
          stats.busy++;
          break;
        case 'terminated':
          stats.terminated++;
          break;
      }
    }

    for (const queue of this.messageQueue.values()) {
      stats.pendingMessages += queue.length;
    }

    return stats;
  }

  pruneInactive(maxAge: number = 3600000): number {
    const cutoff = new Date(Date.now() - maxAge);
    let removed = 0;

    for (const [sessionId, session] of this.sessions.entries()) {
      if (session.status === 'terminated' && session.lastActivity < cutoff) {
        this.sessions.delete(sessionId);
        this.messageQueue.delete(sessionId);
        this.history.delete(sessionId);
        removed++;
      }
    }

    return removed;
  }
}

export const sessionManager = new SessionManager();

export const sessionTools = {
  async sessions_list(): Promise<AgentSession[]> {
    return sessionManager.getActiveSessions();
  },

  async sessions_history(sessionId: string, limit?: number): Promise<SessionHistoryEntry[]> {
    return sessionManager.getHistory(sessionId, limit);
  },

  async sessions_send(
    fromSession: string,
    toSession: string,
    content: string,
    options?: { replyTo?: string; priority?: 'low' | 'normal' | 'high' | 'urgent' }
  ): Promise<string | null> {
    return sessionManager.sendMessage(fromSession, toSession, content, options);
  },

  async sessions_spawn(
    parentSessionId: string,
    childId: string,
    childName: string,
    childType: 'coordinator' | 'researcher' | 'executor' | 'analyst' | 'creative' | 'custom',
    capabilities: string[],
    tools: string[]
  ): Promise<AgentSession | null> {
    const parent = sessionManager.getSession(parentSessionId);
    if (!parent) return null;

    return sessionManager.createSession(childId, childName, childType, {
      description: `Spawned from ${parent.name}`,
      capabilities,
      tools,
      context: { parentSession: parentSessionId },
    });
  },
};
