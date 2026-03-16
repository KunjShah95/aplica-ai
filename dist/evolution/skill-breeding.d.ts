import { Skill, SkillManifest, SkillExecutionContext, SkillResult } from '../skills/loader.js';
export interface SkillGenome {
    skillId: string;
    genes: SkillGene[];
    fitness: number;
}
export interface SkillGene {
    id: string;
    type: 'trigger' | 'parameter' | 'behavior' | 'constraint';
    value: string | Record<string, unknown>;
    weight: number;
}
export interface BredSkill {
    id: string;
    manifest: SkillManifest;
    execute: (context: SkillExecutionContext) => Promise<SkillResult>;
    parentIds: [string, string];
    generation: number;
    fitness: number;
}
export interface GeneticConfig {
    populationSize: number;
    eliteCount: number;
    mutationRate: number;
    crossoverRate: number;
    maxGenerations: number;
    benchmarkThreshold: number;
}
export declare class SkillBreeder {
    private config;
    private population;
    private generation;
    private skillLibrary;
    constructor(config?: Partial<GeneticConfig>);
    registerSkill(skill: Skill): void;
    private extractGenome;
    breed(skillA: string, skillB: string, benchmark: (skill: Skill) => Promise<number>): Promise<BredSkill | null>;
    private crossover;
    private mutate;
    private synthesizeSkill;
    getPopulation(): SkillGenome[];
    getGeneration(): number;
}
//# sourceMappingURL=skill-breeding.d.ts.map