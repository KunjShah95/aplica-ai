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
export declare class SmartModelRouter {
    private readonly config;
    constructor(config?: Partial<ModelRouterConfig>);
    routeMessage(content: string, preferredModel?: string): ModelRouteDecision;
    private classify;
    private inferTierFromModel;
}
export declare const smartModelRouter: SmartModelRouter;
export {};
//# sourceMappingURL=model-router.d.ts.map