/**
 * TASK 2.2.6: Co-Location Detection - Find physical proximity between phones
 */

import { CDRData, CoLocationEvent } from '../types';

export class CoLocationDetector {
  static detect(cdrData1: CDRData, cdrData2: CDRData, timeWindowMinutes: number = 30): CoLocationEvent[] {
    const events: CoLocationEvent[] = [];

    for (const record1 of cdrData1.records) {
      if (!record1.cellId || !record1.lat || !record1.lng) continue;

      for (const record2 of cdrData2.records) {
        if (!record2.cellId || !record2.lat || !record2.lng) continue;

        // Same cell tower
        if (record1.cellId === record2.cellId) {
          const time1 = new Date(`${record1.callDate} ${record1.callTime}`).getTime();
          const time2 = new Date(`${record2.callDate} ${record2.callTime}`).getTime();
          const diffMinutes = Math.abs(time1 - time2) / (1000 * 60);

          if (diffMinutes <= timeWindowMinutes) {
            events.push({
              phone1: cdrData1.phoneNumber,
              phone2: cdrData2.phoneNumber,
              cellId: record1.cellId,
              lat: record1.lat,
              lng: record1.lng,
              timestamp: record1.callDate + ' ' + record1.callTime,
              duration: diffMinutes,
            });
          }
        }
      }
    }

    return events;
  }

  static generateInsights(events: CoLocationEvent[]): string[] {
    return [
      `📍 Co-location events: ${events.length}`,
      `🤝 Likely associates (${events.length >= 10 ? 'HIGH confidence' : 'LOW confidence'})`,
    ];
  }
}

