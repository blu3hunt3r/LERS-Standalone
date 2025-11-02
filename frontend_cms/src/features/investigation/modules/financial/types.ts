/**
 * TASK 2.1.1: Financial Module - Types and Interfaces
 */

export interface BankTransaction {
  date: string;
  description: string;
  amount: number;
  balance: number;
  type: 'credit' | 'debit';
  category?: string;
  counterparty?: string;
  reference?: string;
}

export interface BankStatement {
  accountNumber: string;
  accountHolder: string;
  bankName: string;
  ifscCode?: string;
  startDate: string;
  endDate: string;
  openingBalance: number;
  closingBalance: number;
  transactions: BankTransaction[];
}

export interface MoneyFlowNode {
  accountId: string;
  accountNumber: string;
  totalIn: number;
  totalOut: number;
  netFlow: number;
  transactionCount: number;
}

export interface MoneyFlowLink {
  source: string;
  target: string;
  amount: number;
  transactionCount: number;
  dates: string[];
}

export interface VelocityAnalysis {
  accountId: string;
  accountOpenDate: string;
  daysSinceOpen: number;
  totalVolume: number;
  transactionCount: number;
  dailyAverage: number;
  velocityScore: number; // 0-100, higher = more suspicious
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  flags: string[];
}

export interface MulePattern {
  accountId: string;
  pattern: 'rapid-in-out' | 'dormant-active' | 'round-amounts' | 'layering';
  confidence: number;
  details: {
    avgTimeInAccount?: number; // hours
    rapidTransfers?: number;
    dormantDays?: number;
    roundAmountPercent?: number;
    layeringHops?: number;
  };
  suspiciousTransactions: string[];
}

export interface TransactionCluster {
  id: string;
  category: string;
  transactions: BankTransaction[];
  totalAmount: number;
  averageAmount: number;
  frequency: number;
  timePattern?: 'day' | 'night' | 'weekend' | 'business-hours';
}

