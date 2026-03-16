import { db } from '../db/index.js';
import { randomUUID } from 'crypto';
export class EpisodicReplay {
    patternExtractors = [];
    constructor() {
        this.registerDefaultExtractors();
    }
    registerDefaultExtractors() {
        this.patternExtractors.push({
            name: 'time_preference',
            extract: (messages) => this.extractTimePatterns(messages),
        });
        this.patternExtractors.push({
            name: 'tone_preference',
            extract: (messages) => this.extractTonePatterns(messages),
        });
        this.patternExtractors.push({
            name: 'topic_interest',
            extract: (messages) => this.extractTopicPatterns(messages),
        });
        this.patternExtractors.push({
            name: 'interaction_style',
            extract: (messages) => this.extractInteractionPatterns(messages),
        });
        this.patternExtractors.push({
            name: 'stress_indicators',
            extract: (messages) => this.extractStressPatterns(messages),
        });
    }
    async runDailyReplay(userId, date) {
        const startOfDay = new Date(date);
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(date);
        endOfDay.setHours(23, 59, 59, 999);
        const conversations = await db.conversation.findMany({
            where: {
                userId,
                createdAt: { gte: startOfDay, lte: endOfDay },
            },
            include: {
                messages: {
                    orderBy: { createdAt: 'asc' },
                },
            },
        });
        if (conversations.length === 0) {
            return [];
        }
        const episode = {
            date: date.toISOString().split('T')[0],
            messages: [],
            extractedInsights: [],
            topics: [],
            participants: [],
        };
        for (const conv of conversations) {
            for (const msg of conv.messages) {
                episode.messages.push({
                    role: msg.role,
                    content: msg.content,
                    timestamp: msg.createdAt,
                });
                if (msg.role === 'USER') {
                    const topics = this.extractTopics(msg.content);
                    episode.topics.push(...topics);
                }
            }
        }
        const insights = [];
        for (const extractor of this.patternExtractors) {
            const extracted = await extractor.extract(episode.messages);
            for (const item of extracted) {
                const existingInsight = await this.findSimilarInsight(userId, item.description);
                if (existingInsight) {
                    existingInsight.lastObserved = new Date();
                    existingInsight.occurrenceCount++;
                    existingInsight.confidence = Math.min(1, existingInsight.confidence + 0.1);
                    await this.updateInsight(existingInsight);
                    insights.push(existingInsight);
                }
                else {
                    const newInsight = {
                        id: randomUUID(),
                        userId,
                        type: this.mapExtractorToType(extractor.name),
                        description: item.description,
                        confidence: item.confidence || 0.5,
                        evidence: [item.evidence],
                        firstObserved: new Date(),
                        lastObserved: new Date(),
                        occurrenceCount: 1,
                    };
                    await this.storeInsight(newInsight);
                    insights.push(newInsight);
                }
            }
        }
        return insights;
    }
    async findSimilarInsight(userId, description) {
        const insights = await db.memory.findMany({
            where: {
                userId,
                type: 'FACT',
            },
        });
        for (const insight of insights) {
            const similarity = this.calculateSimilarity(insight.content, description);
            if (similarity > 0.8) {
                return {
                    id: insight.id,
                    userId: insight.userId,
                    type: 'pattern',
                    description: insight.content,
                    confidence: insight.importance || 0.5,
                    evidence: [],
                    firstObserved: insight.createdAt,
                    lastObserved: insight.lastAccessedAt || insight.createdAt,
                    occurrenceCount: insight.accessCount || 1,
                };
            }
        }
        return null;
    }
    async updateInsight(insight) {
        await db.memory.update({
            where: { id: insight.id },
            data: {
                importance: insight.confidence,
                lastAccessedAt: insight.lastObserved,
                accessCount: insight.occurrenceCount,
            },
        });
    }
    async storeInsight(insight) {
        await db.memory.create({
            data: {
                id: insight.id,
                userId: insight.userId,
                type: 'FACT',
                content: insight.description,
                metadata: {
                    insightType: insight.type,
                    confidence: insight.confidence,
                    evidence: insight.evidence,
                },
                importance: insight.confidence,
            },
        });
    }
    extractTopics(content) {
        const topics = [];
        const topicKeywords = {
            'work': ['deadline', 'project', 'meeting', 'client', 'boss', 'office'],
            'health': ['exercise', 'sleep', 'doctor', 'sick', 'fitness', 'diet'],
            'learning': ['learn', 'study', 'course', 'book', 'tutorial'],
            'finance': ['money', 'budget', 'invest', 'salary', 'expense'],
            'social': ['friend', 'family', 'party', 'date', 'call'],
        };
        const contentLower = content.toLowerCase();
        for (const [topic, keywords] of Object.entries(topicKeywords)) {
            if (keywords.some(k => contentLower.includes(k))) {
                topics.push(topic);
            }
        }
        return topics;
    }
    extractTimePatterns(messages) {
        const patterns = [];
        const userMessages = messages.filter(m => m.role === 'USER');
        const hourCounts = new Map();
        for (const msg of userMessages) {
            const hour = msg.timestamp.getHours();
            hourCounts.set(hour, (hourCounts.get(hour) || 0) + 1);
        }
        const peakHour = [...hourCounts.entries()].sort((a, b) => b[1] - a[1])[0];
        if (peakHour && peakHour[1] > 3) {
            const timeDesc = peakHour[0] < 12 ? 'morning' : peakHour[0] < 17 ? 'afternoon' : 'evening';
            patterns.push({
                description: `Most active during ${timeDesc} (around ${peakHour[0]}:00)`,
                confidence: Math.min(1, peakHour[1] / 10),
                evidence: `Based on ${peakHour[1]} messages`,
            });
        }
        return patterns;
    }
    extractTonePatterns(messages) {
        const patterns = [];
        const userMessages = messages.filter(m => m.role === 'USER');
        const questionCount = userMessages.filter(m => m.content.includes('?')).length;
        const exclamationCount = userMessages.filter(m => m.content.includes('!')).length;
        const avgLength = userMessages.reduce((sum, m) => sum + m.content.length, 0) / Math.max(1, userMessages.length);
        if (questionCount / Math.max(1, userMessages.length) > 0.3) {
            patterns.push({
                description: 'Tends to ask many questions - curious communication style',
                confidence: 0.7,
                evidence: `${questionCount} questions out of ${userMessages.length} messages`,
            });
        }
        if (exclamationCount / Math.max(1, userMessages.length) > 0.2) {
            patterns.push({
                description: 'Expressive communication with enthusiasm',
                confidence: 0.6,
                evidence: `${exclamationCount} exclamations detected`,
            });
        }
        if (avgLength > 200) {
            patterns.push({
                description: 'Prefers detailed, comprehensive messages',
                confidence: 0.7,
                evidence: `Average message length: ${Math.round(avgLength)} characters`,
            });
        }
        else if (avgLength < 50) {
            patterns.push({
                description: 'Prefers brief, concise messages',
                confidence: 0.7,
                evidence: `Average message length: ${Math.round(avgLength)} characters`,
            });
        }
        return patterns;
    }
    extractTopicPatterns(messages) {
        const allTopics = messages
            .filter(m => m.role === 'USER')
            .flatMap(m => this.extractTopics(m.content));
        const topicCounts = new Map();
        for (const topic of allTopics) {
            topicCounts.set(topic, (topicCounts.get(topic) || 0) + 1);
        }
        const patterns = [];
        for (const [topic, count] of topicCounts) {
            if (count >= 2) {
                patterns.push({
                    description: `Focused on ${topic} today`,
                    confidence: Math.min(1, count / 5),
                    evidence: `${count} messages about ${topic}`,
                });
            }
        }
        return patterns;
    }
    extractInteractionPatterns(messages) {
        const patterns = [];
        const userMessages = messages.filter(m => m.role === 'USER');
        const followUps = userMessages.filter(m => {
            const lower = m.content.toLowerCase();
            return lower.includes('also') || lower.includes('another') || lower.includes('additionally');
        }).length;
        if (followUps > 2) {
            patterns.push({
                description: 'Tends to add follow-up requests - iterative communication style',
                confidence: 0.7,
                evidence: `${followUps} follow-up messages detected`,
            });
        }
        const thanksCount = userMessages.filter(m => m.content.toLowerCase().includes('thank') || m.content.toLowerCase().includes('thanks')).length;
        if (thanksCount > 0) {
            patterns.push({
                description: 'Polite communication - frequently expresses gratitude',
                confidence: Math.min(1, thanksCount / 5),
                evidence: `${thanksCount} expressions of gratitude`,
            });
        }
        return patterns;
    }
    extractStressPatterns(messages) {
        const patterns = [];
        const userMessages = messages.filter(m => m.role === 'USER');
        const stressKeywords = ['urgent', 'asap', 'deadline', 'stressed', 'overwhelmed', 'panic', 'emergency'];
        const urgencyKeywords = ['right now', 'immediately', 'hurry', 'running out of time'];
        let stressCount = 0;
        let urgencyCount = 0;
        for (const msg of userMessages) {
            const lower = msg.content.toLowerCase();
            if (stressKeywords.some(k => lower.includes(k)))
                stressCount++;
            if (urgencyKeywords.some(k => lower.includes(k)))
                urgencyCount++;
        }
        if (stressCount >= 2) {
            patterns.push({
                description: 'Appears stressed about multiple things today',
                confidence: 0.6,
                evidence: `${stressCount} stress indicators detected`,
            });
        }
        if (urgencyCount >= 2) {
            patterns.push({
                description: 'Feeling time pressure - multiple urgent requests',
                confidence: 0.65,
                evidence: `${urgencyCount} urgency indicators`,
            });
        }
        const deadlinePattern = /friday|monday|tomorrow|end of (day|week|month)/gi;
        const deadlineCount = userMessages.filter(m => deadlinePattern.test(m.content)).length;
        if (deadlineCount > 0) {
            patterns.push({
                description: 'Deadline-focused - mentioned upcoming deadlines',
                confidence: 0.5,
                evidence: `${deadlineCount} deadline-related messages`,
            });
        }
        return patterns;
    }
    mapExtractorToType(extractorName) {
        const mapping = {
            time_preference: 'pattern',
            tone_preference: 'preference',
            topic_interest: 'pattern',
            interaction_style: 'behavior',
            stress_indicators: 'emotional',
        };
        return mapping[extractorName] || 'pattern';
    }
    calculateSimilarity(a, b) {
        const aWords = new Set(a.toLowerCase().split(/\s+/));
        const bWords = new Set(b.toLowerCase().split(/\s+/));
        const intersection = [...aWords].filter(w => bWords.has(w));
        const unionArr = [...aWords, ...bWords];
        return intersection.length / unionArr.length;
    }
    async getInsights(userId, _types) {
        const memories = await db.memory.findMany({
            where: {
                userId,
                type: 'FACT',
            },
            orderBy: { importance: 'desc' },
            take: 50,
        });
        return memories.map(m => ({
            id: m.id,
            userId: m.userId,
            type: 'pattern',
            description: m.content,
            confidence: m.importance || 0.5,
            evidence: [],
            firstObserved: m.createdAt,
            lastObserved: m.lastAccessedAt || m.createdAt,
            occurrenceCount: m.accessCount || 1,
        }));
    }
}
export const episodicReplay = new EpisodicReplay();
//# sourceMappingURL=episodic-replay.js.map