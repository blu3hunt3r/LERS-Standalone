/**
 * TASK 5.2.4: Alert Generation - Intelligence alerts for matches and patterns
 */

export interface Alert {
  id: string;
  type: 'cross-case-match' | 'pattern-detected' | 'high-risk' | 'geo-conflict';
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  entityId: string;
  timestamp: string;
  actionRequired: boolean;
}

export class AlertGenerator {
  static generateAlerts(analysisResults: any): Alert[] {
    const alerts: Alert[] = [];

    // High velocity alert
    if (analysisResults.velocity?.velocityScore > 80) {
      alerts.push({
        id: `alert-${Date.now()}-velocity`,
        type: 'high-risk',
        severity: 'critical',
        title: 'High Transaction Velocity Detected',
        description: `Account shows ${analysisResults.velocity.velocityScore}% velocity score (mule account indicator)`,
        entityId: analysisResults.accountId,
        timestamp: new Date().toISOString(),
        actionRequired: true,
      });
    }

    // Mule pattern alert
    if (analysisResults.mulePatterns && analysisResults.mulePatterns.length > 0) {
      alerts.push({
        id: `alert-${Date.now()}-mule`,
        type: 'pattern-detected',
        severity: 'critical',
        title: 'Money Mule Pattern Detected',
        description: `${analysisResults.mulePatterns.length} mule patterns found: ${analysisResults.mulePatterns.map((p: any) => p.pattern).join(', ')}`,
        entityId: analysisResults.accountId,
        timestamp: new Date().toISOString(),
        actionRequired: true,
      });
    }

    // Geo conflict alert
    if (analysisResults.geoConflict) {
      alerts.push({
        id: `alert-${Date.now()}-geo`,
        type: 'geo-conflict',
        severity: 'high',
        title: 'Geographic Conflict Detected',
        description: analysisResults.geoConflict.description,
        entityId: analysisResults.entityId,
        timestamp: new Date().toISOString(),
        actionRequired: false,
      });
    }

    return alerts;
  }
}

