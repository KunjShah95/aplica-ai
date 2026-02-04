import { EventEmitter } from 'events';
import { Tracer } from '../observability/tracing/tracer.js';

export interface MemoryQuery {
  query: string;
  embedding?: number[];
  filters?: MemoryFilters;
  limit?: number;
  minScore?: number;
  userId?: string;
  sessionId?: string;
}

export interface MemoryFilters {
  type?: MemoryType[];
  tags?: string[];
  dateRange?: { start: Date; end: Date };
  importance?: number;
  source?: string;
}

export type MemoryType =
  | 'episodic'
  | 'semantic'
  | 'procedural'
  | 'working'
  | 'longterm'
  | 'shortterm'
  | 'preference'
  | 'knowledge'
  | 'skill';

export interface MemoryRetrieval {
  memories: MemoryItem[];
  totalCount: number;
  searchTime: number;
  relevanceScores: Map<string, number>;
}

export interface MemoryItem {
  id: string;
  type: MemoryType;
  content: string;
  embedding: number[];
  metadata: MemoryMetadata;
  importance: number;
  accessCount: number;
  lastAccessed: Date;
  createdAt: Date;
}

export interface MemoryMetadata {
  tags: string[];
  source: string;
  context?: Record<string, any>;
  relationships?: string[];
  userId?: string;
  sessionId?: string;
}

export interface MemoryConsolidation {
  sourceMemories: string[];
  consolidatedMemory: MemoryItem;
  reasoning: string;
  timestamp: Date;
}

export interface UserProfile {
  userId: string;
  preferences: UserPreferences;
  habits: Habit[];
  communicationStyle: CommunicationStyle;
  goals: UserGoal[];
  learningHistory: LearningRecord[];
  lastUpdated: Date;
}

export interface UserPreferences {
  tone: 'formal' | 'casual' | 'friendly';
  detailLevel: 'concise' | 'moderate' | 'detailed';
  language: string;
  timeFormat: string;
  dateFormat: string;
  theme?: string;
  notifications: NotificationPreferences;
}

export interface NotificationPreferences {
  email: boolean;
  push: boolean;
  sms: boolean;
  quietHours?: { start: string; end: string };
}

export interface Habit {
  name: string;
  pattern: string;
  frequency: 'daily' | 'weekly' | 'monthly';
  confidence: number;
  lastObserved: Date;
}

export interface CommunicationStyle {
  averageMessageLength: number;
  questionFrequency: number;
  emojiUsage: number;
  formality: number;
  preferredGreeting: string;
}

export interface UserGoal {
  id: string;
  description: string;
  status: 'active' | 'completed' | 'abandoned';
  progress: number;
  createdAt: Date;
  targetDate?: Date;
  milestones: Milestone[];
}

export interface Milestone {
  id: string;
  description: string;
  completed: boolean;
  completedAt?: Date;
}

export interface LearningRecord {
  topic: string;
  interactions: number;
  corrections: number;
  lastInteraction: Date;
  accuracy: number;
}

export class MemorySystem extends EventEmitter {
  private workingMemory: WorkingMemoryStore;
  private episodicMemory: EpisodicMemoryStore;
  private semanticMemory: SemanticMemoryStore;
  private proceduralMemory: ProceduralMemoryStore;
  private preferenceStore: PreferenceStore;
  private vectorIndex: VectorIndex;
  private cache: MemoryCache;
  private tracer: Tracer;
  private consolidationInterval: NodeJS.Timeout;

  constructor() {
    super();
    this.workingMemory = new WorkingMemoryStore();
    this.episodicMemory = new EpisodicMemoryStore();
    this.semanticMemory = new SemanticMemoryStore();
    this.proceduralMemory = new ProceduralMemoryStore();
    this.preferenceStore = new PreferenceStore();
    this.vectorIndex = new VectorIndex();
    this.cache = new MemoryCache();
    this.tracer = new Tracer('memory-system');
    this.startConsolidation();
  }

  async recall(query: string, embedding: number[], context?: any): Promise<MemoryRetrieval> {
    return this.tracer.trace('recall', async (span) => {
      span.setAttribute('query', query);

      const cacheKey = this.generateCacheKey(query, context);
      const cached = this.cache.get(cacheKey);
      if (cached) {
        return cached;
      }

      const [episodic, semantic, procedural, working] = await Promise.all([
        this.episodicMemory.search(query, embedding, 10),
        this.semanticMemory.search(query, embedding, 10),
        this.proceduralMemory.search(query, embedding, 5),
        this.workingMemory.getRecent(context?.sessionId, 10),
      ]);

      const allMemories = [...episodic, ...semantic, ...procedural, ...working]
        .sort((a, b) => b.importance - a.importance)
        .slice(0, 20);

      const relevanceScores = new Map<string, number>();
      allMemories.forEach((m) => {
        relevanceScores.set(m.id, this.calculateRelevance(m, query, embedding));
      });

      const result: MemoryRetrieval = {
        memories: allMemories,
        totalCount: allMemories.length,
        searchTime: Date.now(),
        relevanceScores,
      };

      this.cache.set(cacheKey, result, 60000);
      return result;
    });
  }

  async remember(content: string, type: MemoryType, metadata: MemoryMetadata): Promise<MemoryItem> {
    const item: MemoryItem = {
      id: this.generateId(),
      type,
      content,
      embedding: await this.generateEmbedding(content),
      metadata,
      importance: this.estimateImportance(content, type),
      accessCount: 0,
      lastAccessed: new Date(),
      createdAt: new Date(),
    };

    switch (type) {
      case 'episodic':
        await this.episodicMemory.store(item);
        break;
      case 'semantic':
        await this.semanticMemory.store(item);
        break;
      case 'procedural':
        await this.proceduralMemory.store(item);
        break;
      case 'preference':
        await this.preferenceStore.storePreference(item);
        break;
      default:
        await this.workingMemory.store(item);
    }

    await this.vectorIndex.index(item);
    this.emit('memoryStored', item);

    return item;
  }

  async forget(memoryId: string, userId?: string): Promise<boolean> {
    const stores = [
      this.episodicMemory,
      this.semanticMemory,
      this.proceduralMemory,
      this.workingMemory,
      this.preferenceStore,
    ];

    for (const store of stores) {
      if (await store.delete(memoryId)) {
        await this.vectorIndex.remove(memoryId);
        this.emit('memoryForgotten', memoryId);
        return true;
      }
    }

    return false;
  }

  async getUserProfile(userId: string): Promise<UserProfile | null> {
    return this.preferenceStore.getUserProfile(userId);
  }

  async updateUserProfile(userId: string, updates: Partial<UserProfile>): Promise<UserProfile> {
    const existing = await this.getUserProfile(userId);
    const updated: UserProfile = {
      ...existing,
      ...updates,
      userId,
      lastUpdated: new Date(),
    } as UserProfile;

    await this.preferenceStore.storeUserProfile(updated);
    return updated;
  }

  async consolidateMemories(sessionId: string): Promise<MemoryConsolidation | null> {
    const recentMemories = await this.episodicMemory.getSessionMemories(sessionId);

    if (recentMemories.length < 5) {
      return null;
    }

    const summary = await this.summarizeMemories(recentMemories);
    const consolidated: MemoryItem = {
      id: this.generateId(),
      type: 'semantic',
      content: summary,
      embedding: await this.generateEmbedding(summary),
      metadata: {
        tags: ['consolidated', sessionId],
        source: 'memory-consolidation',
      },
      importance: 0.7,
      accessCount: 0,
      lastAccessed: new Date(),
      createdAt: new Date(),
    };

    await this.semanticMemory.store(consolidated);

    await Promise.all(recentMemories.map((m) => this.episodicMemory.markConsolidated(m.id)));

    return {
      sourceMemories: recentMemories.map((m) => m.id),
      consolidatedMemory: consolidated,
      reasoning: 'Consolidated episodic memories into semantic knowledge',
      timestamp: new Date(),
    };
  }

  async learnFromInteraction(userId: string, interaction: InteractionRecord): Promise<void> {
    const profile = await this.getUserProfile(userId);

    if (interaction.corrected) {
      const learningRecord = profile?.learningHistory.find((l) => l.topic === interaction.topic);

      if (learningRecord) {
        learningRecord.corrections++;
        learningRecord.accuracy =
          (learningRecord.accuracy * (learningRecord.interactions - 1) + 0.5) /
          learningRecord.interactions;
      } else {
        profile?.learningHistory.push({
          topic: interaction.topic,
          interactions: 1,
          corrections: 1,
          lastInteraction: new Date(),
          accuracy: 0.5,
        });
      }
    }

    if (interaction.preference) {
      await this.preferenceStore.storePreference({
        id: this.generateId(),
        type: 'preference',
        content: interaction.preference,
        embedding: await this.generateEmbedding(interaction.preference),
        metadata: {
          tags: ['preference', userId],
          source: 'interaction',
          userId,
        },
        importance: 0.8,
        accessCount: 0,
        lastAccessed: new Date(),
        createdAt: new Date(),
      });
    }

    if (profile) {
      await this.updateUserProfile(userId, profile);
    }
  }

  private startConsolidation(): void {
    this.consolidationInterval = setInterval(async () => {
      const sessions = await this.workingMemory.getActiveSessions();
      for (const sessionId of sessions) {
        await this.consolidateMemories(sessionId);
      }
    }, 3600000);
  }

  private async generateEmbedding(text: string): Promise<number[]> {
    return [];
  }

  private estimateImportance(content: string, type: MemoryType): number {
    let importance = 0.5;

    const importantPatterns = [
      /\b(important|crucial|essential|critical)\b/i,
      /\b(remember|never forget|always)\b/i,
      /\b(preference|hate|love|like)\b/i,
    ];

    for (const pattern of importantPatterns) {
      if (pattern.test(content)) {
        importance += 0.1;
      }
    }

    if (type === 'preference') {
      importance += 0.2;
    }
    if (type === 'procedural') {
      importance += 0.1;
    }

    return Math.min(importance, 1);
  }

  private calculateRelevance(memory: MemoryItem, query: string, embedding: number[]): number {
    const textSimilarity =
      1 -
      this.levenshteinDistance(memory.content.toLowerCase(), query.toLowerCase()) /
        Math.max(memory.content.length, query.length);

    const vectorSimilarity = this.cosineSimilarity(memory.embedding, embedding);

    return textSimilarity * 0.3 + vectorSimilarity * 0.7;
  }

  private cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length || a.length === 0) return 0;

    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }

    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  }

  private levenshteinDistance(a: string, b: string): number {
    if (a.length === 0) return b.length;
    if (b.length === 0) return a.length;

    const matrix: number[][] = [];

    for (let i = 0; i <= b.length; i++) {
      matrix[i] = [i];
    }

    for (let j = 0; j <= a.length; j++) {
      matrix[0][j] = j;
    }

    for (let i = 1; i <= b.length; i++) {
      for (let j = 1; j <= a.length; j++) {
        if (b.charAt(i - 1) === a.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          );
        }
      }
    }

    return matrix[b.length][a.length];
  }

  private generateCacheKey(query: string, context?: any): string {
    const hash = require('crypto')
      .createHash('sha256')
      .update(query + JSON.stringify(context))
      .digest('hex');
    return hash;
  }

  private generateId(): string {
    return `mem_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
  }

  private async summarizeMemories(memories: MemoryItem[]): Promise<string> {
    return memories.map((m) => m.content).join('\n\n');
  }
}

class WorkingMemoryStore {
  private store: Map<string, MemoryItem[]>;

  constructor() {
    this.store = new Map();
  }

  async store(item: MemoryItem): Promise<void> {
    const session = this.store.get(item.metadata.sessionId || 'default') || [];
    session.unshift(item);
    if (session.length > 100) {
      session.pop();
    }
    this.store.set(item.metadata.sessionId || 'default', session);
  }

  async getRecent(sessionId: string, limit: number): Promise<MemoryItem[]> {
    return (this.store.get(sessionId) || []).slice(0, limit);
  }

  async getSessionMemories(sessionId: string): Promise<MemoryItem[]> {
    return this.store.get(sessionId) || [];
  }

  async getActiveSessions(): Promise<string[]> {
    return Array.from(this.store.keys());
  }

  async delete(id: string): Promise<boolean> {
    for (const [sessionId, memories] of this.store.entries()) {
      const index = memories.findIndex((m) => m.id === id);
      if (index !== -1) {
        memories.splice(index, 1);
        return true;
      }
    }
    return false;
  }
}

class EpisodicMemoryStore {
  private store: Map<string, MemoryItem>;

  constructor() {
    this.store = new Map();
  }

  async store(item: MemoryItem): Promise<void> {
    this.store.set(item.id, { ...item, type: 'episodic' });
  }

  async search(query: string, embedding: number[], limit: number): Promise<MemoryItem[]> {
    return Array.from(this.store.values())
      .filter((m) => m.type === 'episodic')
      .slice(0, limit);
  }

  async getSessionMemories(sessionId: string): Promise<MemoryItem[]> {
    return Array.from(this.store.values()).filter((m) => m.metadata.sessionId === sessionId);
  }

  async markConsolidated(id: string): Promise<void> {
    const item = this.store.get(id);
    if (item) {
      item.metadata.tags.push('consolidated');
    }
  }

  async delete(id: string): Promise<boolean> {
    return this.store.delete(id);
  }
}

class SemanticMemoryStore {
  private store: Map<string, MemoryItem>;

  constructor() {
    this.store = new Map();
  }

  async store(item: MemoryItem): Promise<void> {
    this.store.set(item.id, { ...item, type: 'semantic' });
  }

  async search(query: string, embedding: number[], limit: number): Promise<MemoryItem[]> {
    return Array.from(this.store.values())
      .filter((m) => m.type === 'semantic')
      .slice(0, limit);
  }

  async delete(id: string): Promise<boolean> {
    return this.store.delete(id);
  }
}

class ProceduralMemoryStore {
  private store: Map<string, MemoryItem>;

  constructor() {
    this.store = new Map();
  }

  async store(item: MemoryItem): Promise<void> {
    this.store.set(item.id, { ...item, type: 'procedural' });
  }

  async search(query: string, embedding: number[], limit: number): Promise<MemoryItem[]> {
    return Array.from(this.store.values())
      .filter((m) => m.type === 'procedural')
      .slice(0, limit);
  }

  async delete(id: string): Promise<boolean> {
    return this.store.delete(id);
  }
}

class PreferenceStore {
  private profiles: Map<string, UserProfile>;
  private preferences: Map<string, MemoryItem>;

  constructor() {
    this.profiles = new Map();
    this.preferences = new Map();
  }

  async storePreference(item: MemoryItem): Promise<void> {
    this.preferences.set(item.id, item);
  }

  async storeUserProfile(profile: UserProfile): Promise<void> {
    this.profiles.set(profile.userId, profile);
  }

  async getUserProfile(userId: string): Promise<UserProfile | null> {
    return this.profiles.get(userId) || null;
  }

  async delete(id: string): Promise<boolean> {
    return this.preferences.delete(id);
  }
}

class VectorIndex {
  private index: Map<string, number[]>;

  constructor() {
    this.index = new Map();
  }

  async index(item: MemoryItem): Promise<void> {
    this.index.set(item.id, item.embedding);
  }

  async remove(id: string): Promise<void> {
    this.index.delete(id);
  }

  async search(embedding: number[], limit: number): Promise<string[]> {
    const results = Array.from(this.index.entries())
      .map(([id, vec]) => ({
        id,
        similarity: this.cosineSimilarity(vec, embedding),
      }))
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, limit)
      .map((r) => r.id);

    return results;
  }

  private cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length || a.length === 0) return 0;

    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }

    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  }
}

class MemoryCache {
  private cache: Map<string, { data: any; expiry: number }>;

  constructor() {
    this.cache = new Map();
  }

  get(key: string): any {
    const item = this.cache.get(key);
    if (item && Date.now() < item.expiry) {
      return item.data;
    }
    this.cache.delete(key);
    return undefined;
  }

  set(key: string, data: any, ttlMs: number): void {
    this.cache.set(key, {
      data,
      expiry: Date.now() + ttlMs,
    });
  }
}

interface InteractionRecord {
  topic: string;
  corrected?: boolean;
  preference?: string;
  timestamp: Date;
}

export { MemorySystem };
