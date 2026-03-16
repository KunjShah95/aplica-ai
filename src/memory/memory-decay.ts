import { db } from '../db/index.js';

export interface MemoryWithDecay {
  id: string;
  content: string;
  importance: number;
  decayRate: number;
  lastAccessed: Date;
  nextRecall: Date;
  accessCount: number;
  stability: number;
}

export interface DecayConfig {
  initialStability: number;
  minStability: number;
  maxStability: number;
  stabilityIncrement: number;
  decayBase: number;
  intervalMultiplier: number;
}

export class MemoryDecay {
  private config: DecayConfig;
  private decayTimers: Map<string, NodeJS.Timeout> = new Map();

  constructor(config?: Partial<DecayConfig>) {
    this.config = {
      initialStability: 0.3,
      minStability: 0.1,
      maxStability: 2.5,
      stabilityIncrement: 0.2,
      decayBase: 0.9,
      intervalMultiplier: 24 * 60 * 60 * 1000,
      ...config,
    };
  }

  calculateStability(accessCount: number, daysSinceLastAccess: number): number {
    const stability = this.config.initialStability + accessCount * this.config.stabilityIncrement;

    const decayedStability = Math.max(
      this.config.minStability,
      stability * Math.pow(this.config.decayBase, daysSinceLastAccess)
    );

    return Math.min(this.config.maxStability, decayedStability);
  }

  calculateRecallProbability(stability: number): number {
    return 1 - Math.exp(-stability);
  }

  calculateNextRecall(stability: number): Date {
    const interval = this.config.intervalMultiplier * Math.pow(2, stability - 1);
    return new Date(Date.now() + interval);
  }

  async processDecay(userId: string): Promise<{
    reinforced: string[];
    decayed: string[];
    forgotten: string[];
  }> {
    const memories = await db.memory.findMany({
      where: {
        userId,
        expiresAt: null,
      },
    });

    const reinforced: string[] = [];
    const decayed: string[] = [];
    const forgotten: string[] = [];

    const now = new Date();

    for (const memory of memories) {
      const lastAccessed = memory.lastAccessedAt || memory.createdAt;
      const daysSinceAccess = Math.floor(
        (now.getTime() - lastAccessed.getTime()) / (1000 * 60 * 60 * 24)
      );

      const importance = typeof memory.importance === 'number' ? memory.importance : 0.5;
      const accessCount = memory.accessCount || 1;

      const stability = this.calculateStability(accessCount, daysSinceAccess);
      const recallProbability = this.calculateRecallProbability(stability);

      if (recallProbability > 0.7) {
        reinforced.push(memory.id);
        await this.reinforceMemory(memory.id);
      } else if (recallProbability < 0.3) {
        decayed.push(memory.id);
        await this.decayMemory(memory.id, stability * 0.9);
      }

      if (stability < this.config.minStability && daysSinceAccess > 30) {
        forgotten.push(memory.id);
        await this.scheduleForDeletion(memory.id);
      }
    }

    return { reinforced, decayed, forgotten };
  }

  private async reinforceMemory(memoryId: string): Promise<void> {
    const memory = await db.memory.findUnique({ where: { id: memoryId } });
    if (!memory) return;

    const newImportance = Math.min(1, (memory.importance || 0.5) + 0.1);
    const nextRecall = this.calculateNextRecall(newImportance * 2);

    await db.memory.update({
      where: { id: memoryId },
      data: {
        importance: newImportance,
        lastAccessedAt: new Date(),
        accessCount: { increment: 1 },
        expiresAt: nextRecall,
      },
    });
  }

  private async decayMemory(memoryId: string, newStability: number): Promise<void> {
    const memory = await db.memory.findUnique({ where: { id: memoryId } });
    if (!memory) return;

    const newImportance = Math.max(0.1, (memory.importance || 0.5) * 0.9);

    await db.memory.update({
      where: { id: memoryId },
      data: {
        importance: newImportance,
      },
    });
  }

  private async scheduleForDeletion(memoryId: string): Promise<void> {
    const deleteAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    await db.memory.update({
      where: { id: memoryId },
      data: {
        expiresAt: deleteAt,
      },
    });

    const timer = setTimeout(
      async () => {
        await db.memory.delete({ where: { id: memoryId } }).catch(() => {});
        this.decayTimers.delete(memoryId);
      },
      7 * 24 * 60 * 60 * 1000
    );

    this.decayTimers.set(memoryId, timer);
  }

  async onMemoryAccess(memoryId: string): Promise<void> {
    await this.reinforceMemory(memoryId);
  }

  getUncertaintyScore(memoryId: string): number {
    return Math.random() * 0.5;
  }

  async cleanupExpired(): Promise<number> {
    const result = await db.memory.deleteMany({
      where: {
        expiresAt: {
          lte: new Date(),
        },
      },
    });

    return result.count;
  }
}

export const memoryDecay = new MemoryDecay();

export class UncertaintyTracker {
  private memoryUncertainty: Map<string, number> = new Map();

  async assessMemory(memoryId: string): Promise<{
    certainty: number;
    recommendation: 'reinforce' | 'maintain' | 'discard';
  }> {
    const memory = await db.memory.findUnique({ where: { id: memoryId } });
    if (!memory) {
      return { certainty: 0, recommendation: 'discard' };
    }

    const lastAccessed = memory.lastAccessedAt || memory.createdAt;
    const daysSinceAccess = Math.floor(
      (Date.now() - lastAccessed.getTime()) / (1000 * 60 * 60 * 24)
    );
    const accessCount = memory.accessCount || 1;
    const importance = memory.importance || 0.5;

    const stability = memoryDecay.calculateStability(accessCount, daysSinceAccess);
    const certainty = Math.min(1, stability * importance);

    let recommendation: 'reinforce' | 'maintain' | 'discard';
    if (certainty > 0.7) {
      recommendation = 'reinforce';
    } else if (certainty > 0.3) {
      recommendation = 'maintain';
    } else {
      recommendation = 'discard';
    }

    this.memoryUncertainty.set(memoryId, 1 - certainty);

    return { certainty, recommendation };
  }

  getMostUncertain(userId: string): Promise<string[]> {
    return Promise.resolve([]);
  }
}

export const uncertaintyTracker = new UncertaintyTracker();
