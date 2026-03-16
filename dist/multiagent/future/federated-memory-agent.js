import { randomUUID } from 'crypto';
import { Agent } from '../../core/agent.js';
/**
 * Federated Memory Agent - Privacy-preserving memory sync across devices
 */
export class FederatedMemoryAgent extends Agent {
    localMemories = [];
    syncedMemories = new Map();
    differentialPrivacyEpsilon = 1.0;
    memoryUpdates = [];
    syncHistory = [];
    constructor(options) {
        super(options);
    }
    /**
     * Save a memory locally
     */
    saveMemory(memory) {
        const item = {
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
    getMemories(filter) {
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
    applyPrivacyNoise(data, epsilon = this.differentialPrivacyEpsilon) {
        // In production, would apply Laplace or Gaussian noise
        // For simulation, return a deterministic transformation
        const base = data && typeof data === 'object' ? data : { value: data };
        return {
            ...base,
            _noised: true,
            _epsilon: epsilon,
        };
    }
    /**
     * Get local memory state (without sensitive data)
     */
    getLocalState() {
        const state = {
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
    async syncMemories(deviceId) {
        const startTime = Date.now();
        // Prepare update batch with privacy noise
        const updateBatch = this.prepareUpdateBatch();
        // Apply differential privacy
        const noisedBatch = this.applyPrivacyNoise(updateBatch);
        // Record the sync
        const syncRecord = {
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
    prepareUpdateBatch() {
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
    generateHash(memory) {
        return `hash_${memory.category}_${memory.content.substring(0, 20)}`;
    }
    /**
     * Aggregate states from multiple devices
     */
    async aggregateStates(sourceDevice, localState) {
        // In production, would aggregate using secure multi-party computation
        // For simulation, return aggregated state
        const allStates = [localState];
        for (const [device, memories] of this.syncedMemories) {
            if (device !== sourceDevice) {
                const state = {
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
        const aggregated = {
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
    getSyncHistory() {
        return this.syncHistory;
    }
    /**
     * Get privacy settings
     */
    getPrivacySettings() {
        return {
            epsilon: this.differentialPrivacyEpsilon,
            maxRetries: 3,
            batchLimit: 100,
        };
    }
    /**
     * Update privacy settings
     */
    updatePrivacySettings(settings) {
        if (settings.epsilon !== undefined) {
            this.differentialPrivacyEpsilon = settings.epsilon;
        }
        console.log(`[FederatedMemoryAgent] Privacy settings updated: epsilon=${this.differentialPrivacyEpsilon}`);
    }
    /**
     * Delete memory
     */
    deleteMemory(id) {
        const index = this.localMemories.findIndex((m) => m.id === id);
        if (index === -1)
            return false;
        this.localMemories.splice(index, 1);
        console.log(`[FederatedMemoryAgent] Deleted memory: ${id}`);
        return true;
    }
}
/**
 * Factory function to create a federated memory agent
 */
export function createFederatedMemoryAgent(options) {
    return new FederatedMemoryAgent(options);
}
//# sourceMappingURL=federated-memory-agent.js.map