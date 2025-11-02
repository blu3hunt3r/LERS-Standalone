/**
 * TASK 2.2.5: Movement Pattern Analysis - Timeline and animation of movement
 */

import { CDRData, MovementPattern } from '../types';

export class MovementAnalyzer {
  static analyze(cdrData: CDRData): MovementPattern[] {
    return cdrData.records
      .filter(r => r.cellId && r.lat && r.lng)
      .map(r => ({
        timestamp: `${r.callDate} ${r.callTime}`,
        cellId: r.cellId!,
        lat: r.lat!,
        lng: r.lng!,
      }))
      .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
  }

  static detectRoutine(patterns: MovementPattern[]): string[] {
    const insights: string[] = [];
    
    // Group by hour of day
    const hourlyLocations = new Map<number, Set<string>>();
    
    for (const pattern of patterns) {
      const hour = new Date(pattern.timestamp).getHours();
      if (!hourlyLocations.has(hour)) {
        hourlyLocations.set(hour, new Set());
      }
      hourlyLocations.get(hour)!.add(pattern.cellId);
    }

    // Detect morning/evening routine
    const morningCells = hourlyLocations.get(9);
    const eveningCells = hourlyLocations.get(18);

    if (morningCells && morningCells.size === 1) {
      insights.push(`🏢 Consistent morning location (9 AM): ${Array.from(morningCells)[0]}`);
    }

    if (eveningCells && eveningCells.size === 1) {
      insights.push(`🏠 Consistent evening location (6 PM): ${Array.from(eveningCells)[0]}`);
    }

    return insights;
  }
}

