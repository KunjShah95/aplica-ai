export interface FineTuneConfig {
    modelId: string;
    baseModel: 'claude' | 'gpt' | 'ollama';
    trainingData: TrainingExample[];
    hyperparameters: FineTuneHyperparameters;
}
export interface TrainingExample {
    input: string;
    output: string;
    systemPrompt?: string;
}
export interface FineTuneHyperparameters {
    epochs?: number;
    batchSize?: number;
    learningRate?: number;
    validationSplit?: number;
}
export interface FineTunedModel {
    id: string;
    name: string;
    baseModel: string;
    status: 'training' | 'ready' | 'failed';
    progress?: number;
    createdAt: Date;
    completedAt?: Date;
    cost?: number;
    error?: string;
}
export interface ModelVersion {
    id: string;
    modelId: string;
    version: number;
    isActive: boolean;
    createdAt: Date;
}
export declare class FineTuningService {
    private activeJobs;
    createFineTuneJob(userId: string, config: FineTuneConfig): Promise<FineTunedModel>;
    private startTrainingJob;
    private processEpoch;
    private trainBatch;
    deployModel(modelId: string): Promise<void>;
    getModelStatus(modelId: string): Promise<FineTunedModel | null>;
    listUserModels(userId: string): Promise<FineTunedModel[]>;
    deleteModel(modelId: string): Promise<void>;
    generateTrainingData(userId: string, options: {
        minConversations?: number;
        minMessages?: number;
        includeMemories?: boolean;
    }): Promise<TrainingExample[]>;
    exportTrainingData(userId: string): Promise<string>;
}
export declare const fineTuningService: FineTuningService;
//# sourceMappingURL=index.d.ts.map