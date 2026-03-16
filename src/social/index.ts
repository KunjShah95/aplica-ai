import { db } from '../db/index.js';
import { randomUUID } from 'crypto';

export interface SocialPost {
  id: string;
  userId: string;
  platform: 'twitter' | 'linkedin' | 'instagram' | 'facebook';
  content: string;
  scheduledAt?: Date;
  postedAt?: Date;
  status: 'draft' | 'scheduled' | 'posted' | 'failed';
  engagement?: {
    likes: number;
    shares: number;
    comments: number;
  };
}

export interface PostDraft {
  baseContent: string;
  platformContents: Record<string, string>;
}

export class SocialScheduler {
  private posts: Map<string, SocialPost> = new Map();
  private twitterApiKey?: string;
  private linkedinApiKey?: string;
  private instagramApiKey?: string;

  constructor(options?: {
    twitterApiKey?: string;
    linkedinApiKey?: string;
    instagramApiKey?: string;
  }) {
    this.twitterApiKey = options?.twitterApiKey || process.env.TWITTER_API_KEY;
    this.linkedinApiKey = options?.linkedinApiKey || process.env.LINKEDIN_API_KEY;
    this.instagramApiKey = options?.instagramApiKey || process.env.INSTAGRAM_API_KEY;
  }

  async draftPosts(baseContent: string): Promise<PostDraft> {
    const platformContents: Record<string, string> = {};

    platformContents.twitter = this.adaptForTwitter(baseContent);
    platformContents.linkedin = this.adaptForLinkedIn(baseContent);
    platformContents.instagram = this.adaptForInstagram(baseContent);

    return {
      baseContent,
      platformContents,
    };
  }

  private adaptForTwitter(content: string): string {
    if (content.length <= 280) {
      return content;
    }
    return content.slice(0, 277) + '...';
  }

  private adaptForLinkedIn(content: string): string {
    let adapted = content;

    if (!adapted.includes('\n\n')) {
      adapted = adapted.replace(/\. /g, '.\n\n');
    }

    adapted = adapted.replace(/\(http/g, '\n\nRead more: (http');

    return adapted;
  }

  private adaptForInstagram(content: string): string {
    let adapted = content;

    adapted = adapted.replace(/https?:\/\/[^\s]+/g, '🔗 [Link in bio]');

    const hashtagCount = (adapted.match(/#[a-zA-Z0-9]+/g) || []).length;
    if (hashtagCount < 5) {
      adapted += '\n\n#socialmedia #content #creator';
    }

    return adapted;
  }

  async schedule(posts: Omit<SocialPost, 'id'>[]): Promise<SocialPost[]> {
    const scheduled: SocialPost[] = [];

    for (const post of posts) {
      const newPost: SocialPost = {
        ...post,
        id: randomUUID(),
        status: post.scheduledAt ? 'scheduled' : 'draft',
      };

      this.posts.set(newPost.id, newPost);
      scheduled.push(newPost);
    }

    return scheduled;
  }

  async publish(postId: string): Promise<boolean> {
    const post = this.posts.get(postId);
    if (!post) return false;

    try {
      switch (post.platform) {
        case 'twitter':
          await this.postToTwitter(post.content);
          break;
        case 'linkedin':
          await this.postToLinkedIn(post.content);
          break;
        case 'instagram':
          await this.postToInstagram(post.content);
          break;
      }

      post.status = 'posted';
      post.postedAt = new Date();
      return true;
    } catch (error) {
      post.status = 'failed';
      return false;
    }
  }

  private async postToTwitter(content: string): Promise<void> {
    console.log('Posting to Twitter:', content.slice(0, 50));
  }

  private async postToLinkedIn(content: string): Promise<void> {
    console.log('Posting to LinkedIn:', content.slice(0, 50));
  }

  private async postToInstagram(content: string): Promise<void> {
    console.log('Posting to Instagram:', content.slice(0, 50));
  }

  async getScheduled(): Promise<SocialPost[]> {
    return Array.from(this.posts.values())
      .filter((p) => p.status === 'scheduled')
      .sort((a, b) => (a.scheduledAt?.getTime() || 0) - (b.scheduledAt?.getTime() || 0));
  }

  async approve(postId: string): Promise<void> {
    const post = this.posts.get(postId);
    if (post) {
      post.status = 'draft';
    }
  }
}

export const socialScheduler = new SocialScheduler();

export interface Person {
  id: string;
  userId: string;
  name: string;
  role?: string;
  howYouKnow: string;
  lastInteraction: Date;
  interactionCount: number;
  notes: string;
  followUpDue?: Date;
  metadata: Record<string, unknown>;
}

export class PersonalCRM {
  private people: Map<string, Person> = new Map();

  async trackPerson(userId: string, name: string, context: string): Promise<Person> {
    const existing = Array.from(this.people.values()).find(
      (p) => p.userId === userId && p.name.toLowerCase() === name.toLowerCase()
    );

    if (existing) {
      existing.interactionCount++;
      existing.lastInteraction = new Date();

      if (context) {
        existing.notes += `\n${new Date().toISOString()}: ${context}`;
      }

      return existing;
    }

    const person: Person = {
      id: randomUUID(),
      userId,
      name,
      howYouKnow: this.extractRelationship(context),
      lastInteraction: new Date(),
      interactionCount: 1,
      notes: context,
      metadata: {},
    };

    this.people.set(person.id, person);
    return person;
  }

  private extractRelationship(context: string): string {
    const contextLower = context.toLowerCase();

    if (
      contextLower.includes('work') ||
      contextLower.includes('colleague') ||
      contextLower.includes('client')
    ) {
      return 'Work colleague';
    }
    if (contextLower.includes('friend')) {
      return 'Friend';
    }
    if (contextLower.includes('family')) {
      return 'Family';
    }
    if (
      contextLower.includes('met at') ||
      contextLower.includes('conference') ||
      contextLower.includes('meetup')
    ) {
      return 'Acquaintance';
    }

    return 'Contact';
  }

  async getPeople(userId: string): Promise<Person[]> {
    return Array.from(this.people.values())
      .filter((p) => p.userId === userId)
      .sort((a, b) => b.lastInteraction.getTime() - a.lastInteraction.getTime());
  }

  async getFollowUps(userId: string): Promise<Person[]> {
    const now = new Date();

    return Array.from(this.people.values()).filter(
      (p) => p.userId === userId && p.followUpDue && p.followUpDue < now
    );
  }

  async setFollowUp(personId: string, dueDate: Date): Promise<void> {
    const person = this.people.get(personId);
    if (person) {
      person.followUpDue = dueDate;
    }
  }

  async ping(userId: string): Promise<string[]> {
    const due = await this.getFollowUps(userId);
    return due.map((p) => `Time to follow up with ${p.name} (${p.howYouKnow})`);
  }
}

export const personalCRM = new PersonalCRM();

export interface NewsletterSource {
  id: string;
  name: string;
  url: string;
  type: 'rss' | 'email' | 'api';
}

export interface NewsletterBrief {
  sourceId: string;
  sourceName: string;
  summary: string;
  keyPoints: string[];
  readTime: number;
  receivedAt: Date;
}

export class NewsletterDigest {
  private sources: NewsletterSource[] = [];
  private briefs: NewsletterBrief[] = [];

  addSource(source: Omit<NewsletterSource, 'id'>): void {
    this.sources.push({
      ...source,
      id: randomUUID(),
    });
  }

  async fetchAndDigest(): Promise<NewsletterBrief[]> {
    const briefs: NewsletterBrief[] = [];

    for (const source of this.sources) {
      try {
        const content = await this.fetchSource(source);
        const brief = await this.digest(source, content);
        briefs.push(brief);
        this.briefs.push(brief);
      } catch (error) {
        console.error(`Failed to fetch ${source.name}:`, error);
      }
    }

    return briefs;
  }

  private async fetchSource(source: NewsletterSource): Promise<string> {
    if (source.type === 'rss') {
      const response = await fetch(source.url);
      return await response.text();
    }

    return '';
  }

  private async digest(source: NewsletterSource, content: string): Promise<NewsletterBrief> {
    const summaryLength = Math.min(500, content.length / 10);

    return {
      sourceId: source.id,
      sourceName: source.name,
      summary: content.slice(0, summaryLength) + '...',
      keyPoints: ['Key insight 1', 'Key insight 2'],
      readTime: Math.ceil(content.length / 1000),
      receivedAt: new Date(),
    };
  }

  async sendBriefs(userId: string, platform: 'telegram' | 'discord' | 'email'): Promise<void> {
    const briefs = await this.fetchAndDigest();

    if (briefs.length === 0) {
      return;
    }

    const message = this.formatDigest(briefs);

    console.log(`Sending digest to ${userId} via ${platform}:`, message.slice(0, 100));
  }

  private formatDigest(briefs: NewsletterBrief[]): string {
    const lines = [
      '📬 Morning Newsletter Digest',
      '',
      `${briefs.length} newsletters read`,
      `Total read time: ${briefs.reduce((sum, b) => sum + b.readTime, 0)} minutes`,
      '',
      '---',
      '',
    ];

    for (const brief of briefs) {
      lines.push(`📰 ${brief.sourceName} (${brief.readTime} min)`);
      lines.push(brief.summary);
      lines.push('');
    }

    return lines.join('\n');
  }
}

export const newsletterDigest = new NewsletterDigest();
