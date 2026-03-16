import { randomUUID } from 'crypto';
import { Agent } from '../../core/agent.js';
import { AgentOptions } from '../../core/agent.js';

/**
 * Code Review Agent - Security analysis, anti-pattern detection, test coverage
 */
export class CodeReviewAgent extends Agent {
  private reviewHistory: ReviewRecord[] = [];

  constructor(options: AgentOptions) {
    super(options);
  }

  /**
   * Review a code diff
   */
  async reviewDiff(
    diff: string,
    options?: {
      files?: string[];
      pullRequestUrl?: string;
    }
  ): Promise<CodeReviewReport> {
    const startTime = Date.now();

    // Parse the diff
    const parsedDiff = this.parseDiff(diff);

    // Check for security issues
    const securityIssues = this.checkSecurity(parsedDiff);

    // Check for anti-patterns
    const antiPatterns = this.checkAntiPatterns(parsedDiff);

    // Check test coverage
    const testCoverage = this.checkTestCoverage(parsedDiff);

    // Generate review comments
    const comments = this.generateComments({
      security: securityIssues,
      antiPatterns,
      testCoverage,
    });

    const report: CodeReviewReport = {
      id: randomUUID(),
      timestamp: new Date(),
      filesAnalyzed: parsedDiff.files.length,
      linesChanged: parsedDiff.lines.length,
      securityIssues,
      antiPatterns,
      testCoverage,
      comments,
      overallScore: this.calculateScore(securityIssues, antiPatterns, testCoverage),
      pullRequestUrl: options?.pullRequestUrl,
      duration: Date.now() - startTime,
    };

    this.reviewHistory.push({
      report,
      reviewer: 'CodeReviewAgent',
      timestamp: report.timestamp,
    });
    return report;
  }

  /**
   * Parse a diff into structured data
   */
  private parseDiff(diff: string): ParsedDiff {
    const lines = diff.split('\n');
    const files: DiffFile[] = [];
    const currentFiles: DiffFile = {
      path: '',
      added: [],
      removed: [],
      modified: [],
    };

    for (const line of lines) {
      if (line.startsWith('diff --git')) {
        if (currentFiles.path) {
          files.push({ ...currentFiles });
        }
        const pathMatch = line.match(/b\/(.+)/);
        currentFiles.path = pathMatch ? pathMatch[1] : 'unknown';
        currentFiles.added = [];
        currentFiles.removed = [];
        currentFiles.modified = [];
      } else if (line.startsWith('+') && !line.startsWith('+++')) {
        currentFiles.added.push(line.substring(1));
      } else if (line.startsWith('-') && !line.startsWith('---')) {
        currentFiles.removed.push(line.substring(1));
      }
    }

    if (currentFiles.path) {
      files.push(currentFiles);
    }

    return { files, lines };
  }

  /**
   * Check for security vulnerabilities
   */
  private checkSecurity(parsedDiff: ParsedDiff): SecurityIssue[] {
    const issues: SecurityIssue[] = [];

    const vulnerabilityPatterns = [
      { pattern: /password\s*=/i, severity: 'critical', name: 'Hardcoded Password' },
      { pattern: /secret\s*=/i, severity: 'critical', name: 'Hardcoded Secret' },
      { pattern: /apiKey\s*=/i, severity: 'critical', name: 'Hardcoded API Key' },
      { pattern: /eval\s*\(/i, severity: 'high', name: 'Dangerous eval() usage' },
      { pattern: /innerHTML\s*=/i, severity: 'high', name: 'innerHTML assignment' },
      { pattern: /document\.write/i, severity: 'high', name: 'document.write usage' },
      { pattern: /exec\s*\(/i, severity: 'critical', name: 'Code execution' },
      { pattern: /__proto__/i, severity: 'medium', name: 'Prototype pollution' },
      { pattern: /eval\s*\(.*\+/i, severity: 'high', name: 'Dynamic eval' },
      { pattern: /dangerouslySetInnerHTML/i, severity: 'medium', name: 'React dangerous HTML' },
    ];

    for (const file of parsedDiff.files) {
      for (const line of [...file.added, ...file.modified]) {
        for (const pattern of vulnerabilityPatterns) {
          if (pattern.pattern.test(line)) {
            issues.push({
              id: randomUUID(),
              severity: pattern.severity as SecuritySeverity,
              file: file.path,
              line: this.findLineNumber(line, parsedDiff.lines),
              type: pattern.name,
              description: `${pattern.name} detected in ${file.path}`,
              recommendation: this.getRecommendation(pattern.name),
            });
          }
        }
      }
    }

    return issues;
  }

  /**
   * Find line number in diff
   */
  private findLineNumber(line: string, allLines: string[]): number {
    let lineNum = 0;
    for (const l of allLines) {
      lineNum++;
      if (l.includes(line.substring(0, 20))) {
        return lineNum;
      }
    }
    return 0;
  }

  /**
   * Get recommendation for a security issue
   */
  private getRecommendation(type: string): string {
    const recommendations: Record<string, string> = {
      'Hardcoded Password': 'Use environment variables or a secrets manager',
      'Hardcoded Secret': 'Use environment variables or a secrets manager',
      'Hardcoded API Key': 'Use environment variables or a secrets manager',
      'Dangerous eval() usage': 'Avoid eval(); use safer alternatives like JSON.parse',
      'innerHTML assignment': 'Use textContent or DOM methods instead',
      'document.write': 'Use DOM manipulation methods',
      'Code execution': 'Avoid dynamic code execution',
      'Prototype pollution': 'Freeze objects or use Map instead',
      'Dynamic eval': 'Avoid dynamic code execution',
      'React dangerous HTML': 'Sanitize HTML or use safe alternatives',
    };
    return recommendations[type] || 'Review and fix the security issue';
  }

  /**
   * Check for anti-patterns
   */
  private checkAntiPatterns(parsedDiff: ParsedDiff): AntiPattern[] {
    const patterns: AntiPattern[] = [];

    const antiPatternDefinitions = [
      { name: 'God Object', pattern: /class\s+\w+\s+extends/i },
      { name: 'Long Method', pattern: /function\s+\w+\s*\([^)]*\)\s*{/ },
      { name: 'Large Class', pattern: /class\s+\w+/ },
      { name: 'Magic Numbers', pattern: /\b\d+\b.*=.*['"][\s\S]*['"]/ },
      { name: 'Duplication', pattern: /return\s+.*return\s+/s },
    ];

    for (const file of parsedDiff.files) {
      const content = [...file.added, ...file.removed, ...file.modified].join('\n');

      for (const patternDef of antiPatternDefinitions) {
        if (patternDef.pattern.test(content)) {
          patterns.push({
            id: randomUUID(),
            file: file.path,
            type: patternDef.name,
            line: 0,
            description: `${patternDef.name} anti-pattern detected in ${file.path}`,
            recommendation: `Consider refactoring to address ${patternDef.name}`,
          });
        }
      }
    }

    return patterns;
  }

  /**
   * Check test coverage
   */
  private checkTestCoverage(parsedDiff: ParsedDiff): TestCoverage {
    let testFiles = 0;
    let testMethods = 0;
    let productionFiles = 0;
    let productionMethods = 0;

    for (const file of parsedDiff.files) {
      const path = file.path.toLowerCase();
      if (path.includes('test') || path.includes('spec')) {
        testFiles++;
        testMethods += file.added.filter((l) => l.includes('it(') || l.includes('test(')).length;
      } else {
        productionFiles++;
        productionMethods += file.added.filter((l) => l.includes('function ') || l.includes('const ') || l.includes('class ')).length;
      }
    }

    const testRatio = productionFiles > 0 ? testFiles / productionFiles : 0;
    const isAdequate = testRatio >= 0.2;

    return {
      testFiles,
      productionFiles,
      testMethods,
      productionMethods,
      ratio: testRatio,
      isAdequate,
      recommendations: isAdequate
        ? ['Test coverage looks adequate']
        : ['Consider adding more tests', 'Aim for at least 1 test file per 5 production files'],
    };
  }

  /**
   * Generate review comments
   */
  private generateComments(data: {
    security: SecurityIssue[];
    antiPatterns: AntiPattern[];
    testCoverage: TestCoverage;
  }): ReviewComment[] {
    const comments: ReviewComment[] = [];

    for (const issue of data.security) {
      comments.push({
        type: 'security',
        severity: issue.severity,
        file: issue.file,
        line: issue.line,
        message: `[${issue.severity.toUpperCase()}] ${issue.description}`,
        suggestion: issue.recommendation,
      });
    }

    for (const pattern of data.antiPatterns) {
      comments.push({
        type: 'anti-pattern',
        severity: 'medium',
        file: pattern.file,
        line: pattern.line,
        message: pattern.description,
        suggestion: pattern.recommendation,
      });
    }

    for (const rec of data.testCoverage.recommendations) {
      comments.push({
        type: 'coverage',
        severity: 'low',
        file: '',
        line: 0,
        message: rec,
        suggestion: 'Review test coverage and add missing tests',
      });
    }

    return comments;
  }

  /**
   * Calculate overall score
   */
  private calculateScore(
    securityIssues: SecurityIssue[],
    antiPatterns: AntiPattern[],
    testCoverage: TestCoverage
  ): number {
    let score = 100;

    // Deduct for security issues
    const severityWeights: Record<SecuritySeverity, number> = {
      critical: 25,
      high: 15,
      medium: 10,
      low: 5,
    };
    for (const issue of securityIssues) {
      score -= severityWeights[issue.severity] || 5;
    }

    // Deduct for anti-patterns
    score -= antiPatterns.length * 5;

    // Adjust for test coverage
    if (!testCoverage.isAdequate) {
      score -= 10;
    }

    return Math.max(0, Math.min(100, score));
  }

  /**
   * Post comments to a pull request
   */
  async postCommentsToPR(
    report: CodeReviewReport,
    prUrl: string,
    apiKey: string
  ): Promise<{ success: boolean; errors?: string[] }> {
    // In production, would use GitHub/GitLab API
    // For simulation, just log

    console.log(`[CodeReviewAgent] Posting ${report.comments.length} comments to ${prUrl}`);

    return {
      success: true,
    };
  }

  /**
   * Get review history
   */
  getHistory(): ReviewRecord[] {
    return this.reviewHistory;
  }

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
  } {
    if (this.reviewHistory.length === 0) {
      return {
        totalReviews: 0,
        avgScore: 0,
        criticalIssues: 0,
        highIssues: 0,
        antiPatternsFound: 0,
        avgTestCoverage: 0,
      };
    }

    let totalScore = 0;
    let criticalCount = 0;
    let highCount = 0;
    let totalAntiPatterns = 0;
    let totalCoverage = 0;

    for (const review of this.reviewHistory) {
      totalScore += review.report.overallScore;
      criticalCount += review.report.securityIssues.filter((i) => i.severity === 'critical').length;
      highCount += review.report.securityIssues.filter((i) => i.severity === 'high').length;
      totalAntiPatterns += review.report.antiPatterns.length;
      totalCoverage += review.report.testCoverage.isAdequate
        ? 100
        : review.report.testCoverage.ratio * 100;
    }

    return {
      totalReviews: this.reviewHistory.length,
      avgScore: totalScore / this.reviewHistory.length,
      criticalIssues: criticalCount,
      highIssues: highCount,
      antiPatternsFound: totalAntiPatterns,
      avgTestCoverage: totalCoverage / this.reviewHistory.length,
    };
  }
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
export function createCodeReviewAgent(options: AgentOptions): CodeReviewAgent {
  return new CodeReviewAgent(options);
}
