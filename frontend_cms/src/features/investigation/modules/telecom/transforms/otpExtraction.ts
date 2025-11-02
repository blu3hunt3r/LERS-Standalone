/**
 * TASK 2.2.8: OTP/SMS Extraction - Parse SMS logs for OTPs and alerts
 */

import { OTPMessage } from '../types';

export class OTPExtractor {
  static extract(smsLogs: string): OTPMessage[] {
    const messages: OTPMessage[] = [];
    const lines = smsLogs.split('\n');

    for (const line of lines) {
      const otpMatch = line.match(/(\d{4,6})/);
      if (!otpMatch) continue;

      const otp = otpMatch[1];
      const service = this.detectService(line);

      // Parse timestamp (assuming format: YYYY-MM-DD HH:MM:SS)
      const timestampMatch = line.match(/(\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}:\d{2})/);
      const timestamp = timestampMatch ? timestampMatch[1] : '';

      // Parse sender
      const fromMatch = line.match(/from:?\s*([A-Z\-]+)/i);
      const from = fromMatch ? fromMatch[1] : 'Unknown';

      messages.push({
        timestamp,
        from,
        message: line,
        otp,
        service,
      });
    }

    return messages;
  }

  private static detectService(message: string): string {
    const lower = message.toLowerCase();
    if (lower.includes('sbi') || lower.includes('state bank')) return 'SBI';
    if (lower.includes('hdfc')) return 'HDFC Bank';
    if (lower.includes('icici')) return 'ICICI Bank';
    if (lower.includes('axis')) return 'Axis Bank';
    if (lower.includes('amazon')) return 'Amazon';
    if (lower.includes('flipkart')) return 'Flipkart';
    if (lower.includes('paytm')) return 'Paytm';
    if (lower.includes('phonepe')) return 'PhonePe';
    if (lower.includes('gpay') || lower.includes('google pay')) return 'Google Pay';
    return 'Unknown';
  }

  static correlateWithTransactions(otpMessages: OTPMessage[]): { otp: string; timestamp: string; service: string }[] {
    return otpMessages.map(msg => ({
      otp: msg.otp,
      timestamp: msg.timestamp,
      service: msg.service,
    }));
  }
}

