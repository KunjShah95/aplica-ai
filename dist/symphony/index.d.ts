export interface SymphonySpec {
    name: string;
    description: string;
    task: string;
    workspace?: string;
    branch?: string;
    maxDuration?: number;
    notifyOnComplete?: boolean;
    autoMerge?: boolean;
}
export interface SymphonyRun {
    id: string;
    spec: SymphonySpec;
    status: 'pending' | 'preparing' | 'running' | 'completed' | 'failed' | 'reviewing';
    workspacePath: string;
    branch: string;
    commitSha?: string;
    startedAt: Date;
    completedAt?: Date;
    summary?: string;
    changes?: SymphonyChange[];
    reviewStatus?: 'pending' | 'accepted' | 'rejected';
}
export interface SymphonyChange {
    file: string;
    additions: number;
    deletions: number;
    status: 'added' | 'modified' | 'deleted';
}
export declare class SymphonyOrchestrator {
    private runs;
    private workspaceRoot;
    private baseWorkspace;
    private notification?;
    constructor(options?: {
        workspaceRoot?: string;
        baseWorkspace?: string;
        notification?: {
            telegram?: string;
            discord?: string;
        };
    });
    createRun(spec: SymphonySpec): Promise<SymphonyRun>;
    private prepareWorkspace;
    private generateSpecMarkdown;
    startRun(runId: string, agentExecutor: SymphonyAgentExecutor): Promise<SymphonyRun>;
    private executeTask;
    private commitResults;
    private sendSummary;
    private generateSummary;
    private sendTelegram;
    private sendDiscord;
    acceptRun(runId: string): Promise<void>;
    rejectRun(runId: string, reason?: string): Promise<void>;
    retryRun(runId: string, agentExecutor: SymphonyAgentExecutor): Promise<SymphonyRun>;
    getRun(runId: string): SymphonyRun | undefined;
    listRuns(status?: SymphonyRun['status']): SymphonyRun[];
    cleanup(runId: string): Promise<void>;
}
export interface SymphonyExecutionContext {
    workspacePath: string;
    task: string;
    branch: string;
}
export interface SymphonyExecutionResult {
    summary: string;
    changes: SymphonyChange[];
}
export interface SymphonyAgentExecutor {
    execute(context: SymphonyExecutionContext): Promise<SymphonyExecutionResult>;
}
export declare const symphonyOrchestrator: SymphonyOrchestrator;
export declare class DefaultSymphonyExecutor implements SymphonyAgentExecutor {
    execute(context: SymphonyExecutionContext): Promise<SymphonyExecutionResult>;
}
//# sourceMappingURL=index.d.ts.map