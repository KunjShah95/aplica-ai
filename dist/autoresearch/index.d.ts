export interface ResearchProgram {
    id: string;
    name: string;
    description: string;
    goals: string[];
    successCriteria: string[];
    budget: ResearchBudget;
    iterations: ResearchIteration[];
    bestResult?: ResearchResult;
    status: 'pending' | 'running' | 'completed' | 'failed';
    createdAt: Date;
    updatedAt: Date;
}
export interface ResearchBudget {
    type: 'tokens' | 'time' | 'runs';
    limit: number;
    spent: number;
}
export interface ResearchIteration {
    id: string;
    number: number;
    variant: string;
    changes: string[];
    result?: ResearchResult;
    status: 'running' | 'completed' | 'failed';
    startedAt: Date;
    completedAt?: Date;
}
export interface ResearchResult {
    score: number;
    metrics: Record<string, number>;
    summary: string;
    artifacts: string[];
    error?: string;
}
export interface ProgramConfig {
    name: string;
    description: string;
    goals: string[];
    successCriteria: string[];
    budget: {
        type: 'tokens' | 'time' | 'runs';
        limit: number;
    };
    researchDirection: string;
    agentPrompt: string;
    compareResults: string;
}
export declare class AutoResearchEngine {
    private programs;
    private workspacePath;
    private github?;
    private notification?;
    private agentInstances;
    constructor(options?: {
        workspacePath?: string;
        github?: {
            owner: string;
            repo: string;
            token: string;
        };
        notification?: {
            telegram?: string;
            discord?: string;
        };
    });
    loadProgram(filePath: string): Promise<ProgramConfig>;
    createProgram(config: ProgramConfig, workspacePath?: string): Promise<ResearchProgram>;
    private generateProgramMarkdown;
    startResearch(programId: string): Promise<void>;
    private withinBudget;
    private calculateSpent;
    private checkSuccess;
    private parseCriterion;
    private evaluateCondition;
    private runIteration;
    private createBranch;
    private commitBestResult;
    private sendSummary;
    private generateSummary;
    private formatDuration;
    private sendTelegram;
    private sendDiscord;
    getProgram(programId: string): ResearchProgram | undefined;
    listPrograms(): ResearchProgram[];
}
export declare class MultiAgentResearchCoordinator {
    private engines;
    private sharedChannel?;
    constructor();
    private loadEngines;
    startParallelResearch(programs: ProgramConfig[], onProgress?: (agentId: string, progress: number) => void): Promise<Map<string, ResearchProgram>>;
    getStatus(): Promise<{
        agentCount: number;
        activeResearch: number;
        completedResearch: number;
    }>;
}
export declare const autoResearchEngine: AutoResearchEngine;
export declare const researchCoordinator: MultiAgentResearchCoordinator;
//# sourceMappingURL=index.d.ts.map