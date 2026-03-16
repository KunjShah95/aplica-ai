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
export declare class MemoryDecay {
    private config;
    private decayTimers;
    constructor(config?: Partial<DecayConfig>);
    calculateStability(accessCount: number, daysSinceLastAccess: number): number;
    calculateRecallProbability(stability: number): number;
    calculateNextRecall(stability: number): Date;
    processDecay(userId: string): Promise<{
        reinforced: string[];
        decayed: string[];
        forgotten: string[];
    }>;
    private reinforceMemory;
    private decayMemory;
    private scheduleForDeletion;
    onMemoryAccess(memoryId: string): Promise<void>;
    getUncertaintyScore(memoryId: string): number;
    cleanupExpired(): Promise<number>;
}
export declare const memoryDecay: MemoryDecay;
export declare class UncertaintyTracker {
    private memoryUncertainty;
    assessMemory(memoryId: string): Promise<{
        certainty: number;
        recommendation: 'reinforce' | 'maintain' | 'discard';
    }>;
    getMostUncertain(userId: string): Promise<string[]>;
}
export declare const uncertaintyTracker: UncertaintyTracker;
//# sourceMappingURL=memory-decay.d.ts.map