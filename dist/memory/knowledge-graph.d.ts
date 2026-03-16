export interface KnowledgeNode {
    id: string;
    type: 'person' | 'project' | 'organization' | 'concept' | 'event' | 'document' | 'location';
    name: string;
    properties: Record<string, unknown>;
    firstMentioned: Date;
    lastMentioned: Date;
    mentionCount: number;
}
export interface KnowledgeRelationship {
    id: string;
    sourceId: string;
    targetId: string;
    type: 'works_with' | 'mentioned_in_context' | 'contradicts' | 'owns' | 'manages' | 'part_of' | 'related_to' | 'created' | 'attended';
    properties: Record<string, unknown>;
    strength: number;
    createdAt: Date;
}
export interface EntityExtraction {
    entities: Array<{
        name: string;
        type: KnowledgeNode['type'];
        properties?: Record<string, unknown>;
    }>;
    relationships: Array<{
        source: string;
        target: string;
        type: KnowledgeRelationship['type'];
        strength?: number;
        context?: string;
    }>;
}
export declare class KnowledgeGraph {
    private nodes;
    private relationships;
    initialize(): Promise<void>;
    addNode(node: Omit<KnowledgeNode, 'id' | 'firstMentioned' | 'lastMentioned' | 'mentionCount'>): Promise<KnowledgeNode>;
    addRelationship(rel: Omit<KnowledgeRelationship, 'id' | 'createdAt'>): Promise<KnowledgeRelationship>;
    findNode(name: string, type?: KnowledgeNode['type']): Promise<KnowledgeNode | null>;
    findNodesByType(type: KnowledgeNode['type']): Promise<KnowledgeNode[]>;
    findRelatedNodes(nodeId: string, relationshipType?: KnowledgeRelationship['type']): Promise<KnowledgeNode[]>;
    traverse(startNodeId: string, maxDepth?: number): Promise<Map<KnowledgeNode, number>>;
    queryNaturalLanguage(question: string): Promise<{
        answer: string;
        nodes: KnowledgeNode[];
        confidence: number;
    }>;
    extractAndStore(userId: string, content: string): Promise<void>;
    private extractEntities;
    private persistNode;
    private persistRelationship;
    getStats(): {
        totalNodes: number;
        totalRelationships: number;
        byType: Record<string, number>;
    };
}
export declare const knowledgeGraph: KnowledgeGraph;
//# sourceMappingURL=knowledge-graph.d.ts.map