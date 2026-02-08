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
export declare class PersonaService {
    create(input: CreatePersonaInput): Promise<AgentPersona>;
    get(id: string): Promise<AgentPersona | null>;
    getDefault(): Promise<AgentPersona | null>;
    list(): Promise<AgentPersona[]>;
    update(id: string, data: Partial<CreatePersonaInput>): Promise<AgentPersona>;
    delete(id: string): Promise<void>;
    setDefault(id: string): Promise<void>;
    private mapPersona;
    seedDefaults(): Promise<void>;
}
export declare const personaService: PersonaService;
//# sourceMappingURL=persona.d.ts.map