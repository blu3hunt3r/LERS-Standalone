/**
 * TASK 2.3.5: Content Analysis (NLP) - Keyword extraction and sentiment analysis
 */

import { SocialPost, ContentAnalysisResult } from '../types';

export class ContentAnalyzer {
  static analyze(posts: SocialPost[]): ContentAnalysisResult {
    const allText = posts.map(p => p.caption).join(' ');
    
    return {
      keywords: this.extractKeywords(allText),
      sentiment: this.analyzeSentiment(allText).sentiment,
      sentimentScore: this.analyzeSentiment(allText).score,
      topics: this.extractTopics(posts),
      language: this.detectLanguage(allText),
      suspiciousIndicators: this.detectSuspiciousContent(allText),
    };
  }

  private static extractKeywords(text: string): { word: string; frequency: number }[] {
    const stopWords = new Set(['the', 'is', 'at', 'which', 'on', 'a', 'an', 'and', 'or', 'but', 'in', 'with', 'to', 'for', 'of', 'as', 'by', 'that', 'this']);
    const words = text.toLowerCase().match(/\b\w{4,}\b/g) || [];
    
    const freq = new Map<string, number>();
    for (const word of words) {
      if (!stopWords.has(word)) {
        freq.set(word, (freq.get(word) || 0) + 1);
      }
    }

    return Array.from(freq.entries())
      .map(([word, frequency]) => ({ word, frequency }))
      .sort((a, b) => b.frequency - a.frequency)
      .slice(0, 20);
  }

  private static analyzeSentiment(text: string): { sentiment: 'positive' | 'negative' | 'neutral'; score: number } {
    const positiveWords = ['good', 'great', 'excellent', 'amazing', 'love', 'best', 'happy', 'wonderful', 'fantastic'];
    const negativeWords = ['bad', 'terrible', 'worst', 'hate', 'awful', 'horrible', 'sad', 'poor', 'scam', 'fraud'];
    
    const lower = text.toLowerCase();
    let score = 0;

    for (const word of positiveWords) {
      score += (lower.match(new RegExp(word, 'g')) || []).length;
    }

    for (const word of negativeWords) {
      score -= (lower.match(new RegExp(word, 'g')) || []).length;
    }

    const normalizedScore = Math.max(-1, Math.min(1, score / 10));

    let sentiment: 'positive' | 'negative' | 'neutral';
    if (normalizedScore > 0.2) sentiment = 'positive';
    else if (normalizedScore < -0.2) sentiment = 'negative';
    else sentiment = 'neutral';

    return { sentiment, score: normalizedScore };
  }

  private static extractTopics(posts: SocialPost[]): string[] {
    const allHashtags = posts.flatMap(p => p.hashtags);
    const freq = new Map<string, number>();

    for (const tag of allHashtags) {
      freq.set(tag, (freq.get(tag) || 0) + 1);
    }

    return Array.from(freq.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([tag]) => tag);
  }

  private static detectLanguage(text: string): string {
    // Simple heuristic - check for Hindi/English
    const hindiPattern = /[\u0900-\u097F]/;
    if (hindiPattern.test(text)) return 'Hindi/English (Hinglish)';
    return 'English';
  }

  private static detectSuspiciousContent(text: string): string[] {
    const indicators: string[] = [];
    const lower = text.toLowerCase();

    const suspiciousPatterns = [
      { pattern: /(crypto|bitcoin|investment|forex|trading)/i, flag: 'Investment/Crypto keywords' },
      { pattern: /(easy money|get rich|guaranteed returns)/i, flag: 'Get-rich-quick language' },
      { pattern: /(dm for|contact for|whatsapp me)/i, flag: 'Direct contact solicitation' },
      { pattern: /(urgent|limited time|act now)/i, flag: 'Urgency tactics' },
    ];

    for (const { pattern, flag } of suspiciousPatterns) {
      if (pattern.test(text)) {
        indicators.push(flag);
      }
    }

    return indicators;
  }
}

