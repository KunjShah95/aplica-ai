import { randomUUID } from 'crypto';
const DEFAULT_GENETIC_CONFIG = {
    populationSize: 10,
    eliteCount: 2,
    mutationRate: 0.2,
    crossoverRate: 0.5,
    maxGenerations: 20,
    benchmarkThreshold: 0.8,
};
export class SkillBreeder {
    config;
    population = [];
    generation = 0;
    skillLibrary = new Map();
    constructor(config = {}) {
        this.config = { ...DEFAULT_GENETIC_CONFIG, ...config };
    }
    registerSkill(skill) {
        const genome = this.extractGenome(skill);
        this.skillLibrary.set(skill.manifest.name, skill);
        this.population.push(genome);
    }
    extractGenome(skill) {
        const genes = [];
        for (const trigger of skill.manifest.triggers) {
            genes.push({
                id: randomUUID(),
                type: 'trigger',
                value: `${trigger.type}:${trigger.value}`,
                weight: 1,
            });
        }
        for (const param of skill.manifest.parameters) {
            genes.push({
                id: randomUUID(),
                type: 'parameter',
                value: {
                    name: param.name,
                    type: param.type,
                    required: param.required,
                },
                weight: param.required ? 2 : 0.5,
            });
        }
        genes.push({
            id: randomUUID(),
            type: 'behavior',
            value: skill.manifest.name,
            weight: 1.5,
        });
        for (const perm of skill.manifest.permissions) {
            genes.push({
                id: randomUUID(),
                type: 'constraint',
                value: perm,
                weight: 1,
            });
        }
        return {
            skillId: skill.manifest.name,
            genes,
            fitness: 0,
        };
    }
    async breed(skillA, skillB, benchmark) {
        const parentA = this.skillLibrary.get(skillA);
        const parentB = this.skillLibrary.get(skillB);
        if (!parentA || !parentB) {
            throw new Error(`Parent skills not found: ${skillA}, ${skillB}`);
        }
        const hybridGenome = this.crossover(this.extractGenome(parentA), this.extractGenome(parentB));
        let bestFitness = 0;
        let bestSkill = null;
        for (let gen = 0; gen < this.config.maxGenerations; gen++) {
            this.generation = gen;
            const mutatedGenome = this.mutate(hybridGenome);
            const bredSkill = this.synthesizeSkill(parentA, parentB, mutatedGenome);
            const fitness = await benchmark(bredSkill);
            if (fitness > bestFitness) {
                bestFitness = fitness;
                bestSkill = {
                    ...bredSkill,
                    fitness,
                    generation: gen,
                };
            }
            if (fitness >= this.config.benchmarkThreshold) {
                break;
            }
        }
        return bestSkill;
    }
    crossover(parentA, parentB) {
        const childGenes = [];
        const usedTypes = new Set();
        const allGenes = [...parentA.genes, ...parentB.genes];
        for (const gene of allGenes) {
            if (!usedTypes.has(gene.type)) {
                if (Math.random() < this.config.crossoverRate) {
                    childGenes.push({
                        ...gene,
                        id: randomUUID(),
                    });
                    usedTypes.add(gene.type);
                }
            }
        }
        for (const gene of allGenes) {
            if (!childGenes.some((g) => g.type === gene.type)) {
                childGenes.push({
                    ...gene,
                    id: randomUUID(),
                });
            }
        }
        return {
            skillId: `${parentA.skillId}-${parentB.skillId}-hybrid`,
            genes: childGenes,
            fitness: 0,
        };
    }
    mutate(genome) {
        const newGenes = genome.genes.map((gene) => {
            if (Math.random() < this.config.mutationRate) {
                return {
                    ...gene,
                    id: randomUUID(),
                    weight: Math.max(0.1, gene.weight + (Math.random() - 0.5) * 0.5),
                };
            }
            return gene;
        });
        if (Math.random() < this.config.mutationRate * 0.5) {
            newGenes.push({
                id: randomUUID(),
                type: 'behavior',
                value: 'adapted-behavior',
                weight: Math.random(),
            });
        }
        return {
            ...genome,
            genes: newGenes,
        };
    }
    synthesizeSkill(parentA, parentB, genome) {
        const triggers = genome.genes
            .filter((g) => g.type === 'trigger')
            .map((g) => {
            const [type, value] = String(g.value).split(':');
            return { type: type, value };
        });
        const parameters = genome.genes
            .filter((g) => g.type === 'parameter')
            .map((g) => {
            const param = g.value;
            return {
                name: param.name,
                type: param.type,
                required: param.required,
                description: `Synthesized parameter from ${parentA.manifest.name} x ${parentB.manifest.name}`,
            };
        });
        const permissions = Array.from(new Set([...parentA.manifest.permissions, ...parentB.manifest.permissions]));
        const hybridExecute = async (context) => {
            const resultA = await parentA.execute(context);
            const resultB = await parentB.execute(context);
            if (resultA.success && resultB.success) {
                return {
                    success: true,
                    output: `Hybrid result: ${resultA.output} | ${resultB.output}`,
                    data: { parentA: resultA.data, parentB: resultB.data },
                };
            }
            return resultA.success ? resultA : resultB;
        };
        return {
            id: randomUUID(),
            manifest: {
                name: `${parentA.manifest.name}-${parentB.manifest.name}-hybrid`,
                version: '1.0.0',
                description: `Hybrid skill combining ${parentA.manifest.name} and ${parentB.manifest.name}`,
                triggers,
                parameters,
                permissions,
                examples: [...parentA.manifest.examples, ...parentB.manifest.examples].slice(0, 5),
            },
            execute: hybridExecute,
            parentIds: [parentA.manifest.name, parentB.manifest.name],
            generation: 0,
            fitness: 0,
        };
    }
    getPopulation() {
        return this.population;
    }
    getGeneration() {
        return this.generation;
    }
}
//# sourceMappingURL=skill-breeding.js.map