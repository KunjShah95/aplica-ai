import { randomUUID } from 'crypto';
const DEFAULT_CONFIG = {
    populationSize: 20,
    eliteCount: 2,
    mutationRate: 0.3,
    crossoverRate: 0.6,
    maxGenerations: 50,
    maxPromptLength: 8000,
};
export class PromptMutationEngine {
    config;
    population = [];
    generation = 0;
    history = [];
    constructor(config = {}) {
        this.config = { ...DEFAULT_CONFIG, ...config };
    }
    initialize(prompt) {
        const genes = this.tokenize(prompt);
        const initialVariant = {
            id: randomUUID(),
            genes,
            fullPrompt: prompt,
            fitness: 0,
            generation: 0,
            parentIds: [],
            operators: [],
        };
        this.population = [initialVariant];
        this.history = [initialVariant];
        this.generation = 0;
        for (let i = 1; i < this.config.populationSize; i++) {
            this.population.push(this.mutate(initialVariant, ['substitution']));
        }
    }
    tokenize(prompt) {
        const genes = [];
        const segments = prompt.split(/(?:\n\n|\n(?=-?\s)|(?<=\.)\s+(?=[A-Z]))/g);
        let currentType = 'instruction';
        for (const segment of segments) {
            const trimmed = segment.trim();
            if (!trimmed)
                continue;
            if (trimmed.startsWith('You are') || trimmed.includes('role')) {
                currentType = 'role';
            }
            else if (trimmed.includes('example') ||
                trimmed.includes('e.g.,') ||
                trimmed.includes('```')) {
                currentType = 'example';
            }
            else if (trimmed.includes('must') ||
                trimmed.includes('never') ||
                trimmed.includes('always')) {
                currentType = 'constraint';
            }
            else if (trimmed.includes('context') || trimmed.includes('given')) {
                currentType = 'context';
            }
            genes.push({
                id: randomUUID(),
                segment: trimmed,
                type: currentType,
            });
        }
        return genes;
    }
    assemblePrompt(genes) {
        const prompt = genes.map((g) => g.segment).join('\n\n');
        return prompt.slice(0, this.config.maxPromptLength);
    }
    evolve(scores) {
        for (const variant of this.population) {
            variant.fitness = scores.get(variant.id) || 0;
        }
        this.population.sort((a, b) => b.fitness - a.fitness);
        this.history.push(...this.population);
        const elites = this.population.slice(0, this.config.eliteCount);
        const newPopulation = [...elites];
        while (newPopulation.length < this.config.populationSize) {
            const parent = this.selectParent();
            const child = this.mutate(parent, [this.randomOperator()]);
            newPopulation.push(child);
        }
        this.population = newPopulation;
        this.generation++;
        return this.getElites();
    }
    selectParent() {
        const tournamentSize = 3;
        const tournament = [];
        for (let i = 0; i < tournamentSize; i++) {
            const idx = Math.floor(Math.random() * this.population.length);
            tournament.push(this.population[idx]);
        }
        tournament.sort((a, b) => b.fitness - a.fitness);
        return tournament[0];
    }
    randomOperator() {
        const operators = ['crossover', 'insertion', 'deletion', 'substitution'];
        const weights = [0.2, 0.25, 0.25, 0.3];
        const rand = Math.random();
        let cumulative = 0;
        for (let i = 0; i < operators.length; i++) {
            cumulative += weights[i];
            if (rand < cumulative)
                return operators[i];
        }
        return 'substitution';
    }
    crossover(parentA, parentB) {
        const childGenes = [];
        const usedIndices = new Set();
        const maxLen = Math.max(parentA.genes.length, parentB.genes.length);
        for (let i = 0; i < maxLen; i++) {
            const source = Math.random() < 0.5 ? parentA : parentB;
            const sourceIdx = i < source.genes.length ? i : source.genes.length - 1;
            if (!usedIndices.has(sourceIdx) || source.genes.length < maxLen / 2) {
                childGenes.push({
                    ...source.genes[sourceIdx],
                    id: randomUUID(),
                });
                usedIndices.add(sourceIdx);
            }
        }
        return {
            id: randomUUID(),
            genes: childGenes,
            fullPrompt: this.assemblePrompt(childGenes),
            fitness: 0,
            generation: this.generation,
            parentIds: [parentA.id, parentB.id],
            operators: ['crossover'],
        };
    }
    mutate(variant, operators) {
        const newGenes = [...variant.genes];
        for (const op of operators) {
            if (Math.random() > this.config.mutationRate)
                continue;
            switch (op) {
                case 'crossover':
                    if (this.population.length > 1) {
                        const otherParent = this.selectParent();
                        if (otherParent.id !== variant.id) {
                            return this.crossover(variant, otherParent);
                        }
                    }
                    break;
                case 'insertion':
                    newGenes.splice(Math.floor(Math.random() * (newGenes.length + 1)), 0, this.createRandomGene());
                    break;
                case 'deletion':
                    if (newGenes.length > 2) {
                        newGenes.splice(Math.floor(Math.random() * newGenes.length), 1);
                    }
                    break;
                case 'substitution':
                    const idx = Math.floor(Math.random() * newGenes.length);
                    newGenes[idx] = this.createRandomGene();
                    break;
            }
        }
        return {
            id: randomUUID(),
            genes: newGenes,
            fullPrompt: this.assemblePrompt(newGenes),
            fitness: variant.fitness,
            generation: this.generation,
            parentIds: [variant.id],
            operators,
        };
    }
    createRandomGene() {
        const templates = {
            role: [
                'You are a careful analyst',
                'You are an expert coder',
                'You are a creative problem solver',
            ],
            instruction: [
                'Break down complex tasks into steps',
                'Verify information before responding',
                'Consider multiple perspectives',
            ],
            constraint: [
                'Never make assumptions without evidence',
                'Always cite your sources',
                'Prioritize clarity over complexity',
            ],
            example: [
                'Example: When uncertain, ask for clarification',
                'Example: Start with the simplest solution',
            ],
            context: ['Given the user preferences', 'Based on previous interactions'],
        };
        const type = Object.keys(templates)[Math.floor(Math.random() * Object.keys(templates).length)];
        const template = templates[type][Math.floor(Math.random() * templates[type].length)];
        return {
            id: randomUUID(),
            segment: template,
            type,
        };
    }
    getElites() {
        return this.population.slice(0, this.config.eliteCount);
    }
    getPopulation() {
        return this.population;
    }
    getBest() {
        return this.population[0] || null;
    }
    getGeneration() {
        return this.generation;
    }
    isConverged() {
        if (this.generation >= this.config.maxGenerations)
            return true;
        if (this.population.length < 2)
            return true;
        const fitnesses = this.population.map((v) => v.fitness);
        const max = Math.max(...fitnesses);
        const min = Math.min(...fitnesses);
        return max - min < 0.01;
    }
    getHistory() {
        return this.history;
    }
}
//# sourceMappingURL=prompt-mutation.js.map