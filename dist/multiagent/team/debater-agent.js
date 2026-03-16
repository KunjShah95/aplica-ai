import { randomUUID } from 'crypto';
import { Agent } from '../../core/agent.js';
/**
 * Debater Agent - Multi-agent debate coordination
 */
export class DebaterAgent extends Agent {
    debateHistory = [];
    debateFormat = {
        topic: '',
        sides: { pro: 'pro', con: 'con' },
        rules: { maxTurns: 5, timeLimit: 300, requiredArguments: [] },
    };
    constructor(options) {
        super(options);
    }
    /**
     * Set up debate format
     */
    setupDebate(format) {
        this.debateFormat = format;
    }
    /**
     * Run a debate
     */
    async runDebate(topic, options) {
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
        const result = {
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
            winner: this.determineWinner(this.calculateArgumentScore(proOpenings, proRebuttals, proClosings), this.calculateArgumentScore(conOpenings, conRebuttals, conClosings)),
            duration: Date.now() - startTime,
        };
        this.debateHistory.push({ debate: result });
        return result;
    }
    /**
     * Generate opening arguments
     */
    generateOpening(side, topic) {
        const openingArguments = [];
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
    generateArgumentContent(side, type, topic) {
        return `[${side.toUpperCase()}] ${type.charAt(0).toUpperCase() + type.slice(1)} argument for ${topic}. This establishes the foundational position that supports the ${side} stance.`;
    }
    /**
     * Generate rebuttals
     */
    generateRebuttals(side, topic, opponentOpenings) {
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
    generateRebuttalContent(side, targetType, topic) {
        return `[${side.toUpperCase()}] Rebuttal to ${targetType} argument. While the opposing view presents some valid points, this analysis reveals key limitations in their reasoning.`;
    }
    /**
     * Generate closing arguments
     */
    generateClosing(side, topic, openings, rebuttals) {
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
    generateClosingContent(side, topic, openings, rebuttals) {
        return `[${side.toUpperCase()}] Closing arguments for ${topic}. We have demonstrated through ${openings.length} key arguments and addressed ${rebuttals.length} opposing claims. The evidence supports our position.`;
    }
    /**
     * Calculate argument score
     */
    calculateArgumentScore(openings, rebuttals, closings) {
        const openingScore = openings.reduce((a, o) => a + o.strength, 0) / Math.max(1, openings.length);
        const rebuttalScore = rebuttals.reduce((a, r) => a + r.effectiveness, 0) / Math.max(1, rebuttals.length);
        const closingScore = closings.length > 0 ? 0.8 : 0;
        return (openingScore + rebuttalScore + closingScore) / 3;
    }
    /**
     * Generate synthesis of the debate
     */
    generateSynthesis(proOpenings, proRebuttals, conOpenings, conRebuttals) {
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
    determineWinner(proScore, conScore) {
        const diff = Math.abs(proScore - conScore);
        if (diff < 0.1)
            return 'tie';
        return proScore > conScore ? 'pro' : 'con';
    }
    /**
     * Get debate history
     */
    getHistory() {
        return this.debateHistory;
    }
    /**
     * Get statistics
     */
    getStats() {
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
            if (record.debate.winner === 'pro')
                proWins++;
            else if (record.debate.winner === 'con')
                conWins++;
            else
                ties++;
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
/**
 * Factory function to create a debater agent
 */
export function createDebaterAgent(options) {
    return new DebaterAgent(options);
}
//# sourceMappingURL=debater-agent.js.map