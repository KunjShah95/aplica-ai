import { randomUUID } from 'crypto';
import { db } from '../../db/index.js';
export class FineTuningService {
    activeJobs = new Map();
    async createFineTuneJob(userId, config) {
        const model = {
            id: randomUUID(),
            name: `model-${Date.now()}`,
            baseModel: config.baseModel,
            status: 'training',
            progress: 0,
            createdAt: new Date(),
        };
        await db.$connect();
        const trainingData = await db.trainingData.create({
            data: {
                id: model.id,
                userId,
                name: model.name,
                status: 'training',
                trainingExamples: config.trainingData.length,
                hyperparameters: config.hyperparameters,
                data: config.trainingData,
                modelVersionId: model.id, // Use model id as temporary model version id
            },
        });
        this.activeJobs.set(model.id, model);
        this.startTrainingJob(model.id, config);
        return model;
    }
    async startTrainingJob(modelId, config) {
        const job = this.activeJobs.get(modelId);
        if (!job)
            return;
        try {
            for (let epoch = 0; epoch < (config.hyperparameters.epochs || 3); epoch++) {
                job.progress = ((epoch + 1) / (config.hyperparameters.epochs || 3)) * 100;
                await this.processEpoch(modelId, config.trainingData, epoch);
                await db.trainingData.update({
                    where: { id: modelId },
                    data: {
                        status: 'training',
                        progress: job.progress,
                    },
                });
            }
            job.status = 'ready';
            job.progress = 100;
            job.completedAt = new Date();
            await db.trainingData.update({
                where: { id: modelId },
                data: {
                    status: 'ready',
                    progress: 100,
                    completedAt: job.completedAt,
                },
            });
            await this.deployModel(modelId);
        }
        catch (error) {
            job.status = 'failed';
            job.error = error instanceof Error ? error.message : 'Unknown error';
            await db.trainingData.update({
                where: { id: modelId },
                data: {
                    status: 'failed',
                    error: job.error,
                },
            });
        }
        this.activeJobs.delete(modelId);
    }
    async processEpoch(modelId, data, epoch) {
        const batchSize = 4;
        for (let i = 0; i < data.length; i += batchSize) {
            const batch = data.slice(i, i + batchSize);
            await this.trainBatch(modelId, batch, epoch);
        }
    }
    async trainBatch(modelId, batch, epoch) {
        console.log(`Training batch: model=${modelId}, epoch=${epoch}, size=${batch.length}`);
        await new Promise((resolve) => setTimeout(resolve, 100));
    }
    async deployModel(modelId) {
        const trainingData = await db.trainingData.findUnique({ where: { id: modelId } });
        await db.modelVersion.create({
            data: {
                id: randomUUID(),
                modelId,
                name: trainingData?.name || modelId,
                version: '1',
                baseModel: 'claude',
                isActive: true,
            },
        });
    }
    async getModelStatus(modelId) {
        const model = this.activeJobs.get(modelId);
        if (model)
            return model;
        const dbModel = await db.trainingData.findUnique({
            where: { id: modelId },
        });
        if (!dbModel)
            return null;
        return {
            id: dbModel.id,
            name: dbModel.name || 'unnamed',
            baseModel: 'claude', // Default since schema doesn't have this field
            status: dbModel.status,
            progress: dbModel.progress || 0,
            createdAt: dbModel.createdAt,
            completedAt: dbModel.completedAt || undefined,
            error: dbModel.error || undefined,
        };
    }
    async listUserModels(userId) {
        const models = await db.trainingData.findMany({
            where: { userId },
            orderBy: { createdAt: 'desc' },
        });
        return models.map((m) => ({
            id: m.id,
            name: m.name || 'unnamed',
            baseModel: 'claude', // Default since schema doesn't have this field
            status: m.status,
            progress: m.progress || 0,
            createdAt: m.createdAt,
            completedAt: m.completedAt || undefined,
            error: m.error || undefined,
        }));
    }
    async deleteModel(modelId) {
        await db.trainingData.delete({
            where: { id: modelId },
        });
    }
    async generateTrainingData(userId, options) {
        const examples = [];
        const conversations = await db.conversation.findMany({
            where: { userId },
            include: {
                messages: {
                    orderBy: { createdAt: 'asc' },
                    take: options.minMessages || 20,
                },
            },
            take: options.minConversations || 10,
        });
        for (const conv of conversations) {
            let context = '';
            for (const msg of conv.messages) {
                if (msg.role === 'USER') {
                    context = msg.content;
                }
                else if (msg.role === 'ASSISTANT' && context) {
                    examples.push({
                        input: context,
                        output: msg.content,
                    });
                    context = '';
                }
            }
        }
        if (options.includeMemories) {
            const memories = await db.memory.findMany({
                where: { userId, importance: { gte: 0.7 } },
                take: 50,
            });
            for (const memory of memories) {
                examples.push({
                    input: `Remember that: ${memory.content}`,
                    output: `I'll remember: ${memory.content}`,
                });
            }
        }
        return examples;
    }
    async exportTrainingData(userId) {
        const examples = await this.generateTrainingData(userId, {
            minConversations: 5,
            includeMemories: true,
        });
        return JSON.stringify(examples, null, 2);
    }
}
export const fineTuningService = new FineTuningService();
//# sourceMappingURL=index.js.map