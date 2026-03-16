import { Agent } from '../../core/agent.js';
import { AgentOptions } from '../../core/agent.js';
/**
 * Code Review Agent - Security analysis, anti-pattern detection, test coverage
 */
export declare class CodeReviewAgent extends Agent {
    private reviewHistory;
    constructor(options: AgentOptions);
    /**
     * Review a code diff
     */
    reviewDiff(diff: string, options?: {
        files?: string[];
        pullRequestUrl?: string;
    }): Promise<CodeReviewReport>;
    /**
     * Parse a diff into structured data
     */
    private parseDiff;
    /**
     * Check for security vulnerabilities
     */
    private checkSecurity;
    /**
     * Find line number in diff
     */
    private findLineNumber;
    /**
     * Get recommendation for a security issue
     */
    private getRecommendation;
    /**
     * Check for anti-patterns
     */
    private checkAntiPatterns;
    /**
     * Check test coverage
     */
    private checkTestCoverage;
    /**
     * Generate review comments
     */
    private generateComments;
    /**
     * Calculate overall score
     */
    private calculateScore;
    /**
     * Post comments to a pull request
     */
    postCommentsToPR(report: CodeReviewReport, prUrl: string, apiKey: string): Promise<{
        success: boolean;
        errors?: string[];
    }>;
    /**
     * Get review history
     */
    getHistory(): ReviewRecord[];
    /**
     * Get statistics
     */
    getStats(): {
        totalReviews: number;
        avgScore: number;
        criticalIssues: number;
        highIssues: number;
        antiPatternsFound: number;
        avgTestCoverage: number;
    };
}
export interface ParsedDiff {
    files: DiffFile[];
    lines: string[];
}
export interface DiffFile {
    path: string;
    added: string[];
    removed: string[];
    modified: string[];
}
export type SecuritySeverity = 'critical' | 'high' | 'medium' | 'low';
export interface SecurityIssue {
    id: string;
    severity: SecuritySeverity;
    file: string;
    line: number;
    type: string;
    description: string;
    recommendation: string;
}
export interface AntiPattern {
    id: string;
    file: string;
    type: string;
    line: number;
    description: string;
    recommendation: string;
}
export interface TestCoverage {
    testFiles: number;
    productionFiles: number;
    testMethods: number;
    productionMethods: number;
    ratio: number;
    isAdequate: boolean;
    recommendations: string[];
}
export interface ReviewComment {
    type: 'security' | 'anti-pattern' | 'coverage' | 'style';
    severity: SecuritySeverity | 'medium' | 'low';
    file: string;
    line: number;
    message: string;
    suggestion?: string;
}
export interface CodeReviewReport {
    id: string;
    timestamp: Date;
    filesAnalyzed: number;
    linesChanged: number;
    securityIssues: SecurityIssue[];
    antiPatterns: AntiPattern[];
    testCoverage: TestCoverage;
    comments: ReviewComment[];
    overallScore: number;
    pullRequestUrl?: string;
    duration: number;
}
export interface ReviewRecord {
    report: CodeReviewReport;
    reviewer: string;
    timestamp: Date;
}
/**
 * Factory function to create a code review agent
 */
export declare function createCodeReviewAgent(options: AgentOptions): CodeReviewAgent;
//# sourceMappingURL=code-review-agent.d.ts.map