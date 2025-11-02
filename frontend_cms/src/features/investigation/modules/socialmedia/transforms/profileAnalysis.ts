/**
 * TASK 2.3.3: Profile Scraping Transform - OSINT profile viewer with archiving
 */

import { SocialProfile } from '../types';

export class ProfileAnalyzer {
  static analyze(profile: SocialProfile): {
    riskScore: number;
    flags: string[];
    insights: string[];
  } {
    const flags: string[] = [];
    const insights: string[] = [];
    let riskScore = 0;

    // New account check
    if (profile.accountCreated) {
      const accountAge = this.getAccountAgeDays(profile.accountCreated);
      if (accountAge < 30) {
        flags.push('NEW_ACCOUNT');
        riskScore += 20;
        insights.push(`⚠️ Account created ${accountAge} days ago (new account)`);
      }
    }

    // Low follower count
    if (profile.followers < 50) {
      flags.push('LOW_FOLLOWERS');
      riskScore += 15;
      insights.push(`👥 Low followers: ${profile.followers}`);
    }

    // Suspicious follower/following ratio
    const ratio = profile.following / Math.max(1, profile.followers);
    if (ratio > 10) {
      flags.push('SUSPICIOUS_RATIO');
      riskScore += 15;
      insights.push(`📊 Follows ${profile.following} but only ${profile.followers} followers (bot-like)`);
    }

    // No posts
    if (profile.postsCount === 0) {
      flags.push('NO_POSTS');
      riskScore += 10;
      insights.push(`📭 No posts (potentially fake account)`);
    }

    // Suspicious keywords in bio
    const suspiciousKeywords = ['crypto', 'investment', 'trading', 'forex', 'bitcoin', 'easy money', 'get rich'];
    const bioLower = profile.bio.toLowerCase();
    for (const keyword of suspiciousKeywords) {
      if (bioLower.includes(keyword)) {
        flags.push('SUSPICIOUS_BIO');
        riskScore += 10;
        insights.push(`🚩 Bio contains suspicious keyword: "${keyword}"`);
        break;
      }
    }

    return {
      riskScore: Math.min(100, riskScore),
      flags,
      insights,
    };
  }

  private static getAccountAgeDays(createdDate: string): number {
    const created = new Date(createdDate);
    const now = new Date();
    return Math.floor((now.getTime() - created.getTime()) / (1000 * 60 * 60 * 24));
  }

  /**
   * Archive profile data for evidence
   */
  static archiveProfile(profile: SocialProfile): string {
    return JSON.stringify(
      {
        archived_at: new Date().toISOString(),
        profile,
      },
      null,
      2
    );
  }
}

