import { randomUUID } from 'crypto';
import { Agent } from '../../core/agent.js';
import { AgentOptions } from '../../core/agent.js';

/**
 * Critic Agent - Peer review and feedback generation
 */
export class CriticAgent extends Agent {
  private reviewHistory: CritiqueRecord[] = [];
  private approvalThreshold = 7; // Minimum score to pass review

  constructor(options: AgentOptions) {
    super(options);
  }

  /**
   * Review a draft
   */
  async reviewDraft(
    draft: string,
    context?: {
      purpose?: string;
      audience?: string;
      requirements?: string[];
    }
  ): Promise<CritiqueResult> {
    const startTime = Date.now();

    // Analyze the draft
    const analysis = this.analyzeDraft(draft, context);

    // Score the draft
    const scores = this.scoreDraft(analysis, context);

    // Generate feedback
    const feedback = this.generateFeedback(scores, context);

    // Determine if revision is needed
    const shouldRevise = scores.overall < this.approvalThreshold;

    const result: CritiqueResult = {
      id: randomUUID(),
      draftId: context?.purpose || 'unknown',
      scores,
      feedback,
      shouldRevise,
      analysis,
      reviewedAt: new Date(),
      duration: Date.now() - startTime,
    };

    this.reviewHistory.push({
      critique: result,
      reviewer: 'CriticAgent',
    });
    return result;
  }

  /**
   * Analyze a draft
   */
  private analyzeDraft(
    draft: string,
    context?: { purpose?: string; audience?: string }
  ): DraftAnalysis {
    const words = draft.split(/\s+/).length;
    const sentences = draft.split(/[.!?]+/).length;

    // Check for common issues
    const hasClarityIssues = this.checkClarity(draft);
    const hasToneIssues = this.checkTone(draft, context?.audience);
    const hasStructureIssues = this.checkStructure(draft);

    return {
      wordCount: words,
      sentenceCount: sentences,
      averageSentenceLength: words / Math.max(1, sentences),
      clarityIssues: hasClarityIssues,
      toneIssues: hasToneIssues,
      structureIssues: hasStructureIssues,
      issues: [...(hasClarityIssues ? ['clarity'] : []), ...(hasToneIssues ? ['tone'] : []), ...(hasStructureIssues ? ['structure'] : [])],
    };
  }

  /**
   * Check for clarity issues
   */
  private checkClarity(draft: string): boolean {
    const complexWords = [
      'furthermore',
      'moreover',
      'consequently',
      'therefore',
      'hence',
      'whereas',
    ];
    const complexWordCount = complexWords.filter((w) =>
      new RegExp(`\\b${w}\\b`, 'i').test(draft)
    ).length;
    return complexWordCount > 3;
  }

  /**
   * Check for tone issues
   */
  private checkTone(draft: string, audience?: string): boolean {
    if (!audience) return false;

    // Simple tone check - would be more sophisticated in production
    const informalWords = ['hey', 'hiya', 'guy', 'stuff', 'thing'];
    const formalWords = ['regards', 'sincerely', 'respectfully'];

    if (audience === 'formal') {
      const hasInformal = informalWords.some((w) => new RegExp(`\\b${w}\\b`, 'i').test(draft));
      return hasInformal;
    }

    if (audience === 'casual') {
      const hasFormal = formalWords.some((w) => new RegExp(`\\b${w}\\b`, 'i').test(draft));
      return hasFormal;
    }

    return false;
  }

  /**
   * Check for structure issues
   */
  private checkStructure(draft: string): boolean {
    const hasIntroduction = /intro|begin|first|initial/i.test(draft);
    const hasConclusion = /conclusion|final|last|summary/i.test(draft);
    const hasTransitions = /\bmoreover\b|\bhowever\b|\btherefore\b|\bfurthermore\b/i.test(draft);

    return !hasIntroduction || !hasConclusion || !hasTransitions;
  }

  /**
   * Score a draft
   */
  private scoreDraft(
    analysis: DraftAnalysis,
    context?: { purpose?: string; requirements?: string[] }
  ): DraftScores {
    // Base score
    let baseScore = 7;

    // Adjust for word count (optimal range 100-500 words)
    if (analysis.wordCount < 50 || analysis.wordCount > 1000) {
      baseScore -= 1;
    }

    // Adjust for clarity
    if (analysis.clarityIssues) {
      baseScore -= 1.5;
    }

    // Adjust for tone
    if (analysis.toneIssues) {
      baseScore -= 1;
    }

    // Adjust for structure
    if (analysis.structureIssues) {
      baseScore -= 1;
    }

    return {
      overall: Math.max(0, Math.min(10, baseScore)),
      clarity: analysis.clarityIssues ? 5 : 8,
      tone: analysis.toneIssues ? 6 : 8,
      structure: analysis.structureIssues ? 5 : 8,
      completeness: Math.min(10, Math.max(5, 7 + analysis.wordCount / 100)),
    };
  }

  /**
   * Generate feedback
   */
  private generateFeedback(
    scores: DraftScores,
    context?: { purpose?: string; audience?: string }
  ): Feedback {
    const comments: string[] = [];

    if (scores.clarity < 7) {
      comments.push('- Consider simplifying complex sentences and reducing jargon');
    }

    if (scores.tone < 7) {
      const tone = context?.audience || 'the target audience';
      comments.push(`- Adjust tone to better match ${tone}`);
    }

    if (scores.structure < 7) {
      comments.push('- Improve structure with clear introduction, body, and conclusion');
      comments.push('- Use transition words between paragraphs');
    }

    if (scores.overall >= 7) {
      comments.push('- Good work overall');
      comments.push('- Consider minor refinements for polish');
    }

    return {
      summary: this.generateSummary(scores),
      comments,
      suggestedImprovements: this.getSuggestedImprovements(scores),
    };
  }

  /**
   * Generate summary
   */
  private generateSummary(scores: DraftScores): string {
    const ratings = {
      excellent: 'Excellent',
      good: 'Good',
      fair: 'Fair',
      poor: 'Poor',
    };

    let rating = ratings.excellent;
    if (scores.overall < 9) rating = ratings.good;
    if (scores.overall < 7) rating = ratings.fair;
    if (scores.overall < 5) rating = ratings.poor;

    return `The draft is ${rating} with a score of ${scores.overall.toFixed(1)}/10.`;
  }

  /**
   * Get suggested improvements
   */
  private getSuggestedImprovements(scores: DraftScores): string[] {
    const improvements: string[] = [];

    if (scores.clarity < 8) {
      improvements.push('Replace complex words with simpler alternatives');
    }

    if (scores.tone < 8) {
      improvements.push('Review tone consistency throughout');
    }

    if (scores.structure < 8) {
      improvements.push('Add section headers for better organization');
    }

    if (scores.completeness < 7) {
      improvements.push('Expand on key points with more detail');
    }

    return improvements;
  }

  /**
   * Final approval check
   */
  canApprove(critique?: CritiqueResult): boolean {
    return (critique?.scores.overall || 0) >= this.approvalThreshold;
  }

  /**
   * Get review history
   */
  getHistory(): CritiqueRecord[] {
    return this.reviewHistory;
  }

  /**
   * Get statistics
   */
  getStats(): {
    totalReviews: number;
    approvalRate: number;
    avgScore: number;
  } {
    if (this.reviewHistory.length === 0) {
      return {
        totalReviews: 0,
        approvalRate: 0,
        avgScore: 0,
      };
    }

    const approved = this.reviewHistory.filter((r) => !r.critique.shouldRevise).length;

    return {
      totalReviews: this.reviewHistory.length,
      approvalRate: approved / this.reviewHistory.length,
      avgScore:
        this.reviewHistory.reduce((a, r) => a + r.critique.scores.overall, 0) /
        this.reviewHistory.length,
    };
  }
}

export interface DraftAnalysis {
  wordCount: number;
  sentenceCount: number;
  averageSentenceLength: number;
  clarityIssues: boolean;
  toneIssues: boolean;
  structureIssues: boolean;
  issues: string[];
}

export interface DraftScores {
  overall: number;
  clarity: number;
  tone: number;
  structure: number;
  completeness: number;
}

export interface Feedback {
  summary: string;
  comments: string[];
  suggestedImprovements: string[];
}

export interface CritiqueResult {
  id: string;
  draftId: string;
  scores: DraftScores;
  feedback: Feedback;
  shouldRevise: boolean;
  analysis: DraftAnalysis;
  reviewedAt: Date;
  duration: number;
}

export interface CritiqueRecord {
  critique: CritiqueResult;
  reviewer: string;
}

/**
 * Factory function to create a critic agent
 */
export function createCriticTeamAgent(options: AgentOptions): CriticAgent {
  return new CriticAgent(options);
}
