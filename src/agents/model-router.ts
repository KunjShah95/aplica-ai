export type ModelComplexityTier = 'simple' | 'medium' | 'complex';

export interface ModelRouteDecision {
  tier: ModelComplexityTier;
  model: string;
  reason: string;
}

interface ModelRouterConfig {
  enabled: boolean;
  simpleMaxChars: number;
  complexMinChars: number;
  simpleModel: string;
  mediumModel: string;
  complexModel: string;
}

export class SmartModelRouter {
  private readonly config: ModelRouterConfig;

  constructor(config?: Partial<ModelRouterConfig>) {
    this.config = {
      enabled: process.env.MODEL_ROUTER_ENABLED !== 'false',
      simpleMaxChars: Number(process.env.MODEL_ROUTER_SIMPLE_MAX_CHARS || 240),
      complexMinChars: Number(process.env.MODEL_ROUTER_COMPLEX_MIN_CHARS || 1200),
      simpleModel: process.env.MODEL_ROUTER_SIMPLE_MODEL || 'claude-3-haiku-20240307',
      mediumModel:
        process.env.MODEL_ROUTER_MEDIUM_MODEL || process.env.LLM_MODEL || 'claude-sonnet-4-20250514',
      complexModel: process.env.MODEL_ROUTER_COMPLEX_MODEL || 'claude-sonnet-4-20250514',
      ...config,
    };
  }

  routeMessage(content: string, preferredModel?: string): ModelRouteDecision {
    if (!this.config.enabled) {
      return {
        tier: 'medium',
        model: preferredModel || this.config.mediumModel,
        reason: 'router_disabled',
      };
    }

    if (preferredModel) {
      return {
        tier: this.inferTierFromModel(preferredModel),
        model: preferredModel,
        reason: 'preferred_model_requested',
      };
    }

    const tier = this.classify(content);
    const model =
      tier === 'simple'
        ? this.config.simpleModel
        : tier === 'complex'
          ? this.config.complexModel
          : this.config.mediumModel;

    return {
      tier,
      model,
      reason: 'heuristic_classification',
    };
  }

  private classify(content: string): ModelComplexityTier {
    const normalized = content.toLowerCase();
    const length = content.length;

    const codeSignal = /```|function\s+|class\s+|interface\s+|stack\s+trace|typescript|regex|sql/i.test(
      content
    );
    const strategySignal =
      /architecture|trade-?off|compare|migration\s+plan|root\s+cause|optimi[sz]e|design\s+doc|multi[-\s]?step/i.test(
        normalized
      );
    const mathSignal = /\$\$|\bintegral\b|\bderivative\b|\bproof\b|\btheorem\b/i.test(normalized);
    const listDepthSignal = (content.match(/\n[-*]\s/g) || []).length >= 8;

    if (
      length >= this.config.complexMinChars ||
      (codeSignal && length > 350) ||
      strategySignal ||
      mathSignal ||
      listDepthSignal
    ) {
      return 'complex';
    }

    if (!codeSignal && length <= this.config.simpleMaxChars) {
      return 'simple';
    }

    return 'medium';
  }

  private inferTierFromModel(model: string): ModelComplexityTier {
    const normalized = model.toLowerCase();
    if (normalized.includes('haiku') || normalized.includes('mini') || normalized.includes('3.5')) {
      return 'simple';
    }
    if (normalized.includes('opus')) {
      return 'complex';
    }
    return 'medium';
  }
}

export const smartModelRouter = new SmartModelRouter();
