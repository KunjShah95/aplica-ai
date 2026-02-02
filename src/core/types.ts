export interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  metadata?: MessageMetadata;
}

export interface MessageMetadata {
  source: 'telegram' | 'discord' | 'websocket' | 'cli' | 'assistant' | 'system';
  userId: string;
  conversationId: string;
  platformMessageId?: string;
}

export interface Conversation {
  id: string;
  userId: string;
  messages: Message[];
  createdAt: Date;
  updatedAt: Date;
  status: 'active' | 'paused' | 'closed';
  metadata: ConversationMetadata;
}

export interface ConversationMetadata {
  platform: 'telegram' | 'discord' | 'websocket' | 'cli';
  title?: string;
  tags: string[];
}

export interface Task {
  id: string;
  type: TaskType;
  priority: number;
  payload: TaskPayload;
  createdAt: Date;
  processedAt?: Date;
  status: TaskStatus;
  retryCount: number;
  maxRetries: number;
  error?: string;
}

export type TaskType =
  | 'message:process'
  | 'message:respond'
  | 'conversation:create'
  | 'conversation:continue'
  | 'skill:execute'
  | 'memory:save'
  | 'memory:search';

export type TaskStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';

export interface TaskPayload {
  message?: Message;
  conversationId?: string;
  userId?: string;
  response?: string;
  skillName?: string;
  skillInput?: unknown;
  query?: string;
  context?: Record<string, unknown>;
}

export interface QueueConfig {
  prefix: string;
  defaultJobOptions: {
    attempts: number;
    backoff: { type: 'exponential'; delay: number };
    removeOnComplete: number;
    removeOnFail: number;
  };
}

export interface ProcessingLane {
  name: string;
  priority: number;
  concurrency: number;
  color: string;
}
