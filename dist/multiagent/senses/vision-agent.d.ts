import { Agent } from '../../core/agent.js';
import { AgentOptions } from '../../core/agent.js';
/**
 * Vision Agent - Visual perception, OCR, and PDF reading
 */
export declare class VisionAgent extends Agent {
    constructor(options: AgentOptions);
    /**
     * Take a screenshot and analyze it
     */
    screenshotAndAnalyze(description?: string): Promise<{
        screenshot: string;
        analysis: string;
    }>;
    /**
     * Take a screenshot using browser
     */
    private screenshot;
    /**
     * Read a PDF document
     */
    readPDF(urlOrPath: string): Promise<{
        text: string;
        pages: number;
    }>;
    /**
     * Extract table from image
     */
    extractTable(imageUrl: string): Promise<{
        headers: string[];
        rows: string[][];
    }>;
    /**
     * Analyze visual content (diagrams, flowcharts, etc.)
     */
    analyzeVisualContent(imageUrl: string, purpose?: string): Promise<string>;
    /**
     * Estimate content type
     */
    private estimateContentType;
    /**
     * Perform visual QA of a UI
     */
    visualQA(url: string, expectedElements: string[]): Promise<{
        passed: boolean;
        issues: string[];
    }>;
    /**
     * Check if an element exists (simulated)
     */
    private elementExists;
    /**
     * Parse hand-drawn diagram from image
     */
    parseHandDrawnDiagram(imageUrl: string): Promise<{
        elements: DiagramElement[];
        connections: DiagramConnection[];
    }>;
}
export interface DiagramElement {
    id: string;
    type: 'box' | 'circle' | 'diamond' | 'arrow';
    text: string;
    x: number;
    y: number;
}
export interface DiagramConnection {
    from: string;
    to: string;
    label?: string;
}
/**
 * Factory function to create a vision agent
 */
export declare function createVisionAgent(options: AgentOptions): VisionAgent;
//# sourceMappingURL=vision-agent.d.ts.map