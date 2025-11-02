/**
 * TASK 2.2.3: Contact Network Analysis - Build call graph with frequency sizing
 */

import { CDRData, ContactNode } from '../types';

export class ContactNetworkAnalyzer {
  static analyze(cdrData: CDRData, topN: number = 20): ContactNode[] {
    const contacts = new Map<string, ContactNode>();

    for (const record of cdrData.records) {
      const isOutgoing = record.callType === 'outgoing';
      const contactNumber = isOutgoing ? record.calledNumber : record.callingNumber;
      
      if (contactNumber === cdrData.phoneNumber) continue; // Skip self
      
      if (!contacts.has(contactNumber)) {
        contacts.set(contactNumber, {
          phoneNumber: contactNumber,
          callCount: 0,
          totalDuration: 0,
          avgDuration: 0,
          firstCall: record.callDate,
          lastCall: record.callDate,
          callTypes: { incoming: 0, outgoing: 0, missed: 0 },
        });
      }

      const contact = contacts.get(contactNumber)!;
      contact.callCount++;
      contact.totalDuration += record.duration;
      contact.callTypes[record.callType]++;
      contact.lastCall = record.callDate;
    }

    // Calculate averages
    contacts.forEach(contact => {
      contact.avgDuration = contact.totalDuration / contact.callCount;
    });

    // Sort by call count and return top N
    return Array.from(contacts.values())
      .sort((a, b) => b.callCount - a.callCount)
      .slice(0, topN);
  }

  static generateInsights(contacts: ContactNode[]): string[] {
    const insights: string[] = [];

    if (contacts.length > 0) {
      const top = contacts[0];
      insights.push(`📞 Top contact: ${top.phoneNumber} (${top.callCount} calls, ${Math.floor(top.totalDuration / 60)} min total)`);
    }

    const innerCircle = contacts.slice(0, 5);
    const innerCircleTotal = innerCircle.reduce((sum, c) => sum + c.callCount, 0);
    const totalCalls = contacts.reduce((sum, c) => sum + c.callCount, 0);
    const innerCirclePercent = (innerCircleTotal / totalCalls) * 100;

    insights.push(`👥 Inner circle (top 5): ${innerCirclePercent.toFixed(0)}% of all calls`);

    return insights;
  }
}

