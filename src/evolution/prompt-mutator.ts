import { randomUUID } from 'crypto';
import { skillLoader, Skill, SkillManifest } from '../skills/loader.js';

export interface PromptMutation {
  id: string;
  skillId: string;
  originalPrompt: string;
  mutatedPrompt: string;
  mutationType: 'rephrase' | 'expand' | 'constrain' | 'simplify' | 'example' | 'chain-of-thought';
  successRate: number;
  testCount: number;
  createdAt: Date;
  parentMutationId?: string;
}

export interface MutationConfig {
  mutationRate: number;
  maxMutations: number;
  preserveCore: boolean;
}

const DEFAULT_CONFIG: MutationConfig = {
  mutationRate: 0.15,
  maxMutations: 5,
  preserveCore: true,
};

export class PromptMutator {
  private mutations: Map<string, PromptMutation[]> = new Map();
  private config: MutationConfig;

  constructor(config: Partial<MutationConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  mutate(prompt: string, skillId: string, context?: Record<string, string>): string {
    const mutationTypes: PromptMutation['mutationType'][] = [
      'rephrase',
      'expand',
      'constrain',
      'simplify',
      'example',
      'chain-of-thought',
    ];

    const selectedType = mutationTypes[Math.floor(Math.random() * mutationTypes.length)];
    let mutated = prompt;

    switch (selectedType) {
      case 'rephrase':
        mutated = this.rephrase(prompt);
        break;
      case 'expand':
        mutated = this.expand(prompt, context);
        break;
      case 'constrain':
        mutated = this.constrain(prompt);
        break;
      case 'simplify':
        mutated = this.simplify(prompt);
        break;
      case 'example':
        mutated = this.addExample(prompt);
        break;
      case 'chain-of-thought':
        mutated = this.addChainOfThought(prompt);
        break;
    }

    const mutation: PromptMutation = {
      id: randomUUID(),
      skillId,
      originalPrompt: prompt,
      mutatedPrompt: mutated,
      mutationType: selectedType,
      successRate: 0.5,
      testCount: 0,
      createdAt: new Date(),
    };

    const existing = this.mutations.get(skillId) || [];
    existing.push(mutation);
    this.mutations.set(skillId, existing);

    return mutated;
  }

  private rephrase(prompt: string): string {
    const rephrasings = [
      (p: string) => `Your task is to: ${p.toLowerCase()}`,
      (p: string) => `Please ${p.toLowerCase()}`,
      (p: string) => `Help me to: ${p.toLowerCase()}`,
      (p: string) => `I need you to ${p.toLowerCase()}`,
    ];
    const fn = rephrasings[Math.floor(Math.random() * rephrasings.length)];
    return fn(prompt);
  }

  private expand(prompt: string, context?: Record<string, string>): string {
    const expansions = [
      `Take your time to analyze the request thoroughly. ${prompt}`,
      `Consider all aspects before responding. ${prompt}`,
      prompt + ' Think step by step.',
    ];
    return expansions[Math.floor(Math.random() * expansions.length)];
  }

  private constrain(prompt: string): string {
    const constraints = [
      `Be concise and direct. ${prompt}`,
      `Focus on the most important aspects. ${prompt}`,
      `${prompt} Keep your response brief.`,
    ];
    return constraints[Math.floor(Math.random() * constraints.length)];
  }

  private simplify(prompt: string): string {
    return `In simple terms: ${prompt}`;
  }

  private addExample(prompt: string): string {
    const examples = [
      `For example, if asked to write code, provide working examples. ${prompt}`,
      `${prompt}\n\nExample approach: break down the problem first.`,
    ];
    return examples[Math.floor(Math.random() * examples.length)];
  }

  private addChainOfThought(prompt: string): string {
    return `${prompt}\n\nThink about this step by step before responding.`;
  }

  recordSuccess(mutationId: string): void {
    for (const [skillId, mutations] of this.mutations) {
      const mutation = mutations.find((m) => m.id === mutationId);
      if (mutation) {
        mutation.testCount++;
        mutation.successRate =
          (mutation.successRate * (mutation.testCount - 1) + 1) / mutation.testCount;
        break;
      }
    }
  }

  recordFailure(mutationId: string): void {
    for (const [skillId, mutations] of this.mutations) {
      const mutation = mutations.find((m) => m.id === mutationId);
      if (mutation) {
        mutation.testCount++;
        mutation.successRate =
          (mutation.successRate * (mutation.testCount - 1) + 0) / mutation.testCount;
        break;
      }
    }
  }

  getBestMutation(skillId: string): PromptMutation | null {
    const mutations = this.mutations.get(skillId);
    if (!mutations || mutations.length === 0) return null;

    return mutations.reduce((best, current) =>
      current.successRate > best.successRate ? current : best
    );
  }

  getMutationHistory(skillId: string): PromptMutation[] {
    return this.mutations.get(skillId) || [];
  }
}

export const promptMutator = new PromptMutator();
