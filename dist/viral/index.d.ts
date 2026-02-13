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
export declare class ViralEngine {
    private referrals;
    private userScores;
    private shareCounts;
    generateReferralCode(userId: string): Promise<string>;
    getReferralStats(userId: string): Promise<ViralStats>;
    private calculateRank;
    generateShareContent(platform: 'twitter' | 'github' | 'discord' | 'linkedin', referralCode?: string): ShareContent;
    recordShare(userId: string, platform: string): Promise<void>;
    getLeaderboard(limit?: number): Promise<Array<{
        userId: string;
        score: number;
        rank: number;
    }>>;
    getCommunityStats(): Promise<{
        totalUsers: number;
        totalShares: number;
        totalReferrals: number;
        topContributors: Array<{
            userId: string;
            score: number;
        }>;
    }>;
}
export declare const viralEngine: ViralEngine;
//# sourceMappingURL=index.d.ts.map