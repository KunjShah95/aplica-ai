import { Agent } from '../../core/agent.js';
import { AgentOptions } from '../../core/agent.js';
/**
 * Research Agent - Deep research across multiple sources
 */
export declare class ResearchAgent extends Agent {
    private researchHistory;
    constructor(options: AgentOptions);
    /**
     * Conduct deep research on a topic
     */
    conductResearch(topic: string, options?: {
        sourceCount?: number;
        requireContradictions?: boolean;
    }): Promise<ResearchReport>;
    /**
     * Generate search queries for a topic
     */
    private generateSearchQueries;
    /**
     * Simulate searching multiple sources
     */
    private searchSources;
    /**
     * Collect information from sources
     */
    private collectFromSources;
    /**
     * Generate sample content for a source
     */
    private generateSampleContent;
    /**
     * Extract key findings from a source
     */
    private extractKeyFindings;
    /**
     * De-duplicate findings across sources
     */
    private deDuplicate;
    /**
     * Normalize a finding for comparison
     */
    private normalizeFinding;
    /**
     * Identify contradictions between sources
     */
    private identifyContradictions;
    /**
     * Synthesize findings into a coherent narrative
     */
    private synthesizeFindings;
    /**
     * Extract main themes from findings
     */
    private extractMainThemes;
    /**
     * Determine consensus level across findings
     */
    private determineConsensus;
    /**
     * Generate executive summary
     */
    private generateExecutiveSummary;
    /**
     * Generate citations for sources
     */
    private generateCitations;
    /**
     * Get research history
     */
    getHistory(): ResearchRecord[];
    /**
     * Get statistics about research activities
     */
    getStats(): {
        totalResearch: number;
        avgSources: number;
        avgDuration: number;
        mostCommonContradictionType: string;
    };
}
export interface ResearchSource {
    id: string;
    type: string;
    title: string;
    url: string;
    relevanceScore: number;
    contentLength: number;
}
export interface SourceResult {
    sourceId: string;
    title: string;
    content: string;
    keyFindings: string[];
    confidence: number;
}
export interface DeduplicatedFinding {
    finding: string;
    sources: string[];
    agreement: number;
}
export interface Contradiction {
    id: string;
    type: string;
    claim1: string;
    claim2: string;
    explanation: string;
    resolution: string;
}
export interface Synthesis {
    mainThemes: string[];
    consensus: 'high' | 'medium' | 'low';
    areasOfDisagreement: {
        topic: string;
        viewpoints: string[];
    }[];
    keyEvidence: string[];
}
export interface Citation {
    id: number;
    sourceId: string;
    type: string;
    title: string;
    url: string;
}
export interface ResearchRecord {
    id: string;
    topic: string;
    sources: ResearchSource[];
    findings: DeduplicatedFinding[];
    contradictions: Contradiction[];
    synthesis: Synthesis;
    summary: string;
    citations: Citation[];
    timestamp: Date;
    duration: number;
}
export type ResearchReport = ResearchRecord;
/**
 * Factory function to create a research agent
 */
export declare function createResearchAgent(options: AgentOptions): ResearchAgent;
//# sourceMappingURL=research-agent.d.ts.map