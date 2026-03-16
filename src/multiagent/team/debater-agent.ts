import { randomUUID } from 'crypto';
import { Agent } from '../../core/agent.js';
import { AgentOptions } from '../../core/agent.js';

/**
 * Debater Agent - Multi-agent debate coordination
 */
export class DebaterAgent extends Agent {
  private debateHistory: DebateRecord[] = [];
  private debateFormat: DebateFormat = {
    topic: '',
    sides: { pro: 'pro', con: 'con' },
    rules: { maxTurns: 5, timeLimit: 300, requiredArguments: [] },
  };

  constructor(options: AgentOptions) {
    super(options);
  }

  /**
   * Set up debate format
   */
  setupDebate(format: DebateFormat): void {
    this.debateFormat = format;
  }

  /**
   * Run a debate
   */
  async runDebate(
    topic: string,
    options?: {
      proAgent?: string;
      conAgent?: string;
      maxTurns?: number;
    }
  ): Promise<DebateResult> {
    this.setupDebate({
      topic,
      sides: { pro: 'pro', con: 'con' },
      rules: {
        maxTurns: options?.maxTurns || 5,
        timeLimit: 300,
        requiredArguments: ['evidence', 'logic', 'rebuttal'],
      },
    });

    const startTime = Date.now();

    // Generate opening arguments
    const proOpenings = this.generateOpening('pro', topic);
    const conOpenings = this.generateOpening('con', topic);

    // Generate rebuttals
    const proRebuttals = this.generateRebuttals('pro', topic, conOpenings);
    const conRebuttals = this.generateRebuttals('con', topic, proOpenings);

    // Generate closing arguments
    const proClosings = this.generateClosing('pro', topic, proOpenings, conRebuttals);
    const conClosings = this.generateClosing('con', topic, conOpenings, proRebuttals);

    const result: DebateResult = {
      id: randomUUID(),
      topic,
      timestamp: new Date(),
      format: this.debateFormat,
      turns: [],
      pro: {
        agent: options?.proAgent || 'pro_agent',
        openings: proOpenings,
        rebuttals: proRebuttals,
        closings: proClosings,
        score: this.calculateArgumentScore(proOpenings, proRebuttals, proClosings),
      },
      con: {
        agent: options?.conAgent || 'con_agent',
        openings: conOpenings,
        rebuttals: conRebuttals,
        closings: conClosings,
        score: this.calculateArgumentScore(conOpenings, conRebuttals, conClosings),
      },
      synthesis: this.generateSynthesis(proOpenings, proRebuttals, conOpenings, conRebuttals),
      winner: this.determineWinner(
        this.calculateArgumentScore(proOpenings, proRebuttals, proClosings),
        this.calculateArgumentScore(conOpenings, conRebuttals, conClosings)
      ),
      duration: Date.now() - startTime,
    };

    this.debateHistory.push({ debate: result });
    return result;
  }

  /**
   * Generate opening arguments
   */
  private generateOpening(side: 'pro' | 'con', topic: string): OpeningArgument[] {
    const openingArguments: OpeningArgument[] = [];
    const argumentTypes = ['definition', 'principle', 'evidence', 'case'];

    for (const type of argumentTypes) {
      openingArguments.push({
        id: randomUUID(),
        type,
        content: this.generateArgumentContent(side, type, topic),
        strength: Math.random() * 0.3 + 0.7,
      });
    }

    return openingArguments;
  }

  /**
   * Generate argument content
   */
  private generateArgumentContent(side: string, type: string, topic: string): string {
    return `[${side.toUpperCase()}] ${type.charAt(0).toUpperCase() + type.slice(1)} argument for ${topic}. This establishes the foundational position that supports the ${side} stance.`;
  }

  /**
   * Generate rebuttals
   */
  private generateRebuttals(
    side: 'pro' | 'con',
    topic: string,
    opponentOpenings: OpeningArgument[]
  ): Rebuttal[] {
    return opponentOpenings.map((opening) => ({
      id: randomUUID(),
      targetOpeningId: opening.id,
      content: this.generateRebuttalContent(side, opening.type, topic),
      effectiveness: Math.random() * 0.3 + 0.6,
    }));
  }

  /**
   * Generate rebuttal content
   */
  private generateRebuttalContent(
    side: string,
    targetType: string,
    topic: string
  ): string {
    return `[${side.toUpperCase()}] Rebuttal to ${targetType} argument. While the opposing view presents some valid points, this analysis reveals key limitations in their reasoning.`;
  }

  /**
   * Generate closing arguments
   */
  private generateClosing(
    side: 'pro' | 'con',
    topic: string,
    openings: OpeningArgument[],
    rebuttals: Rebuttal[]
  ): ClosingArgument[] {
    return [
      {
        id: randomUUID(),
        content: this.generateClosingContent(side, topic, openings, rebuttals),
        summary: `The ${side} side has established a strong case through logical arguments and evidence.`,
        callToAction: `In conclusion, the ${side} position offers the most compelling approach to ${topic}.`,
      },
    ];
  }

  /**
   * Generate closing content
   */
  private generateClosingContent(
    side: string,
    topic: string,
    openings: OpeningArgument[],
    rebuttals: Rebuttal[]
  ): string {
    return `[${side.toUpperCase()}] Closing arguments for ${topic}. We have demonstrated through ${openings.length} key arguments and addressed ${rebuttals.length} opposing claims. The evidence supports our position.`;
  }

  /**
   * Calculate argument score
   */
  private calculateArgumentScore(
    openings: OpeningArgument[],
    rebuttals: Rebuttal[],
    closings: ClosingArgument[]
  ): number {
    const openingScore = openings.reduce((a, o) => a + o.strength, 0) / Math.max(1, openings.length);
    const rebuttalScore = rebuttals.reduce((a, r) => a + r.effectiveness, 0) / Math.max(1, rebuttals.length);
    const closingScore = closings.length > 0 ? 0.8 : 0;

    return (openingScore + rebuttalScore + closingScore) / 3;
  }

  /**
   * Generate synthesis of the debate
   */
  private generateSynthesis(
    proOpenings: OpeningArgument[],
    proRebuttals: Rebuttal[],
    conOpenings: OpeningArgument[],
    conRebuttals: Rebuttal[]
  ): DebateSynthesis {
    return {
      keyPoints: [
        'Both sides agree on the importance of the core issue',
        'Disagreement centers on the optimal approach',
        'Evidence from both sides has merit',
        'Further research would strengthen either position',
      ],
      strengths: {
        pro: proOpenings.length,
        con: conOpenings.length,
      },
      weaknesses: {
        pro: proRebuttals.some((r) => r.effectiveness < 0.5) ? 'Some rebuttals were weak' : 'None identified',
        con: conRebuttals.some((r) => r.effectiveness < 0.5) ? 'Some rebuttals were weak' : 'None identified',
      },
      commonGround: 'Both sides want the best outcome for the topic',
    };
  }

  /**
   * Determine winner based on scores
   */
  private determineWinner(proScore: number, conScore: number): 'pro' | 'con' | 'tie' {
    const diff = Math.abs(proScore - conScore);
    if (diff < 0.1) return 'tie';
    return proScore > conScore ? 'pro' : 'con';
  }

  /**
   * Get debate history
   */
  getHistory(): DebateRecord[] {
    return this.debateHistory;
  }

  /**
   * Get statistics
   */
  getStats(): {
    totalDebates: number;
    avgTurns: number;
    winRate: { pro: number; con: number; tie: number };
  } {
    if (this.debateHistory.length === 0) {
      return {
        totalDebates: 0,
        avgTurns: 0,
        winRate: { pro: 0, con: 0, tie: 0 },
      };
    }

    let proWins = 0;
    let conWins = 0;
    let ties = 0;

    for (const record of this.debateHistory) {
      if (record.debate.winner === 'pro') proWins++;
      else if (record.debate.winner === 'con') conWins++;
      else ties++;
    }

    return {
      totalDebates: this.debateHistory.length,
      avgTurns: this.debateHistory.reduce((a, r) => a + r.debate.format.rules.maxTurns, 0) / this.debateHistory.length,
      winRate: {
        pro: proWins / this.debateHistory.length,
        con: conWins / this.debateHistory.length,
        tie: ties / this.debateHistory.length,
      },
    };
  }
}

export interface OpeningArgument {
  id: string;
  type: string;
  content: string;
  strength: number;
}

export interface Rebuttal {
  id: string;
  targetOpeningId: string;
  content: string;
  effectiveness: number;
}

export interface ClosingArgument {
  id: string;
  content: string;
  summary: string;
  callToAction: string;
}

export interface DebateResult {
  id: string;
  topic: string;
  timestamp: Date;
  format: DebateFormat;
  turns: any[];
  pro: {
    agent: string;
    openings: OpeningArgument[];
    rebuttals: Rebuttal[];
    closings: ClosingArgument[];
    score: number;
  };
  con: {
    agent: string;
    openings: OpeningArgument[];
    rebuttals: Rebuttal[];
    closings: ClosingArgument[];
    score: number;
  };
  synthesis: DebateSynthesis;
  winner: 'pro' | 'con' | 'tie';
  duration: number;
}

export interface DebateSynthesis {
  keyPoints: string[];
  strengths: { pro: number; con: number };
  weaknesses: { pro: string; con: string };
  commonGround: string;
}

export interface DebateFormat {
  topic: string;
  sides: { pro: string; con: string };
  rules: {
    maxTurns: number;
    timeLimit: number;
    requiredArguments: string[];
  };
}

export interface DebateRecord {
  debate: DebateResult;
}

/**
 * Factory function to create a debater agent
 */
export function createDebaterAgent(options: AgentOptions): DebaterAgent {
  return new DebaterAgent(options);
}
