export interface PromptGene {
    id: string;
    segment: string;
    type: 'role' | 'instruction' | 'constraint' | 'example' | 'context';
    fitness?: number;
}
export interface PromptVariant {
    id: string;
    genes: PromptGene[];
    fullPrompt: string;
    fitness: number;
    generation: number;
    parentIds: string[];
    operators: string[];
}
export type MutationOperator = 'crossover' | 'insertion' | 'deletion' | 'substitution';
export interface PromptMutationConfig {
    populationSize: number;
    eliteCount: number;
    mutationRate: number;
    crossoverRate: number;
    maxGenerations: number;
    maxPromptLength: number;
}
export declare class PromptMutationEngine {
    private config;
    private population;
    private generation;
    private history;
    constructor(config?: Partial<PromptMutationConfig>);
    initialize(prompt: string): void;
    private tokenize;
    private assemblePrompt;
    evolve(scores: Map<string, number>): PromptVariant[];
    private selectParent;
    private randomOperator;
    crossover(parentA: PromptVariant, parentB: PromptVariant): PromptVariant;
    mutate(variant: PromptVariant, operators: MutationOperator[]): PromptVariant;
    private createRandomGene;
    getElites(): PromptVariant[];
    getPopulation(): PromptVariant[];
    getBest(): PromptVariant | null;
    getGeneration(): number;
    isConverged(): boolean;
    getHistory(): PromptVariant[];
}
//# sourceMappingURL=prompt-mutation.d.ts.map