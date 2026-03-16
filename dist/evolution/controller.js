import { PromptMutationEngine } from './prompt-mutation.js';
import { SkillBreeder } from './skill-breeding.js';
import { GoldenBenchmark } from './benchmark.js';
export class EvolutionController {
    promptEngine;
    skillBreeder;
    benchmark;
    config;
    isRunning = false;
    constructor(config = {}) {
        this.config = config;
        this.promptEngine = new PromptMutationEngine(config.promptConfig);
        this.skillBreeder = new SkillBreeder(config.geneticConfig);
        this.benchmark = new GoldenBenchmark();
    }
    async evolvePrompts(initialPrompt, generations, executor) {
        this.promptEngine.initialize(initialPrompt);
        let generation = 0;
        const maxGenerations = generations || 50;
        while (generation < maxGenerations && !this.promptEngine.isConverged()) {
            const population = this.promptEngine.getPopulation();
            const variants = population.map((v) => ({
                id: v.id,
                prompt: v.fullPrompt,
            }));
            const scores = await this.benchmark.runFullEvaluation(variants, async (input) => {
                if (executor) {
                    const best = this.promptEngine.getBest();
                    return executor(best?.fullPrompt || initialPrompt, input);
                }
                return 'Benchmark execution not configured';
            });
            this.promptEngine.evolve(scores);
            generation++;
            console.log(`Generation ${generation}: Best score = ${scores.get(this.promptEngine.getBest()?.id || '')}`);
        }
        const bestVariant = this.promptEngine.getBest();
        return {
            type: 'prompt',
            generation,
            bestVariant: bestVariant || undefined,
            allScores: new Map(),
        };
    }
    async breedSkills(skillA, skillB, benchmark) {
        const defaultBenchmark = async () => {
            return Math.random() * 0.5 + 0.5;
        };
        return this.skillBreeder.breed(skillA, skillB, benchmark || defaultBenchmark);
    }
    registerBenchmarkSuite(suite) {
        this.benchmark.registerSuite(suite);
    }
    registerSkillForBreeding(skill) {
        this.skillBreeder.registerSkill(skill);
    }
    getBenchmark() {
        return this.benchmark;
    }
    getPromptEngine() {
        return this.promptEngine;
    }
    getSkillBreeder() {
        return this.skillBreeder;
    }
    async runOvernight(initialPrompt, executor, onGeneration) {
        this.isRunning = true;
        let currentBest = null;
        while (this.isRunning && !this.promptEngine.isConverged()) {
            const result = await this.evolvePrompts(initialPrompt, 1, executor);
            currentBest = result.bestVariant || null;
            if (currentBest && onGeneration) {
                onGeneration(this.promptEngine.getGeneration(), currentBest);
            }
            await new Promise((resolve) => setTimeout(resolve, 100));
        }
        return currentBest || this.promptEngine.getBest();
    }
    stop() {
        this.isRunning = false;
    }
    getHistory() {
        return this.promptEngine.getHistory();
    }
}
export const evolutionController = new EvolutionController();
//# sourceMappingURL=controller.js.map