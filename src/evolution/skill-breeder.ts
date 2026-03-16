import { randomUUID } from 'crypto';
import {
  skillLoader,
  Skill,
  SkillManifest,
  SkillTrigger,
  SkillParameter,
} from '../skills/loader.js';

export interface SkillVariant {
  id: string;
  skillId: string;
  name: string;
  manifest: SkillManifest;
  goldScore: number;
  lineage: {
    parentIds: string[];
    method: 'crossbreed' | 'mutation' | 'elite' | 'baseline';
  };
  createdAt: Date;
}

export interface BreedingConfig {
  populationSize: number;
  eliteCount: number;
  mutationRate: number;
  crossoverRate: number;
  generations: number;
}

const DEFAULT_BREEDING_CONFIG: BreedingConfig = {
  populationSize: 20,
  eliteCount: 3,
  mutationRate: 0.1,
  crossoverRate: 0.7,
  generations: 10,
};

export class SkillBreeder {
  private variants: Map<string, SkillVariant[]> = new Map();
  private config: BreedingConfig;
  private skillRegistry: Map<string, Skill> = new Map();

  constructor(config: Partial<BreedingConfig> = {}) {
    this.config = { ...DEFAULT_BREEDING_CONFIG, ...config };
    this.loadSkillRegistry();
  }

  private loadSkillRegistry(): void {
    const loader = skillLoader;
    const skills = (loader as any).skills as Map<string, Skill>;
    if (skills) {
      this.skillRegistry = skills;
    }
  }

  async createBaselineVariant(skillId: string, name: string): Promise<SkillVariant> {
    const skill = this.skillRegistry.get(skillId);
    if (!skill) {
      throw new Error(`Skill ${skillId} not found`);
    }

    const variant: SkillVariant = {
      id: randomUUID(),
      skillId,
      name,
      manifest: { ...skill.manifest },
      goldScore: 0,
      lineage: { parentIds: [], method: 'baseline' },
      createdAt: new Date(),
    };

    const variants = this.variants.get(skillId) || [];
    variants.push(variant);
    this.variants.set(skillId, variants);

    return variant;
  }

  async crossbreed(parentId1: string, parentId2: string): Promise<SkillVariant | null> {
    const variant1 = this.findVariant(parentId1);
    const variant2 = this.findVariant(parentId2);

    if (!variant1 || !variant2) {
      return null;
    }

    if (Math.random() > this.config.crossoverRate) {
      return null;
    }

    const childManifest = this.crossoverManifests(variant1.manifest, variant2.manifest);
    const child: SkillVariant = {
      id: randomUUID(),
      skillId: variant1.skillId,
      name: `${variant1.name} x ${variant2.name}`,
      manifest: childManifest,
      goldScore: 0,
      lineage: {
        parentIds: [parentId1, parentId2],
        method: 'crossbreed',
      },
      createdAt: new Date(),
    };

    const variants = this.variants.get(variant1.skillId) || [];
    variants.push(child);
    this.variants.set(variant1.skillId, variants);

    return child;
  }

  private crossoverManifests(m1: SkillManifest, m2: SkillManifest): SkillManifest {
    const choose = <T>(a: T[], b: T[]): T[] =>
      a.map((_, i) => (i < b.length && Math.random() > 0.5 ? a[i] : b[i])).filter(Boolean);

    return {
      name: Math.random() > 0.5 ? m1.name : m2.name,
      version: '1.0.0-evolved',
      description: Math.random() > 0.5 ? m1.description : m2.description,
      author: m1.author || m2.author,
      triggers: choose([...m1.triggers], [...m2.triggers]) as SkillTrigger[],
      parameters: choose([...m1.parameters], [...m2.parameters]) as SkillParameter[],
      permissions: [...new Set([...m1.permissions, ...m2.permissions])],
      examples: choose([...m1.examples], [...m2.examples]),
    };
  }

  mutate(variantId: string): SkillVariant | null {
    const variant = this.findVariant(variantId);
    if (!variant) return null;

    if (Math.random() > this.config.mutationRate) return null;

    const mutatedManifest = this.mutateManifest(variant.manifest);
    const mutated: SkillVariant = {
      id: randomUUID(),
      skillId: variant.skillId,
      name: `${variant.name}-mutant`,
      manifest: mutatedManifest,
      goldScore: 0,
      lineage: {
        parentIds: [variantId],
        method: 'mutation',
      },
      createdAt: new Date(),
    };

    const variants = this.variants.get(variant.skillId) || [];
    variants.push(mutated);
    this.variants.set(variant.skillId, variants);

    return mutated;
  }

  private mutateManifest(manifest: SkillManifest): SkillManifest {
    const mutationTypes = ['triggers', 'parameters', 'description', 'examples'] as const;
    const selected = mutationTypes[Math.floor(Math.random() * mutationTypes.length)];

    switch (selected) {
      case 'triggers':
        return this.mutateTriggers(manifest);
      case 'parameters':
        return this.mutateParameters(manifest);
      case 'description':
        return this.mutateDescription(manifest);
      case 'examples':
        return this.addExample(manifest);
    }
  }

  private mutateTriggers(manifest: SkillManifest): SkillManifest {
    const newTriggers = [...manifest.triggers];
    if (newTriggers.length === 0) {
      newTriggers.push({ type: 'keyword', value: 'default' });
    } else {
      const idx = Math.floor(Math.random() * newTriggers.length);
      const trigger = newTriggers[idx];
      const mutations: Record<SkillTrigger['type'], string[]> = {
        keyword: ['analyze', 'review', 'check', 'help', 'create', 'update', 'fix'],
        pattern: ['.*', '\\w+', '\\d+', '[a-z]+'],
        command: ['/do', '/run', '/exec', '/start', '/stop'],
        context: ['coding', 'writing', 'debugging', 'planning'],
      };
      const newValue =
        mutations[trigger.type][Math.floor(Math.random() * mutations[trigger.type].length)];
      newTriggers[idx] = { ...trigger, value: newValue };
    }
    return { ...manifest, triggers: newTriggers };
  }

  private mutateParameters(manifest: SkillManifest): SkillManifest {
    const newParams = [...manifest.parameters];
    if (newParams.length === 0) {
      newParams.push({
        name: 'newParam',
        type: 'string',
        required: false,
        description: 'Evolved parameter',
      });
    } else {
      const idx = Math.floor(Math.random() * newParams.length);
      const param = newParams[idx];
      newParams[idx] = {
        ...param,
        required: !param.required,
        description: param.description + ' (evolved)',
      };
    }
    return { ...manifest, parameters: newParams };
  }

  private mutateDescription(manifest: SkillManifest): SkillManifest {
    const suffixes = ['(enhanced)', '(optimized)', '(improved)', '(v2)'];
    const suffix = suffixes[Math.floor(Math.random() * suffixes.length)];
    return {
      ...manifest,
      description: `${manifest.description} ${suffix}`,
    };
  }

  private addExample(manifest: SkillManifest): SkillManifest {
    return {
      ...manifest,
      examples: [...manifest.examples, `Evolved example ${manifest.examples.length + 1}`],
    };
  }

  selectElite(skillId: string, count: number = 3): SkillVariant[] {
    const variants = this.variants.get(skillId) || [];
    return [...variants].sort((a, b) => b.goldScore - a.goldScore).slice(0, count);
  }

  evolve(skillId: string): SkillVariant[] {
    const variants = this.variants.get(skillId) || [];
    if (variants.length < 2) return variants;

    const elite = this.selectElite(skillId, this.config.eliteCount);
    const newVariants: SkillVariant[] = [...elite];

    for (let i = 0; i < this.config.populationSize - elite.length; i++) {
      const parents = this.selectParents(skillId);
      if (parents.length >= 2 && Math.random() < this.config.crossoverRate) {
        const child = this.crossbreedSync(parents[0].id, parents[1].id);
        if (child) {
          newVariants.push(child);
        }
      } else if (parents.length >= 1) {
        const mutant = this.mutate(parents[0].id);
        if (mutant) {
          newVariants.push(mutant);
        }
      }
    }

    this.variants.set(skillId, newVariants);
    return newVariants;
  }

  private crossbreedSync(parentId1: string, parentId2: string): SkillVariant | null {
    const variant1 = this.findVariant(parentId1);
    const variant2 = this.findVariant(parentId2);

    if (!variant1 || !variant2) return null;
    if (Math.random() > this.config.crossoverRate) return null;

    const childManifest = this.crossoverManifests(variant1.manifest, variant2.manifest);
    const child: SkillVariant = {
      id: randomUUID(),
      skillId: variant1.skillId,
      name: `${variant1.name} x ${variant2.name}`,
      manifest: childManifest,
      goldScore: 0,
      lineage: { parentIds: [parentId1, parentId2], method: 'crossbreed' },
      createdAt: new Date(),
    };

    const variants = this.variants.get(variant1.skillId) || [];
    variants.push(child);
    this.variants.set(variant1.skillId, variants);

    return child;
  }

  private selectParents(skillId: string): SkillVariant[] {
    const variants = this.variants.get(skillId) || [];
    const tournamentSize = Math.min(3, variants.length);
    const parents: SkillVariant[] = [];

    for (let i = 0; i < 2; i++) {
      const tournament: SkillVariant[] = [];
      for (let j = 0; j < tournamentSize; j++) {
        const idx = Math.floor(Math.random() * variants.length);
        tournament.push(variants[idx]);
      }
      tournament.sort((a, b) => b.goldScore - a.goldScore);
      if (tournament[0]) parents.push(tournament[0]);
    }

    return parents;
  }

  private findVariant(variantId: string): SkillVariant | null {
    for (const variants of this.variants.values()) {
      const variant = variants.find((v) => v.id === variantId);
      if (variant) return variant;
    }
    return null;
  }

  getVariants(skillId: string): SkillVariant[] {
    return this.variants.get(skillId) || [];
  }

  updateGoldScore(variantId: string, score: number): void {
    const variant = this.findVariant(variantId);
    if (variant) {
      variant.goldScore = score;
    }
  }
}

export const skillBreeder = new SkillBreeder();
