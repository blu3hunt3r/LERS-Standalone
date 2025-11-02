/**
 * TASK 2.2.7: Call Pattern Analysis - Hourly heatmap and behavioral patterns
 */

import { CDRData, CallPattern } from '../types';

export class CallPatternAnalyzer {
  static analyze(cdrData: CDRData): CallPattern {
    const hourlyDistribution = new Array(24).fill(0);
    const dayOfWeekDistribution = new Array(7).fill(0);
    let totalDuration = 0;
    let nightCalls = 0;
    let weekendCalls = 0;

    for (const record of cdrData.records) {
      const date = new Date(`${record.callDate} ${record.callTime}`);
      const hour = date.getHours();
      const dayOfWeek = date.getDay();

      hourlyDistribution[hour]++;
      dayOfWeekDistribution[dayOfWeek]++;
      totalDuration += record.duration;

      if (hour >= 22 || hour <= 6) nightCalls++;
      if (dayOfWeek === 0 || dayOfWeek === 6) weekendCalls++;
    }

    const peakHours = hourlyDistribution
      .map((count, hour) => ({ hour, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 3)
      .map(h => h.hour);

    const totalCalls = cdrData.records.length;
    const totalDays = this.calculateDayRange(cdrData);

    return {
      hourlyDistribution,
      dayOfWeekDistribution,
      peakHours,
      avgCallsPerDay: totalCalls / totalDays,
      avgCallDuration: totalDuration / totalCalls,
      nightActivity: (nightCalls / totalCalls) * 100,
      weekendActivity: (weekendCalls / totalCalls) * 100,
    };
  }

  private static calculateDayRange(cdrData: CDRData): number {
    const start = new Date(cdrData.startDate);
    const end = new Date(cdrData.endDate);
    return Math.max(1, Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)));
  }

  static generateInsights(pattern: CallPattern): string[] {
    const insights: string[] = [];

    insights.push(`📊 Peak hours: ${pattern.peakHours.map(h => `${h}:00`).join(', ')}`);
    insights.push(`📞 Avg calls/day: ${pattern.avgCallsPerDay.toFixed(1)}`);

    if (pattern.nightActivity > 30) {
      insights.push(`🌙 High night activity: ${pattern.nightActivity.toFixed(0)}% (suspicious)`);
    }

    if (pattern.weekendActivity > 60) {
      insights.push(`📅 Weekend-heavy pattern (${pattern.weekendActivity.toFixed(0)}%)`);
    }

    return insights;
  }
}

