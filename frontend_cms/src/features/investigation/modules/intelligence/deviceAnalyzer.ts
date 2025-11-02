/**
 * TASK 6.2.2: Device Intelligence Module - Device tracking and timeline
 */

export class DeviceAnalyzer {
  static buildTimeline(deviceLogs: { deviceId: string; timestamp: string; sim: string; action: string }[]): {
    deviceId: string;
    timeline: { timestamp: string; sim: string; action: string }[];
    simCount: number;
    suspiciousActivity: string[];
  }[] {
    const devices = new Map<string, any>();

    for (const log of deviceLogs) {
      if (!devices.has(log.deviceId)) {
        devices.set(log.deviceId, {
          deviceId: log.deviceId,
          timeline: [],
          sims: new Set<string>(),
          suspiciousActivity: [],
        });
      }

      const device = devices.get(log.deviceId)!;
      device.timeline.push({
        timestamp: log.timestamp,
        sim: log.sim,
        action: log.action,
      });
      device.sims.add(log.sim);
    }

    // Analyze for suspicious patterns
    devices.forEach(device => {
      if (device.sims.size > 5) {
        device.suspiciousActivity.push(`SIM_HOPPING: ${device.sims.size} SIMs used`);
      }

      // Check for rapid SIM changes
      const changes = device.timeline.filter((t: any) => t.action === 'SIM_CHANGE');
      if (changes.length > 10) {
        device.suspiciousActivity.push(`RAPID_SIM_CHANGES: ${changes.length} changes`);
      }
    });

    return Array.from(devices.values()).map(d => ({
      deviceId: d.deviceId,
      timeline: d.timeline,
      simCount: d.sims.size,
      suspiciousActivity: d.suspiciousActivity,
    }));
  }

  static correlateDeviceUsage(deviceId: string, transactions: any[]): {
    correlatedEvents: { device: string; transaction: string; timestamp: string }[];
    insights: string[];
  } {
    // Placeholder for device-transaction correlation
    return {
      correlatedEvents: [],
      insights: [],
    };
  }
}

