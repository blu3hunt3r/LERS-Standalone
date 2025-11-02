/**
 * TASK 2.2.4: Night Stay Location - Residence detection via tower clustering
 */

import { CDRData, NightStayLocation } from '../types';

export class NightStayDetector {
  static detect(cdrData: CDRData): NightStayLocation[] {
    const nightRecords = cdrData.records.filter(r => {
      const time = r.callTime;
      const hour = parseInt(time.split(':')[0]);
      return hour >= 22 || hour <= 6; // 10 PM to 6 AM
    });

    const cellCounts = new Map<string, { count: number; dates: Set<string>; lat?: number; lng?: number }>();

    for (const record of nightRecords) {
      if (!record.cellId) continue;

      if (!cellCounts.has(record.cellId)) {
        cellCounts.set(record.cellId, {
          count: 0,
          dates: new Set(),
          lat: record.lat,
          lng: record.lng,
        });
      }

      const cell = cellCounts.get(record.cellId)!;
      cell.count++;
      cell.dates.add(record.callDate);
    }

    const totalNights = new Set(nightRecords.map(r => r.callDate)).size;
    
    return Array.from(cellCounts.entries())
      .map(([cellId, data]) => ({
        cellId,
        lat: data.lat || 0,
        lng: data.lng || 0,
        frequency: data.dates.size,
        percentage: (data.dates.size / totalNights) * 100,
        dates: Array.from(data.dates),
      }))
      .sort((a, b) => b.frequency - a.frequency);
  }

  static getPrimaryResidence(locations: NightStayLocation[]): NightStayLocation | null {
    return locations.length > 0 ? locations[0] : null;
  }
}

