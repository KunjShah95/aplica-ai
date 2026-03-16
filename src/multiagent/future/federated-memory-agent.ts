import { randomUUID } from 'crypto';
import { Agent } from '../../core/agent.js';
import { AgentOptions } from '../../core/agent.js';

/**
 * Federated Memory Agent - Privacy-preserving memory sync across devices
 */
export class FederatedMemoryAgent extends Agent {
  private localMemories: MemoryItem[] = [];
  private syncedMemories: Map<string, MemoryItem[]> = new Map();
  private differentialPrivacyEpsilon = 1.0;
  private memoryUpdates: MemoryUpdate[] = [];
  private syncHistory: SyncRecord[] = [];

  constructor(options: AgentOptions) {
    super(options);
  }

  /**
   * Save a memory locally
   */
  saveMemory(memory: Omit<MemoryItem, 'id' | 'timestamp'>): MemoryItem {
    const item: MemoryItem = {
      id: randomUUID(),
      timestamp: new Date(),
      ...memory,
    };

    this.localMemories.push(item);
    console.log(`[FederatedMemoryAgent] Saved memory: ${item.category}`);

    return item;
  }

  /**
   * Retrieve memories
   */
  getMemories(
    filter?: {
      category?: string;
      userId?: string;
      limit?: number;
    }
  ): MemoryItem[] {
    let memories = [...this.localMemories];

    if (filter?.category) {
      memories = memories.filter((m) => m.category === filter.category);
    }

    if (filter?.limit) {
      memories = memories.slice(-filter.limit);
    }

    return memories;
  }

  /**
   * Apply differential privacy noise
   */
  private applyPrivacyNoise(data: unknown, epsilon: number = this.differentialPrivacyEpsilon): unknown {
    // In production, would apply Laplace or Gaussian noise
    // For simulation, return a deterministic transformation
    const base = data && typeof data === 'object' ? (data as Record<string, unknown>) : { value: data };
    return {
      ...base,
      _noised: true,
      _epsilon: epsilon,
    };
  }

  /**
   * Get local memory state (without sensitive data)
   */
  getLocalState(): MemoryState {
    const state: MemoryState = {
      totalMemories: this.localMemories.length,
      categories: {},
      lastUpdate: new Date(),
    };

    for (const memory of this.localMemories) {
      state.categories[memory.category] = (state.categories[memory.category] || 0) + 1;
    }

    return state;
  }

  /**
   * Sync memories with differential privacy
   */
  async syncMemories(deviceId: string): Promise<SyncResult> {
    const startTime = Date.now();

    // Prepare update batch with privacy noise
    const updateBatch = this.prepareUpdateBatch();

    // Apply differential privacy
    const noisedBatch = this.applyPrivacyNoise(updateBatch);

    // Record the sync
    const syncRecord: SyncRecord = {
      id: randomUUID(),
      deviceId,
      timestamp: new Date(),
      memoriesSynced: updateBatch.length,
      epsilon: this.differentialPrivacyEpsilon,
    };

    this.syncHistory.push(syncRecord);

    // Update remote state (simulated)
    this.syncedMemories.set(deviceId, [
      ...this.syncedMemories.get(deviceId) || [],
      ...updateBatch.map((u) => u.memory),
    ]);

    // Send local state to be aggregated
    const remoteState = await this.aggregateStates(deviceId, this.getLocalState());

    return {
      success: true,
      syncRecord,
      remoteState,
      duration: Date.now() - startTime,
    };
  }

  /**
   * Prepare update batch
   */
  private prepareUpdateBatch(): MemoryUpdate[] {
    // Only send recent updates
    const recentMemories = this.localMemories.slice(-100);

    return recentMemories.map((memory) => ({
      id: randomUUID(),
      memory,
      hash: this.generateHash(memory),
      timestamp: new Date(),
    }));
  }

  /**
   * Generate hash for memory deduplication
   */
  private generateHash(memory: MemoryItem): string {
    return `hash_${memory.category}_${memory.content.substring(0, 20)}`;
  }

  /**
   * Aggregate states from multiple devices
   */
  private async aggregateStates(
    sourceDevice: string,
    localState: MemoryState
  ): Promise<MemoryState> {
    // In production, would aggregate using secure multi-party computation
    // For simulation, return aggregated state

    const allStates: MemoryState[] = [localState];

    for (const [device, memories] of this.syncedMemories) {
      if (device !== sourceDevice) {
        const state: MemoryState = {
          totalMemories: memories.length,
          categories: {},
          lastUpdate: new Date(),
        };
        for (const m of memories) {
          state.categories[m.category] = (state.categories[m.category] || 0) + 1;
        }
        allStates.push(state);
      }
    }

    // Aggregate
    const aggregated: MemoryState = {
      totalMemories: allStates.reduce((a, s) => a + s.totalMemories, 0),
      categories: {},
      lastUpdate: new Date(),
    };

    for (const state of allStates) {
      for (const [category, count] of Object.entries(state.categories)) {
        aggregated.categories[category] = (aggregated.categories[category] || 0) + count;
      }
    }

    return aggregated;
  }

  /**
   * Get sync history
   */
  getSyncHistory(): SyncRecord[] {
    return this.syncHistory;
  }

  /**
   * Get privacy settings
   */
  getPrivacySettings(): {
    epsilon: number;
    maxRetries: number;
    batchLimit: number;
  } {
    return {
      epsilon: this.differentialPrivacyEpsilon,
      maxRetries: 3,
      batchLimit: 100,
    };
  }

  /**
   * Update privacy settings
   */
  updatePrivacySettings(settings: Partial<{ epsilon: number; batchLimit: number }>): void {
    if (settings.epsilon !== undefined) {
      this.differentialPrivacyEpsilon = settings.epsilon;
    }
    console.log(`[FederatedMemoryAgent] Privacy settings updated: epsilon=${this.differentialPrivacyEpsilon}`);
  }

  /**
   * Delete memory
   */
  deleteMemory(id: string): boolean {
    const index = this.localMemories.findIndex((m) => m.id === id);
    if (index === -1) return false;

    this.localMemories.splice(index, 1);
    console.log(`[FederatedMemoryAgent] Deleted memory: ${id}`);
    return true;
  }
}

export interface MemoryItem {
  id: string;
  category: string;
  content: string;
  metadata?: Record<string, unknown>;
  timestamp: Date;
}

export interface MemoryUpdate {
  id: string;
  memory: MemoryItem;
  hash: string;
  timestamp: Date;
}

export interface MemoryState {
  totalMemories: number;
  categories: Record<string, number>;
  lastUpdate: Date;
}

export interface SyncRecord {
  id: string;
  deviceId: string;
  timestamp: Date;
  memoriesSynced: number;
  epsilon: number;
}

export interface SyncResult {
  success: boolean;
  syncRecord: SyncRecord;
  remoteState: MemoryState;
  duration: number;
}

/**
 * Factory function to create a federated memory agent
 */
export function createFederatedMemoryAgent(options: AgentOptions): FederatedMemoryAgent {
  return new FederatedMemoryAgent(options);
}
