import { randomUUID } from 'crypto';
import * as fs from 'fs';
import * as path from 'path';

export interface LegacyLetter {
  id: string;
  recipientEmail: string;
  subject: string;
  content: string;
  createdAt: Date;
  lastUpdated: Date;
  scheduledSendDate?: Date;
}

export interface ReflectionQuestion {
  id: string;
  question: string;
  category: 'values' | 'achievements' | 'relationships' | 'lessons' | 'wisdom' | 'memories';
  response?: string;
  askedAt?: Date;
}

export interface LifeNarrative {
  id: string;
  title: string;
  sections: NarrativeSection[];
  createdAt: Date;
  lastUpdated: Date;
}

export interface NarrativeSection {
  title: string;
  content: string;
  period: string;
  themes: string[];
}

export interface DeadManSwitchConfig {
  checkInterval: number;
  offlineThresholdDays: number;
  recipients: string[];
  letterTemplate: string;
  enableReflection: boolean;
}

const DEFAULT_CONFIG: DeadManSwitchConfig = {
  checkInterval: 24 * 60 * 60 * 1000,
  offlineThresholdDays: 90,
  recipients: [],
  letterTemplate: 'legacy-letter',
  enableReflection: true,
};

const REFLECTION_QUESTIONS: Omit<ReflectionQuestion, 'response' | 'askedAt'>[] = [
  {
    id: '1',
    question: 'What are the three accomplishments you are most proud of?',
    category: 'achievements',
  },
  { id: '2', question: 'What values do you want your loved ones to remember?', category: 'values' },
  {
    id: '3',
    question: 'Who has had the biggest positive impact on your life?',
    category: 'relationships',
  },
  { id: '4', question: 'What is the most important lesson life taught you?', category: 'lessons' },
  { id: '5', question: 'What wisdom would you pass on to future generations?', category: 'wisdom' },
  { id: '6', question: 'What is your happiest memory?', category: 'memories' },
  { id: '7', question: 'What do you wish you had done differently?', category: 'lessons' },
  { id: '8', question: 'What brings you the most joy?', category: 'values' },
  { id: '9', question: 'What are you most curious about?', category: 'wisdom' },
  { id: '10', question: 'How do you want to be remembered?', category: 'values' },
];

export class LegacyLetterSystem {
  private config: DeadManSwitchConfig;
  private letters: Map<string, LegacyLetter> = new Map();
  private narrative: LifeNarrative | null = null;
  private reflectionHistory: ReflectionQuestion[] = [];
  private lastActivityDate: Date = new Date();
  private currentQuestionIndex: number = 0;
  private dataPath: string;

  constructor(config: Partial<DeadManSwitchConfig> = {}, dataPath: string = './memory') {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.dataPath = dataPath;
    this.loadData();
  }

  private loadData(): void {
    const dataDir = path.join(this.dataPath, 'legacy');

    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }

    const lettersPath = path.join(dataDir, 'letters.json');
    if (fs.existsSync(lettersPath)) {
      try {
        const data = JSON.parse(fs.readFileSync(lettersPath, 'utf-8'));
        this.letters = new Map(data.letters || []);
        this.lastActivityDate = new Date(data.lastActivityDate || Date.now());
      } catch {}
    }

    const narrativePath = path.join(dataDir, 'narrative.json');
    if (fs.existsSync(narrativePath)) {
      try {
        this.narrative = JSON.parse(fs.readFileSync(narrativePath, 'utf-8'));
      } catch {}
    }

    const reflectionsPath = path.join(dataDir, 'reflections.json');
    if (fs.existsSync(reflectionsPath)) {
      try {
        this.reflectionHistory = JSON.parse(fs.readFileSync(reflectionsPath, 'utf-8'));
      } catch {}
    }
  }

  private saveData(): void {
    const dataDir = path.join(this.dataPath, 'legacy');

    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }

    fs.writeFileSync(
      path.join(dataDir, 'letters.json'),
      JSON.stringify(
        {
          letters: Array.from(this.letters.entries()),
          lastActivityDate: this.lastActivityDate,
        },
        null,
        2
      )
    );

    if (this.narrative) {
      fs.writeFileSync(
        path.join(dataDir, 'narrative.json'),
        JSON.stringify(this.narrative, null, 2)
      );
    }

    fs.writeFileSync(
      path.join(dataDir, 'reflections.json'),
      JSON.stringify(this.reflectionHistory, null, 2)
    );
  }

  recordActivity(): void {
    this.lastActivityDate = new Date();
    this.saveData();
  }

  async getNextReflectionQuestion(): Promise<ReflectionQuestion> {
    const question = REFLECTION_QUESTIONS[this.currentQuestionIndex % REFLECTION_QUESTIONS.length];

    this.currentQuestionIndex++;

    return {
      ...question,
      askedAt: new Date(),
    };
  }

  async submitReflection(questionId: string, response: string): Promise<void> {
    const existing = this.reflectionHistory.find((r) => r.id === questionId);

    if (existing) {
      existing.response = response;
      existing.askedAt = new Date();
    } else {
      this.reflectionHistory.push({
        id: questionId,
        question: REFLECTION_QUESTIONS.find((q) => q.id === questionId)?.question || '',
        category: REFLECTION_QUESTIONS.find((q) => q.id === questionId)?.category || 'wisdom',
        response,
        askedAt: new Date(),
      });
    }

    this.recordActivity();
    await this.updateNarrative();
  }

  private async updateNarrative(): Promise<void> {
    const reflections = this.reflectionHistory.filter((r) => r.response);

    if (reflections.length === 0) return;

    const byCategory = reflections.reduce(
      (acc, r) => {
        if (!acc[r.category]) acc[r.category] = [];
        acc[r.category].push(r);
        return acc;
      },
      {} as Record<string, ReflectionQuestion[]>
    );

    const sections: NarrativeSection[] = [];

    if (byCategory.achievements) {
      sections.push({
        title: 'Life Achievements',
        content: byCategory.achievements.map((r) => r.response).join('\n\n'),
        period: 'Present',
        themes: ['pride', 'success'],
      });
    }

    if (byCategory.values) {
      sections.push({
        title: 'Core Values',
        content: byCategory.values.map((r) => r.response).join('\n\n'),
        period: 'Everlasting',
        themes: ['principles', 'beliefs'],
      });
    }

    if (byCategory.relationships) {
      sections.push({
        title: 'Important Relationships',
        content: byCategory.relationships.map((r) => r.response).join('\n\n'),
        period: 'Lifelong',
        themes: ['love', 'connection'],
      });
    }

    if (byCategory.lessons) {
      sections.push({
        title: 'Life Lessons',
        content: byCategory.lessons.map((r) => r.response).join('\n\n'),
        period: 'Past to Present',
        themes: ['wisdom', 'growth'],
      });
    }

    if (byCategory.memories) {
      sections.push({
        title: 'Cherished Memories',
        content: byCategory.memories.map((r) => r.response).join('\n\n'),
        period: 'Past',
        themes: ['nostalgia', 'joy'],
      });
    }

    this.narrative = {
      id: randomUUID(),
      title: 'My Life Story',
      sections,
      createdAt: new Date(),
      lastUpdated: new Date(),
    };

    this.saveData();
  }

  async generateLegacyLetter(recipientEmail: string): Promise<LegacyLetter> {
    const letterContent = this.buildLetterContent();

    const letter: LegacyLetter = {
      id: randomUUID(),
      recipientEmail,
      subject: 'A Letter from Someone Who Cared About You',
      content: letterContent,
      createdAt: new Date(),
      lastUpdated: new Date(),
    };

    this.letters.set(letter.id, letter);
    this.saveData();

    return letter;
  }

  private buildLetterContent(): string {
    let content = '';

    if (this.narrative) {
      content += '# My Life Story\n\n';

      for (const section of this.narrative.sections) {
        content += `## ${section.title}\n\n`;
        content += `${section.content}\n\n`;
      }
    }

    content += '---\n\n';
    content += '# Reflections\n\n';

    const recentReflections = this.reflectionHistory.slice(-10);
    for (const reflection of recentReflections) {
      if (reflection.response) {
        content += `**Q: ${reflection.question}**\n\n`;
        content += `${reflection.response}\n\n`;
      }
    }

    content += `---\n\n`;
    content += `*This letter was generated on ${new Date().toLocaleDateString()} based on my reflections and life narrative.*\n`;

    return content;
  }

  checkIfShouldTrigger(): { shouldTrigger: boolean; daysSinceActivity: number } {
    const now = new Date();
    const daysSinceActivity = Math.floor(
      (now.getTime() - this.lastActivityDate.getTime()) / (1000 * 60 * 60 * 24)
    );

    return {
      shouldTrigger: daysSinceActivity >= this.config.offlineThresholdDays,
      daysSinceActivity,
    };
  }

  async triggerLegacyLetters(): Promise<{ sent: number; failed: number }> {
    const trigger = this.checkIfShouldTrigger();

    if (!trigger.shouldTrigger) {
      return { sent: 0, failed: 0 };
    }

    let sent = 0;
    let failed = 0;

    for (const recipient of this.config.recipients) {
      try {
        await this.sendLegacyLetter(recipient);
        sent++;
      } catch {
        failed++;
      }
    }

    return { sent, failed };
  }

  private async sendLegacyLetter(recipient: string): Promise<void> {
    const letter = await this.generateLegacyLetter(recipient);

    console.log(`[Legacy Letter] Would send to ${recipient}:`);
    console.log(`Subject: ${letter.subject}`);
    console.log(`Content length: ${letter.content.length} chars`);
  }

  async configureRecipients(emails: string[]): Promise<void> {
    this.config.recipients = emails;
    this.saveData();
  }

  getNarrative(): LifeNarrative | null {
    return this.narrative;
  }

  getReflectionHistory(): ReflectionQuestion[] {
    return this.reflectionHistory;
  }

  getStatus(): {
    lastActivity: Date;
    daysSinceActivity: number;
    reflectionsCount: number;
    narrativeSections: number;
    configuredRecipients: number;
  } {
    const now = new Date();
    const daysSinceActivity = Math.floor(
      (now.getTime() - this.lastActivityDate.getTime()) / (1000 * 60 * 60 * 24)
    );

    return {
      lastActivity: this.lastActivityDate,
      daysSinceActivity,
      reflectionsCount: this.reflectionHistory.filter((r) => r.response).length,
      narrativeSections: this.narrative?.sections.length || 0,
      configuredRecipients: this.config.recipients.length,
    };
  }
}

export const legacyLetterSystem = new LegacyLetterSystem();
