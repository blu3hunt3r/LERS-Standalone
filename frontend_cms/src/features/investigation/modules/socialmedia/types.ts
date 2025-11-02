/**
 * TASK 2.3.1: Social Media Module - Types and Interfaces
 */

export interface SocialProfile {
  platform: 'instagram' | 'facebook' | 'twitter' | 'linkedin' | 'telegram';
  username: string;
  displayName: string;
  bio: string;
  profilePicture?: string;
  followers: number;
  following: number;
  postsCount: number;
  isVerified: boolean;
  accountCreated?: string;
  externalLinks: string[];
  email?: string;
  phone?: string;
}

export interface SocialPost {
  id: string;
  timestamp: string;
  caption: string;
  hashtags: string[];
  mentions: string[];
  location?: {
    name: string;
    lat?: number;
    lng?: number;
  };
  mediaUrls: string[];
  likes: number;
  comments: number;
}

export interface SocialConnection {
  username: string;
  displayName: string;
  relationshipType: 'follower' | 'following' | 'mutual';
  interactionCount: number;
}

export interface ContentAnalysisResult {
  keywords: { word: string; frequency: number }[];
  sentiment: 'positive' | 'negative' | 'neutral';
  sentimentScore: number; // -1 to 1
  topics: string[];
  language: string;
  suspiciousIndicators: string[];
}

