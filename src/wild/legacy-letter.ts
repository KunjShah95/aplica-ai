import { randomUUID } from 'crypto';

export interface MemoryFragment {
  id: string;
  category: 'achievement' | 'relationship' | 'lesson' | 'value' | 'story' | 'advice';
  title: string;
  content: string;
  date?: Date;
  emotions: string[];
  people: string[];
  importance: number;
}

export interface LegacyLetter {
  id: string;
  recipientId: string;
  recipientName: string;
  type: 'birthday' | 'anniversary' | 'farewell' | 'apology' | 'gratitude' | 'advice' | 'reflection';
  title: string;
  content: string;
  triggerDate?: Date;
  status: 'draft' | 'scheduled' | 'sent';
  createdAt: Date;
  scheduledFor?: Date;
  sentAt?: Date;
}

export interface LifeSummary {
  userId: string;
  values: string[];
  proudest: MemoryFragment[];
  lessons: MemoryFragment[];
  relationships: { name: string; relationship: string; note: string }[];
  advice: string[];
  milestones: Array<{ year: string; event: string }>;
}

export class LegacyLetterSystem {
  private memories: Map<string, MemoryFragment[]> = new Map();
  private letters: Map<string, LegacyLetter[]> = new Map();

  async addMemory(userId: string, memory: Omit<MemoryFragment, 'id'>): Promise<MemoryFragment> {
    const fragment: MemoryFragment = {
      ...memory,
      id: randomUUID(),
    };

    const userMemories = this.memories.get(userId) || [];
    userMemories.push(fragment);
    this.memories.set(userId, userMemories);

    return fragment;
  }

  async getMemories(
    userId: string,
    category?: MemoryFragment['category']
  ): Promise<MemoryFragment[]> {
    const memories = this.memories.get(userId) || [];
    if (category) {
      return memories.filter((m) => m.category === category);
    }
    return memories;
  }

  async createLetter(
    userId: string,
    recipientId: string,
    recipientName: string,
    type: LegacyLetter['type'],
    title: string,
    content: string,
    triggerDate?: Date
  ): Promise<LegacyLetter> {
    const letter: LegacyLetter = {
      id: randomUUID(),
      recipientId,
      recipientName,
      type,
      title,
      content,
      triggerDate,
      status: triggerDate ? 'scheduled' : 'draft',
      createdAt: new Date(),
      scheduledFor: triggerDate,
    };

    const userLetters = this.letters.get(userId) || [];
    userLetters.push(letter);
    this.letters.set(userId, userLetters);

    return letter;
  }

  async generateLetter(
    userId: string,
    recipientId: string,
    recipientName: string,
    type: LegacyLetter['type']
  ): Promise<string> {
    const memories = this.getMemories(userId);

    const templates: Record<LegacyLetter['type'], (data: any) => string> = {
      birthday: ({ values, relationships }) =>
        `Dear ${recipientName},\n\nHappy Birthday! As I think about another year, I find myself reflecting on what matters most.\n\n${this.generateValuesSection(values)}\n\n${this.generateRelationshipsSection(relationships, recipientName)}\n\nWith love and best wishes.`,

      anniversary: ({ milestones, relationships }) =>
        `Dear ${recipientName},\n\nCelebrating this anniversary with you has been one of life's greatest gifts.\n\n${this.generateMilestonesSection(milestones)}\n\n${this.generateRelationshipsSection(relationships, recipientName)}\n\nHere's to many more years together.`,

      farewell: ({ values, lessons, proudest }) =>
        `Dear ${recipientName},\n\nAs I write this, I find myself thinking about what truly matters.\n\n${this.generateValuesSection(values)}\n\n${this.generateLessonsSection(lessons)}\n\n${this.generateProudestSection(proudest)}\n\nThank you for being part of my journey.`,

      apology: ({ lessons }) =>
        `Dear ${recipientName},\n\nI've been thinking a lot about our relationship and the moments that could have been different.\n\n${this.generateLessonsSection(lessons)}\n\nI hope you can find it in your heart to understand.`,

      gratitude: ({ relationships, proudest }) =>
        `Dear ${recipientName},\n\nI wanted to take a moment to express my heartfelt gratitude.\n\n${this.generateRelationshipsSection(relationships, recipientName)}\n\n${this.generateProudestSection(proudest)}\n\nThank you for everything.`,

      advice: ({ lessons, values }) =>
        `Dear ${recipientName},\n\nIf I could share some wisdom with you, here it is:\n\n${this.generateValuesSection(values)}\n\n${this.generateLessonsSection(lessons)}\n\nTrust yourself. You've got this.`,

      reflection: ({ values, milestones, lessons }) =>
        `Dear ${recipientName},\n\nLooking back on my life, I wanted to share what's truly mattered to me.\n\n${this.generateValuesSection(values)}\n\n${this.generateMilestonesSection(milestones)}\n\n${this.generateLessonsSection(lessons)}\n\nWith love.`,
    };

    const userMemories = await memories;
    const data = {
      values: await this.extractValues(userMemories),
      lessons: userMemories.filter((m) => m.category === 'lesson'),
      proudest: userMemories
        .filter((m) => m.category === 'achievement')
        .sort((a, b) => b.importance - a.importance)
        .slice(0, 3),
      relationships: await this.extractRelationships(userMemories),
      milestones: this.extractMilestones(userMemories),
    };

    return templates[type](data);
  }

  private generateValuesSection(values: string[]): string {
    if (values.length === 0) return '';
    return `What I've learned about what matters most:\n${values.map((v) => `- ${v}`).join('\n')}\n`;
  }

  private generateRelationshipsSection(
    relationships: { name: string; relationship: string; note: string }[],
    recipientName: string
  ): string {
    const recipient = relationships.find((r) => r.name === recipientName);
    if (recipient) {
      return `Our relationship means ${recipient.note}`;
    }
    return '';
  }

  private generateLessonsSection(lessons: MemoryFragment[]): string {
    if (lessons.length === 0) return '';
    return `Lessons I've learned:\n${lessons
      .slice(0, 5)
      .map((l) => `- ${l.title}: ${l.content.slice(0, 100)}`)
      .join('\n')}\n`;
  }

  private generateProudestSection(proudest: MemoryFragment[]): string {
    if (proudest.length === 0) return '';
    return `Moments I'm most proud of:\n${proudest.map((p) => `- ${p.title}`).join('\n')}\n`;
  }

  private generateMilestonesSection(milestones: Array<{ year: string; event: string }>): string {
    if (milestones.length === 0) return '';
    return `Important moments:\n${milestones
      .slice(0, 5)
      .map((m) => `- ${m.year}: ${m.event}`)
      .join('\n')}\n`;
  }

  private async extractValues(memories: MemoryFragment[]): Promise<string[]> {
    const valueMemories = memories.filter((m) => m.category === 'value');
    return [...new Set(valueMemories.map((m) => m.title))].slice(0, 5);
  }

  private async extractRelationships(
    memories: MemoryFragment[]
  ): Promise<Array<{ name: string; relationship: string; note: string }>> {
    const peopleMap = new Map<string, { name: string; relationship: string; note: string }>();

    for (const memory of memories) {
      for (const person of memory.people) {
        if (!peopleMap.has(person)) {
          peopleMap.set(person, {
            name: person,
            relationship: 'friend',
            note: memory.content.slice(0, 100),
          });
        }
      }
    }

    return Array.from(peopleMap.values()).slice(0, 10);
  }

  private extractMilestones(memories: MemoryFragment[]): Array<{ year: string; event: string }> {
    const milestones: Array<{ year: string; event: string }> = [];

    for (const memory of memories) {
      if (memory.category === 'achievement' && memory.date) {
        milestones.push({
          year: memory.date.getFullYear().toString(),
          event: memory.title,
        });
      }
    }

    return milestones.sort((a, b) => a.year.localeCompare(b.year)).slice(-5);
  }

  async generateLifeSummary(userId: string): Promise<LifeSummary> {
    const memories = await this.getMemories(userId);

    return {
      userId,
      values: await this.extractValues(memories),
      proudest: memories
        .filter((m) => m.category === 'achievement')
        .sort((a, b) => b.importance - a.importance)
        .slice(0, 5),
      lessons: memories.filter((m) => m.category === 'lesson').slice(0, 10),
      relationships: await this.extractRelationships(memories),
      advice: memories
        .filter((m) => m.category === 'advice')
        .map((m) => m.content)
        .slice(0, 5),
      milestones: this.extractMilestones(memories),
    };
  }

  async scheduleLetter(letterId: string, sendAt: Date): Promise<boolean> {
    for (const [userId, letters] of this.letters) {
      const letter = letters.find((l) => l.id === letterId);
      if (letter) {
        letter.status = 'scheduled';
        letter.scheduledFor = sendAt;
        return true;
      }
    }
    return false;
  }

  async getScheduledLetters(userId: string): Promise<LegacyLetter[]> {
    const letters = this.letters.get(userId) || [];
    return letters.filter((l) => l.status === 'scheduled');
  }

  async markLetterSent(letterId: string): Promise<boolean> {
    for (const letters of this.letters.values()) {
      const letter = letters.find((l) => l.id === letterId);
      if (letter) {
        letter.status = 'sent';
        letter.sentAt = new Date();
        return true;
      }
    }
    return false;
  }
}

export const legacySystem = new LegacyLetterSystem();
