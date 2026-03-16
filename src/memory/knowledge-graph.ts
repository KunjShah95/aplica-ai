import { db } from '../db/index.js';
import { randomUUID } from 'crypto';

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
  type:
    | 'works_with'
    | 'mentioned_in_context'
    | 'contradicts'
    | 'owns'
    | 'manages'
    | 'part_of'
    | 'related_to'
    | 'created'
    | 'attended';
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

export class KnowledgeGraph {
  private nodes: Map<string, KnowledgeNode> = new Map();
  private relationships: Map<string, KnowledgeRelationship> = new Map();

  async initialize(): Promise<void> {
    console.log('Knowledge graph initialized');
  }

  async addNode(
    node: Omit<KnowledgeNode, 'id' | 'firstMentioned' | 'lastMentioned' | 'mentionCount'>
  ): Promise<KnowledgeNode> {
    const existing = Array.from(this.nodes.values()).find(
      (n) => n.name.toLowerCase() === node.name.toLowerCase() && n.type === node.type
    );

    if (existing) {
      existing.mentionCount++;
      existing.lastMentioned = new Date();
      return existing;
    }

    const newNode: KnowledgeNode = {
      ...node,
      id: randomUUID(),
      firstMentioned: new Date(),
      lastMentioned: new Date(),
      mentionCount: 1,
    };

    this.nodes.set(newNode.id, newNode);
    await this.persistNode(newNode);

    return newNode;
  }

  async addRelationship(
    rel: Omit<KnowledgeRelationship, 'id' | 'createdAt'>
  ): Promise<KnowledgeRelationship> {
    const newRel: KnowledgeRelationship = {
      ...rel,
      id: randomUUID(),
      createdAt: new Date(),
    };

    this.relationships.set(newRel.id, newRel);
    await this.persistRelationship(newRel);

    return newRel;
  }

  async findNode(name: string, type?: KnowledgeNode['type']): Promise<KnowledgeNode | null> {
    for (const node of this.nodes.values()) {
      if (node.name.toLowerCase() === name.toLowerCase() && (!type || node.type === type)) {
        return node;
      }
    }
    return null;
  }

  async findNodesByType(type: KnowledgeNode['type']): Promise<KnowledgeNode[]> {
    return Array.from(this.nodes.values()).filter((n) => n.type === type);
  }

  async findRelatedNodes(
    nodeId: string,
    relationshipType?: KnowledgeRelationship['type']
  ): Promise<KnowledgeNode[]> {
    const relatedIds = new Set<string>();

    for (const rel of this.relationships.values()) {
      if (rel.sourceId === nodeId && (!relationshipType || rel.type === relationshipType)) {
        relatedIds.add(rel.targetId);
      }
      if (rel.targetId === nodeId && (!relationshipType || rel.type === relationshipType)) {
        relatedIds.add(rel.sourceId);
      }
    }

    return Array.from(relatedIds)
      .map((id) => this.nodes.get(id))
      .filter(Boolean) as KnowledgeNode[];
  }

  async traverse(startNodeId: string, maxDepth: number = 3): Promise<Map<KnowledgeNode, number>> {
    const visited = new Map<KnowledgeNode, number>();
    const queue: Array<{ nodeId: string; depth: number }> = [{ nodeId: startNodeId, depth: 0 }];

    while (queue.length > 0) {
      const { nodeId, depth } = queue.shift()!;

      if (depth > maxDepth) continue;

      const node = this.nodes.get(nodeId);
      if (!node) continue;

      if (!visited.has(node) || visited.get(node)! > depth) {
        visited.set(node, depth);
      }

      const related = await this.findRelatedNodes(nodeId);
      for (const relNode of related) {
        queue.push({ nodeId: relNode.id, depth: depth + 1 });
      }
    }

    return visited;
  }

  async queryNaturalLanguage(
    question: string
  ): Promise<{ answer: string; nodes: KnowledgeNode[]; confidence: number }> {
    const questionLower = question.toLowerCase();
    const nodes = Array.from(this.nodes.values());

    let relevantNodes: KnowledgeNode[] = [];
    let confidence = 0.5;
    let answer = '';

    if (questionLower.includes('who')) {
      const nameMatch = question.match(/who (is|was|does|worked with) (.+?)(?:\?|$)/i);
      if (nameMatch) {
        const targetName = nameMatch[2].trim();
        const person = await this.findNode(targetName, 'person');

        if (person) {
          relevantNodes.push(person);
          const related = await this.findRelatedNodes(person.id);
          relevantNodes.push(...related);

          const relationships = Array.from(this.relationships.values()).filter(
            (r) => r.sourceId === person.id || r.targetId === person.id
          );

          answer = `${person.name} has been mentioned ${person.mentionCount} times.`;
          confidence = 0.85;
        }
      }
    }

    if (questionLower.includes('project')) {
      const projectMatch = question.match(/project (.+?)(?:\?|$)/i);
      if (projectMatch) {
        const projectName = projectMatch[1].trim();
        const project = await this.findNode(projectName, 'project');

        if (project) {
          relevantNodes.push(project);
          const related = await this.findRelatedNodes(project.id);
          relevantNodes.push(...related);

          answer = `Project "${project.name}" - last mentioned on ${project.lastMentioned.toLocaleDateString()}.`;
          confidence = 0.9;
        }
      }
    }

    if (questionLower.includes('works with') || questionLower.includes('collaborat')) {
      const personMatch = question.match(
        /(?:who|which) (?:does|is|was) (.+?) (?:work|collaborat)/i
      );
      if (personMatch) {
        const personName = personMatch[1].trim();
        const person = await this.findNode(personName, 'person');

        if (person) {
          const collaborators = await this.findRelatedNodes(person.id, 'works_with');

          if (collaborators.length > 0) {
            answer = `${person.name} works with: ${collaborators.map((c) => c.name).join(', ')}`;
            relevantNodes = [person, ...collaborators];
            confidence = 0.85;
          }
        }
      }
    }

    return { answer, nodes: relevantNodes, confidence };
  }

  async extractAndStore(userId: string, content: string): Promise<void> {
    const extraction = this.extractEntities(content);

    const nodeMap = new Map<string, string>();

    for (const entity of extraction.entities) {
      const node = await this.addNode({
        type: entity.type,
        name: entity.name,
        properties: {
          userId,
          ...entity.properties,
        },
      });
      nodeMap.set(entity.name, node.id);
    }

    for (const rel of extraction.relationships) {
      const sourceId = nodeMap.get(rel.source);
      const targetId = nodeMap.get(rel.target);

      if (sourceId && targetId) {
        await this.addRelationship({
          sourceId,
          targetId,
          type: rel.type,
          strength: rel.strength || 0.5,
          properties: {
            userId,
            context: rel.context,
          },
        });
      }
    }
  }

  private extractEntities(content: string): EntityExtraction {
    const entities: EntityExtraction['entities'] = [];
    const relationships: EntityExtraction['relationships'] = [];

    const personPatterns = [
      /\b([A-Z][a-z]+ [A-Z][a-z]+)\b/g,
      /\b(John|Jane|Mike|Sarah|David|Lisa|Tom|Jenny|Chris|Emma|Alice|Bob)\b/g,
    ];

    for (const pattern of personPatterns) {
      let match: RegExpExecArray | null;
      while ((match = pattern.exec(content)) !== null) {
        const entityName = match[1];
        if (!entityName) continue;
        if (!entities.find((e) => e.name === entityName)) {
          entities.push({ name: entityName, type: 'person' });
        }
      }
    }

    const projectPatterns = [
      /\b(Project\s+([A-Z][a-z]+))\b/gi,
      /\b(the\s+([A-Z][a-z]+)\s+project)\b/gi,
    ];

    for (const pattern of projectPatterns) {
      let match: RegExpExecArray | null;
      while ((match = pattern.exec(content)) !== null) {
        const name = match[1] || match[2];
        if (name && !entities.find((e) => e.name.toLowerCase() === name.toLowerCase())) {
          entities.push({ name, type: 'project' });
        }
      }
    }

    const orgPatterns = [
      /\b(Google|Microsoft|Apple|Amazon|Meta|Tesla|Netflix|Stripe|OpenAI|Anthropic)\b/g,
    ];

    for (const pattern of orgPatterns) {
      let match: RegExpExecArray | null;
      while ((match = pattern.exec(content)) !== null) {
        const entityName = match[1];
        if (!entityName) continue;
        if (!entities.find((e) => e.name === entityName)) {
          entities.push({ name: entityName, type: 'organization' });
        }
      }
    }

    const worksWithMatch = content.match(
      /([A-Z][a-z]+ [A-Z][a-z]+) (?:works?|collaborat(?:ion|ed|es)?) (?:with|and) ([A-Z][a-z]+ [A-Z][a-z]+)/gi
    );
    if (worksWithMatch) {
      for (const match of worksWithMatch) {
        const peopleMatch = match.match(/([A-Z][a-z]+ [A-Z][a-z]+).*?([A-Z][a-z]+ [A-Z][a-z]+)/);
        if (peopleMatch) {
          relationships.push({
            source: peopleMatch[1],
            target: peopleMatch[2],
            type: 'works_with',
            strength: 0.8,
          });
        }
      }
    }

    const mentionedMatch = content.match(
      /([A-Z][a-z]+ [A-Z][a-z]+) mentioned ([A-Z][a-z]+ [A-Z][a-z]+)/gi
    );
    if (mentionedMatch) {
      for (const match of mentionedMatch) {
        const peopleMatch = match.match(/([A-Z][a-z]+ [A-Z][a-z]+).*?([A-Z][a-z]+ [A-Z][a-z]+)/);
        if (peopleMatch) {
          relationships.push({
            source: peopleMatch[1],
            target: peopleMatch[2],
            type: 'mentioned_in_context',
            strength: 0.5,
          });
        }
      }
    }

    return { entities, relationships };
  }

  private async persistNode(node: KnowledgeNode): Promise<void> {
    try {
      await db.memory.create({
        data: {
          id: node.id,
          userId: String(node.properties.userId || 'system'),
          type: 'ENTITY',
          content: `${node.type}: ${node.name}`,
          metadata: {
            nodeType: node.type,
            properties: node.properties,
            mentionCount: node.mentionCount,
            firstMentioned: node.firstMentioned,
            lastMentioned: node.lastMentioned,
          } as any,
          importance: Math.min(1, node.mentionCount / 10),
        },
      });
    } catch (error) {
      console.error('Failed to persist knowledge node:', error);
    }
  }

  private async persistRelationship(rel: KnowledgeRelationship): Promise<void> {
    try {
      await db.memory.create({
        data: {
          id: rel.id,
          userId: String(rel.properties.userId || 'system'),
          type: 'FACT',
          content: `${rel.type}: ${rel.sourceId} -> ${rel.targetId}`,
          metadata: {
            relationshipType: rel.type,
            sourceId: rel.sourceId,
            targetId: rel.targetId,
            strength: rel.strength,
            context: rel.properties.context,
          } as any,
          importance: rel.strength,
        },
      });
    } catch (error) {
      console.error('Failed to persist relationship:', error);
    }
  }

  getStats(): { totalNodes: number; totalRelationships: number; byType: Record<string, number> } {
    const byType: Record<string, number> = {};

    for (const node of this.nodes.values()) {
      byType[node.type] = (byType[node.type] || 0) + 1;
    }

    return {
      totalNodes: this.nodes.size,
      totalRelationships: this.relationships.size,
      byType,
    };
  }
}

export const knowledgeGraph = new KnowledgeGraph();
