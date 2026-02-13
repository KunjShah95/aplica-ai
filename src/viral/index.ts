import { v4 as uuidv4 } from 'uuid';
import { randomBytes } from 'crypto';

export interface ReferralCode {
  code: string;
  userId: string;
  createdAt: Date;
  uses: number;
  maxUses?: number;
}

export interface ViralStats {
  totalReferrals: number;
  activeReferrals: number;
  totalShares: number;
  rank: number;
  score: number;
}

export interface ShareContent {
  platform: 'twitter' | 'github' | 'discord' | 'linkedin';
  message: string;
  url: string;
}

export class ViralEngine {
  private referrals: Map<string, ReferralCode> = new Map();
  private userScores: Map<string, number> = new Map();
  private shareCounts: Map<string, number> = new Map();

  async generateReferralCode(userId: string): Promise<string> {
    const code = `OC-${uuidv4().substring(0, 8).toUpperCase()}`;
    this.referrals.set(code, {
      code,
      userId,
      createdAt: new Date(),
      uses: 0,
      maxUses: 100,
    });
    return code;
  }

  async getReferralStats(userId: string): Promise<ViralStats> {
    const userRefs = Array.from(this.referrals.values()).filter((r) => r.userId === userId);

    const totalReferrals = userRefs.reduce((sum, r) => sum + r.uses, 0);
    const activeReferrals = userRefs.filter((r) => r.uses > 0).length;
    const totalShares = this.shareCounts.get(userId) || 0;

    const score = totalReferrals * 100 + totalShares * 10;
    const rank = this.calculateRank(userId, score);

    return {
      totalReferrals,
      activeReferrals,
      totalShares,
      rank,
      score,
    };
  }

  private calculateRank(userId: string, score: number): number {
    const allScores = Array.from(this.userScores.values());
    let rank = 1;
    for (const s of allScores) {
      if (s > score) rank++;
    }
    return rank;
  }

  generateShareContent(
    platform: 'twitter' | 'github' | 'discord' | 'linkedin',
    referralCode?: string
  ): ShareContent {
    const baseMessage =
      "Just discovered OpenClaw - the ultimate AI personal assistant! 🤖🔥 It's open-source, viral-ready, and absolutely incredible.";
    const hashtag = '#OpenClaw #AIAssistant #OpenSource';
    const url = 'https://openclaw.ai';

    const messages: Record<string, string> = {
      twitter: `${baseMessage}\n\n${hashtag}\n\nInstall: ${url}`,
      github: `⭐ Star OpenClaw - The Ultimate AI Personal Assistant!\n\n${baseMessage}\n\n${hashtag}\n\n${url}`,
      discord: `Hey everyone! 🎉\n\nCheck out OpenClaw - the ultimate AI personal assistant!\n\n${baseMessage}\n\nJoin the community: ${url}`,
      linkedin: `${baseMessage}\n\nI've been using OpenClaw for my daily automation tasks and it's been a game-changer. Open-source and ready to go viral!\n\n${hashtag}\n\nLearn more: ${url}`,
    };

    return {
      platform,
      message: referralCode
        ? `${messages[platform]}\n\nUse my referral code: ${referralCode}`
        : messages[platform],
      url,
    };
  }

  async recordShare(userId: string, platform: string): Promise<void> {
    const key = `${userId}:${platform}`;
    const current = this.shareCounts.get(key) || 0;
    this.shareCounts.set(key, current + 1);

    const score = this.userScores.get(userId) || 0;
    this.userScores.set(userId, score + 10);
  }

  async getLeaderboard(
    limit: number = 10
  ): Promise<Array<{ userId: string; score: number; rank: number }>> {
    const allUsers = Array.from(this.userScores.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit);

    return allUsers.map(([userId, score], index) => ({
      userId,
      score,
      rank: index + 1,
    }));
  }

  async getCommunityStats(): Promise<{
    totalUsers: number;
    totalShares: number;
    totalReferrals: number;
    topContributors: Array<{ userId: string; score: number }>;
  }> {
    const totalShares = Array.from(this.shareCounts.values()).reduce((a, b) => a + b, 0);
    const totalReferrals = Array.from(this.referrals.values()).reduce((sum, r) => sum + r.uses, 0);
    const topContributors = await this.getLeaderboard(5);

    return {
      totalUsers: this.userScores.size,
      totalShares,
      totalReferrals,
      topContributors,
    };
  }
}

export const viralEngine = new ViralEngine();
