import { Agent } from '../../core/agent.js';
import { AgentOptions } from '../../core/agent.js';
/**
 * Federated Memory Agent - Privacy-preserving memory sync across devices
 */
export declare class FederatedMemoryAgent extends Agent {
    private localMemories;
    private syncedMemories;
    private differentialPrivacyEpsilon;
    private memoryUpdates;
    private syncHistory;
    constructor(options: AgentOptions);
    /**
     * Save a memory locally
     */
    saveMemory(memory: Omit<MemoryItem, 'id' | 'timestamp'>): MemoryItem;
    /**
     * Retrieve memories
     */
    getMemories(filter?: {
        category?: string;
        userId?: string;
        limit?: number;
    }): MemoryItem[];
    /**
     * Apply differential privacy noise
     */
    private applyPrivacyNoise;
    /**
     * Get local memory state (without sensitive data)
     */
    getLocalState(): MemoryState;
    /**
     * Sync memories with differential privacy
     */
    syncMemories(deviceId: string): Promise<SyncResult>;
    /**
     * Prepare update batch
     */
    private prepareUpdateBatch;
    /**
     * Generate hash for memory deduplication
     */
    private generateHash;
    /**
     * Aggregate states from multiple devices
     */
    private aggregateStates;
    /**
     * Get sync history
     */
    getSyncHistory(): SyncRecord[];
    /**
     * Get privacy settings
     */
    getPrivacySettings(): {
        epsilon: number;
        maxRetries: number;
        batchLimit: number;
    };
    /**
     * Update privacy settings
     */
    updatePrivacySettings(settings: Partial<{
        epsilon: number;
        batchLimit: number;
    }>): void;
    /**
     * Delete memory
     */
    deleteMemory(id: string): boolean;
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
export declare function createFederatedMemoryAgent(options: AgentOptions): FederatedMemoryAgent;
//# sourceMappingURL=federated-memory-agent.d.ts.map