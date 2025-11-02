/**
 * TASK 2.2.2: CDR Parser - Universal CDR parser for multiple formats
 */

import { CDRData, CDRRecord } from '../types';

export class CDRParser {
  /**
   * Parse CSV CDR file (most common format)
   */
  static parseCSV(csvContent: string, phoneNumber: string): CDRData {
    const lines = csvContent.split('\n').filter(l => l.trim());
    const records: CDRRecord[] = [];
    
    // Detect header and column mapping
    const header = lines[0].toLowerCase();
    const hasHeader = header.includes('date') || header.includes('time') || header.includes('number');
    const startLine = hasHeader ? 1 : 0;
    
    for (let i = startLine; i < lines.length; i++) {
      const cols = lines[i].split(',').map(c => c.trim().replace(/["']/g, ''));
      
      if (cols.length >= 5) {
        const record: CDRRecord = {
          callDate: cols[0],
          callTime: cols[1],
          callingNumber: cols[2],
          calledNumber: cols[3],
          callType: this.determineCallType(cols[4]),
          duration: parseInt(cols[5]) || 0,
          cellId: cols[6] || undefined,
          lat: cols[7] ? parseFloat(cols[7]) : undefined,
          lng: cols[8] ? parseFloat(cols[8]) : undefined,
          imei: cols[9] || undefined,
          imsi: cols[10] || undefined,
        };
        
        records.push(record);
      }
    }
    
    const operator = this.detectOperator(records);
    
    return {
      phoneNumber,
      operator,
      startDate: records[0]?.callDate || '',
      endDate: records[records.length - 1]?.callDate || '',
      records,
    };
  }

  /**
   * Parse Excel CDR file
   */
  static async parseExcel(file: File, phoneNumber: string): Promise<CDRData> {
    // Similar to bank parser - use xlsx library in production
    const reader = new FileReader();
    
    return new Promise((resolve, reject) => {
      reader.onload = (e) => {
        try {
          const text = e.target?.result as string;
          const cdrData = this.parseCSV(text, phoneNumber);
          resolve(cdrData);
        } catch (error) {
          reject(error);
        }
      };
      
      reader.onerror = reject;
      reader.readAsText(file);
    });
  }

  /**
   * Determine call type from various formats
   */
  private static determineCallType(typeStr: string): 'incoming' | 'outgoing' | 'missed' {
    const lower = typeStr.toLowerCase();
    if (lower.includes('out') || lower.includes('mo') || lower === 'o') {
      return 'outgoing';
    } else if (lower.includes('miss') || lower === 'm') {
      return 'missed';
    }
    return 'incoming';
  }

  /**
   * Detect telecom operator from CDR data
   */
  private static detectOperator(records: CDRRecord[]): string {
    // Analyze IMSI prefix or cell IDs to detect operator
    if (records.length === 0) return 'Unknown';
    
    const firstIMSI = records.find(r => r.imsi)?.imsi;
    if (firstIMSI) {
      const mccmnc = firstIMSI.substring(0, 5);
      const operators: Record<string, string> = {
        '40401': 'Vodafone',
        '40402': 'Airtel',
        '40403': 'Airtel',
        '40410': 'Airtel',
        '40411': 'Vodafone',
        '40413': 'Vodafone',
        '40415': 'Vodafone',
        '40420': 'Vodafone',
        '40427': 'Vodafone',
        '40446': 'Vodafone',
        '40449': 'Airtel',
        '40470': 'Airtel',
        '40486': 'Vodafone',
        '40488': 'Vodafone',
        '40493': 'Airtel',
        '40495': 'Airtel',
        '40496': 'Airtel',
      };
      return operators[mccmnc] || 'Unknown';
    }
    
    return 'Unknown';
  }

  /**
   * Normalize phone number format
   */
  static normalizePhoneNumber(phone: string): string {
    // Remove spaces, dashes, and country code
    let cleaned = phone.replace(/[\s\-()]/g, '');
    
    // Remove +91 or 91 prefix
    if (cleaned.startsWith('+91')) {
      cleaned = cleaned.substring(3);
    } else if (cleaned.startsWith('91') && cleaned.length === 12) {
      cleaned = cleaned.substring(2);
    }
    
    return cleaned;
  }

  /**
   * Merge multiple CDR files for same phone number
   */
  static mergeCDRData(cdrDataList: CDRData[]): CDRData {
    if (cdrDataList.length === 0) {
      throw new Error('No CDR data to merge');
    }
    
    const allRecords = cdrDataList.flatMap(cdr => cdr.records);
    
    // Sort by date and time
    allRecords.sort((a, b) => {
      const dateA = new Date(`${a.callDate} ${a.callTime}`).getTime();
      const dateB = new Date(`${b.callDate} ${b.callTime}`).getTime();
      return dateA - dateB;
    });
    
    return {
      phoneNumber: cdrDataList[0].phoneNumber,
      operator: cdrDataList[0].operator,
      startDate: allRecords[0]?.callDate || '',
      endDate: allRecords[allRecords.length - 1]?.callDate || '',
      records: allRecords,
    };
  }
}

