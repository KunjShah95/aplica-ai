import { db } from '../db/index.js';

export interface CreatePersonaInput {
    name: string;
    description?: string;
    systemPrompt: string;
    settings?: Record<string, unknown>;
    isDefault?: boolean;
}

export interface AgentPersona {
    id: string;
    name: string;
    description: string | null;
    systemPrompt: string;
    settings: Record<string, unknown>;
    isDefault: boolean;
    createdAt: Date;
    updatedAt: Date;
}

export class PersonaService {
    async create(input: CreatePersonaInput): Promise<AgentPersona> {
        if (input.isDefault) {
            await db.agentPersona.updateMany({
                where: { isDefault: true },
                data: { isDefault: false },
            });
        }

        const persona = await db.agentPersona.create({
            data: {
                name: input.name,
                description: input.description,
                systemPrompt: input.systemPrompt,
                settings: input.settings || {},
                isDefault: input.isDefault ?? false,
            },
        });

        return this.mapPersona(persona);
    }

    async get(id: string): Promise<AgentPersona | null> {
        const persona = await db.agentPersona.findUnique({
            where: { id },
        });

        return persona ? this.mapPersona(persona) : null;
    }

    async getDefault(): Promise<AgentPersona | null> {
        const persona = await db.agentPersona.findFirst({
            where: { isDefault: true },
        });

        return persona ? this.mapPersona(persona) : null;
    }

    async list(): Promise<AgentPersona[]> {
        const personas = await db.agentPersona.findMany({
            orderBy: { name: 'asc' },
        });

        return personas.map(this.mapPersona);
    }

    async update(id: string, data: Partial<CreatePersonaInput>): Promise<AgentPersona> {
        if (data.isDefault) {
            await db.agentPersona.updateMany({
                where: { isDefault: true, id: { not: id } },
                data: { isDefault: false },
            });
        }

        const persona = await db.agentPersona.update({
            where: { id },
            data: {
                name: data.name,
                description: data.description,
                systemPrompt: data.systemPrompt,
                settings: data.settings,
                isDefault: data.isDefault,
            },
        });

        return this.mapPersona(persona);
    }

    async delete(id: string): Promise<void> {
        await db.agentPersona.delete({
            where: { id },
        });
    }

    async setDefault(id: string): Promise<void> {
        await db.agentPersona.updateMany({
            where: { isDefault: true },
            data: { isDefault: false },
        });

        await db.agentPersona.update({
            where: { id },
            data: { isDefault: true },
        });
    }

    private mapPersona(persona: any): AgentPersona {
        return {
            id: persona.id,
            name: persona.name,
            description: persona.description,
            systemPrompt: persona.systemPrompt,
            settings: persona.settings as Record<string, unknown> || {},
            isDefault: persona.isDefault,
            createdAt: persona.createdAt,
            updatedAt: persona.updatedAt,
        };
    }

    async seedDefaults(): Promise<void> {
        const count = await db.agentPersona.count();
        if (count > 0) return;

        const defaultPersonas: CreatePersonaInput[] = [
            {
                name: 'Assistant',
                description: 'A helpful, friendly AI assistant',
                systemPrompt: `You are a helpful AI assistant. You aim to be:
- Helpful and informative
- Clear and concise in your responses
- Honest about your limitations
- Respectful and professional`,
                isDefault: true,
            },
            {
                name: 'Expert Coder',
                description: 'A programming expert focused on code quality',
                systemPrompt: `You are an expert software engineer and coding assistant. You:
- Write clean, efficient, and well-documented code
- Follow best practices and design patterns
- Explain complex concepts clearly
- Suggest improvements and optimizations
- Consider security, performance, and maintainability`,
            },
            {
                name: 'Creative Writer',
                description: 'A creative writing assistant',
                systemPrompt: `You are a creative writing assistant. You:
- Help with storytelling and narrative structure
- Provide constructive feedback on writing
- Suggest creative ideas and plot developments
- Assist with dialogue, character development, and world-building
- Adapt to various writing styles and genres`,
            },
            {
                name: 'Research Analyst',
                description: 'A research-focused analytical assistant',
                systemPrompt: `You are a research analyst assistant. You:
- Analyze information critically and objectively
- Cite sources and provide evidence-based answers
- Break down complex topics into understandable parts
- Identify patterns, trends, and insights
- Present information in a structured, logical manner`,
            },
        ];

        for (const persona of defaultPersonas) {
            await this.create(persona);
        }
    }
}

export const personaService = new PersonaService();
