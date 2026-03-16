import { db } from '../db/index.js';
import { randomUUID } from 'crypto';
export class KnowledgeGraph {
    nodes = new Map();
    relationships = new Map();
    async initialize() {
        console.log('Knowledge graph initialized');
    }
    async addNode(node) {
        const existing = Array.from(this.nodes.values()).find((n) => n.name.toLowerCase() === node.name.toLowerCase() && n.type === node.type);
        if (existing) {
            existing.mentionCount++;
            existing.lastMentioned = new Date();
            return existing;
        }
        const newNode = {
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
    async addRelationship(rel) {
        const newRel = {
            ...rel,
            id: randomUUID(),
            createdAt: new Date(),
        };
        this.relationships.set(newRel.id, newRel);
        await this.persistRelationship(newRel);
        return newRel;
    }
    async findNode(name, type) {
        for (const node of this.nodes.values()) {
            if (node.name.toLowerCase() === name.toLowerCase() && (!type || node.type === type)) {
                return node;
            }
        }
        return null;
    }
    async findNodesByType(type) {
        return Array.from(this.nodes.values()).filter((n) => n.type === type);
    }
    async findRelatedNodes(nodeId, relationshipType) {
        const relatedIds = new Set();
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
            .filter(Boolean);
    }
    async traverse(startNodeId, maxDepth = 3) {
        const visited = new Map();
        const queue = [{ nodeId: startNodeId, depth: 0 }];
        while (queue.length > 0) {
            const { nodeId, depth } = queue.shift();
            if (depth > maxDepth)
                continue;
            const node = this.nodes.get(nodeId);
            if (!node)
                continue;
            if (!visited.has(node) || visited.get(node) > depth) {
                visited.set(node, depth);
            }
            const related = await this.findRelatedNodes(nodeId);
            for (const relNode of related) {
                queue.push({ nodeId: relNode.id, depth: depth + 1 });
            }
        }
        return visited;
    }
    async queryNaturalLanguage(question) {
        const questionLower = question.toLowerCase();
        const nodes = Array.from(this.nodes.values());
        let relevantNodes = [];
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
                    const relationships = Array.from(this.relationships.values()).filter((r) => r.sourceId === person.id || r.targetId === person.id);
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
            const personMatch = question.match(/(?:who|which) (?:does|is|was) (.+?) (?:work|collaborat)/i);
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
    async extractAndStore(userId, content) {
        const extraction = this.extractEntities(content);
        const nodeMap = new Map();
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
    extractEntities(content) {
        const entities = [];
        const relationships = [];
        const personPatterns = [
            /\b([A-Z][a-z]+ [A-Z][a-z]+)\b/g,
            /\b(John|Jane|Mike|Sarah|David|Lisa|Tom|Jenny|Chris|Emma|Alice|Bob)\b/g,
        ];
        for (const pattern of personPatterns) {
            let match;
            while ((match = pattern.exec(content)) !== null) {
                if (!entities.find((e) => e.name === match[1])) {
                    entities.push({ name: match[1], type: 'person' });
                }
            }
        }
        const projectPatterns = [
            /\b(Project\s+([A-Z][a-z]+))\b/gi,
            /\b(the\s+([A-Z][a-z]+)\s+project)\b/gi,
        ];
        for (const pattern of projectPatterns) {
            let match;
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
            let match;
            while ((match = pattern.exec(content)) !== null) {
                if (!entities.find((e) => e.name === match[1])) {
                    entities.push({ name: match[1], type: 'organization' });
                }
            }
        }
        const worksWithMatch = content.match(/([A-Z][a-z]+ [A-Z][a-z]+) (?:works?|collaborat(?:ion|ed|es)?) (?:with|and) ([A-Z][a-z]+ [A-Z][a-z]+)/gi);
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
        const mentionedMatch = content.match(/([A-Z][a-z]+ [A-Z][a-z]+) mentioned ([A-Z][a-z]+ [A-Z][a-z]+)/gi);
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
    async persistNode(node) {
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
                    },
                    importance: Math.min(1, node.mentionCount / 10),
                },
            });
        }
        catch (error) {
            console.error('Failed to persist knowledge node:', error);
        }
    }
    async persistRelationship(rel) {
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
                    },
                    importance: rel.strength,
                },
            });
        }
        catch (error) {
            console.error('Failed to persist relationship:', error);
        }
    }
    getStats() {
        const byType = {};
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
//# sourceMappingURL=knowledge-graph.js.map