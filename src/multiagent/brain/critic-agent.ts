import { Agent } from '../../core/agent.js';
import { AgentOptions } from '../../core/agent.js';

/**
 * Critique Agent - Self-critique loop with quality scoring
 */
export class CriticAgent extends Agent {
  private critiqueHistory: CritiqueRecord[] = [];

  constructor(options: AgentOptions) {
    super(options);
  }

  /**
   * Evaluate a response against quality rubric
   */
  evaluate(response: string, task: string, expectedOutcome?: string): CritiqueResult {
    const scores = {
      accuracy: this.scoreAccuracy(response, expectedOutcome),
      completeness: this.scoreCompleteness(response, task),
      tone: this.scoreTone(response),
      usefulness: this.scoreUsefulness(response, task),
    };

    const avgScore = (scores.accuracy + scores.completeness + scores.tone + scores.usefulness) / 4;

    const critique: CritiqueResult = {
      score: avgScore,
      scores,
      feedback: this.generateFeedback(scores),
      shouldRetry: avgScore < 7,
    };

    this.critiqueHistory.push({ ...critique, timestamp: new Date() });

    return critique;
  }

  /**
   * Score accuracy (0-10)
   */
  private scoreAccuracy(response: string, expectedOutcome?: string): number {
    if (!expectedOutcome) return 7; // Default if no expectation

    const responseLower = response.toLowerCase();
    const expectedLower = expectedOutcome.toLowerCase();

    // Simple keyword matching for accuracy
    const expectedWords = expectedLower.split(/\s+/);
    const matchingWords = expectedWords.filter((word) => responseLower.includes(word));

    const accuracy = (matchingWords.length / expectedWords.length) * 10;

    return Math.min(10, Math.max(0, accuracy));
  }

  /**
   * Score completeness (0-10)
   */
  private scoreCompleteness(response: string, task: string): number {
    const responseLength = response.trim().length;
    const taskComplexity = task.split(/\s+/).length;

    // More complex tasks need longer responses
    const expectedRatio = 0.1; // Response should be ~10% of task length for simple tasks

    let expectedLength = Math.max(50, taskComplexity * expectedRatio);

    // Adjust based on response
    if (response.includes('firstly') && response.includes('secondly') && response.includes('finally')) {
      expectedLength *= 1.5; // Multi-step reasoning expected
    }

    const completeness = Math.min(10, (responseLength / expectedLength) * 5);
    return Math.max(0, completeness);
  }

  /**
   * Score tone (0-10)
   */
  private scoreTone(response: string): number {
    const responseLower = response.toLowerCase();

    // Check for positive tone indicators
    const positiveIndicators = ['i can', 'sure', 'happy to', 'glad to', 'certainly', 'absolutely'];
    const negativeIndicators = ["i can't", 'unable', 'unfortunately', 'sorry', 'cannot'];

    let score = 7; // Base score

    for (const indicator of positiveIndicators) {
      if (responseLower.includes(indicator)) {
        score += 0.5;
      }
    }

    for (const indicator of negativeIndicators) {
      if (responseLower.includes(indicator)) {
        score -= 0.5;
      }
    }

    return Math.min(10, Math.max(0, score));
  }

  /**
   * Score usefulness (0-10)
   */
  private scoreUsefulness(response: string, task: string): number {
    const responseLower = response.toLowerCase();
    const taskLower = task.toLowerCase();

    // Check if response addresses the core task
    const taskKeywords = taskLower.split(/\s+/).filter((w) => w.length > 3);

    const matchingKeywords = taskKeywords.filter((keyword) => responseLower.includes(keyword));

    const usefulness = (matchingKeywords.length / taskKeywords.length) * 10;

    return Math.min(10, Math.max(0, usefulness));
  }

  /**
   * Generate feedback based on scores
   */
  private generateFeedback(scores: CritiqueScores): string {
    const feedback: string[] = [];

    if (scores.accuracy < 6) {
      feedback.push('- The response may contain inaccuracies. Verify factual claims.');
    }

    if (scores.completeness < 6) {
      feedback.push('- The response is incomplete. Consider the full scope of the task.');
    }

    if (scores.tone < 6) {
      feedback.push('- The tone could be more helpful. Maintain a positive, collaborative approach.');
    }

    if (scores.usefulness < 6) {
      feedback.push('- The response doesn\'t fully address the task requirements.');
    }

    if (feedback.length === 0) {
      feedback.push('- Response meets quality standards');
    }

    return feedback.join('\n');
  }

  /**
   * Get critique history
   */
  getHistory(): CritiqueRecord[] {
    return this.critiqueHistory;
  }

  /**
   * Get average score over all critiques
   */
  getAverageScore(): number {
    if (this.critiqueHistory.length === 0) return 0;
    const sum = this.critiqueHistory.reduce((acc, r) => acc + r.score, 0);
    return sum / this.critiqueHistory.length;
  }
}

export interface CritiqueScores {
  accuracy: number;
  completeness: number;
  tone: number;
  usefulness: number;
}

export interface CritiqueResult {
  score: number;
  scores: CritiqueScores;
  feedback: string;
  shouldRetry: boolean;
}

export interface CritiqueRecord {
  score: number;
  scores: CritiqueScores;
  feedback: string;
  shouldRetry: boolean;
  timestamp: Date;
}

/**
 * Factory function to create a critic agent
 */
export function createCriticAgent(options: AgentOptions): CriticAgent {
  return new CriticAgent(options);
}
