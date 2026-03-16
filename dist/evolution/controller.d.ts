import { PromptMutationEngine, PromptVariant } from './prompt-mutation.js';
import { SkillBreeder, BredSkill } from './skill-breeding.js';
import { GoldenBenchmark, BenchmarkSuite } from './benchmark.js';
export interface EvolutionConfig {
    promptConfig?: Partial<import('./prompt-mutation.js').PromptMutationConfig>;
    geneticConfig?: Partial<import('./skill-breeding.js').GeneticConfig>;
    autoSave?: boolean;
    savePath?: string;
}
export interface EvolutionResult {
    type: 'prompt' | 'skill';
    generation: number;
    bestVariant?: PromptVariant;
    bestSkill?: BredSkill;
    allScores: Map<string, number>;
}
export declare class EvolutionController {
    private promptEngine;
    private skillBreeder;
    private benchmark;
    private config;
    private isRunning;
    constructor(config?: EvolutionConfig);
    evolvePrompts(initialPrompt: string, generations?: number, executor?: (prompt: string, input: string) => Promise<string>): Promise<EvolutionResult>;
    breedSkills(skillA: string, skillB: string, benchmark?: (skill: import('../skills/loader.js').Skill) => Promise<number>): Promise<BredSkill | null>;
    registerBenchmarkSuite(suite: BenchmarkSuite): void;
    registerSkillForBreeding(skill: import('../skills/loader.js').Skill): void;
    getBenchmark(): GoldenBenchmark;
    getPromptEngine(): PromptMutationEngine;
    getSkillBreeder(): SkillBreeder;
    runOvernight(initialPrompt: string, executor: (prompt: string, input: string) => Promise<string>, onGeneration?: (gen: number, best: PromptVariant) => void): Promise<PromptVariant>;
    stop(): void;
    getHistory(): PromptVariant[];
}
export declare const evolutionController: EvolutionController;
//# sourceMappingURL=controller.d.ts.map