/**
 * TASK 2.1.4: Velocity Detection Transform - Transaction velocity anomaly detection
 */

import { BankStatement, VelocityAnalysis } from '../types';

export class VelocityDetector {
  /**
   * Analyze transaction velocity for an account
   */
  static analyze(statement: BankStatement, accountOpenDate?: string): VelocityAnalysis {
    const openDate = accountOpenDate ? new Date(accountOpenDate) : new Date(statement.startDate);
    const lastTxnDate = new Date(statement.endDate);
    const daysSinceOpen = Math.max(1, Math.floor((lastTxnDate.getTime() - openDate.getTime()) / (1000 * 60 * 60 * 24)));

    const totalVolume = statement.transactions.reduce((sum, txn) => sum + Math.abs(txn.amount), 0);
    const transactionCount = statement.transactions.length;
    const dailyAverage = totalVolume / daysSinceOpen;

    // Calculate velocity score (0-100)
    let velocityScore = 0;
    const flags: string[] = [];

    // Factor 1: Account age vs volume (new accounts with high volume)
    if (daysSinceOpen <= 7 && totalVolume > 100000) {
      velocityScore += 40;
      flags.push('NEW_ACCOUNT_HIGH_VOLUME');
    } else if (daysSinceOpen <= 30 && totalVolume > 500000) {
      velocityScore += 30;
      flags.push('YOUNG_ACCOUNT_VERY_HIGH_VOLUME');
    }

    // Factor 2: Transaction frequency
    const txnsPerDay = transactionCount / daysSinceOpen;
    if (txnsPerDay > 20) {
      velocityScore += 20;
      flags.push('VERY_HIGH_FREQUENCY');
    } else if (txnsPerDay > 10) {
      velocityScore += 10;
      flags.push('HIGH_FREQUENCY');
    }

    // Factor 3: Large individual transactions
    const largeTxns = statement.transactions.filter(t => Math.abs(t.amount) > 50000);
    if (largeTxns.length > 5) {
      velocityScore += 15;
      flags.push('MULTIPLE_LARGE_TRANSACTIONS');
    }

    // Factor 4: Rapid succession transactions
    const rapidTxns = this.detectRapidTransactions(statement.transactions);
    if (rapidTxns > 10) {
      velocityScore += 15;
      flags.push('RAPID_SUCCESSION_TRANSACTIONS');
    }

    // Factor 5: Weekend/night activity (suspicious for business accounts)
    const oddHourTxns = this.detectOddHourActivity(statement.transactions);
    if (oddHourTxns > transactionCount * 0.5) {
      velocityScore += 10;
      flags.push('ODD_HOUR_ACTIVITY');
    }

    velocityScore = Math.min(100, velocityScore);

    // Determine risk level
    let riskLevel: 'low' | 'medium' | 'high' | 'critical';
    if (velocityScore >= 80) riskLevel = 'critical';
    else if (velocityScore >= 60) riskLevel = 'high';
    else if (velocityScore >= 40) riskLevel = 'medium';
    else riskLevel = 'low';

    return {
      accountId: statement.accountNumber,
      accountOpenDate: openDate.toISOString(),
      daysSinceOpen,
      totalVolume,
      transactionCount,
      dailyAverage,
      velocityScore,
      riskLevel,
      flags,
    };
  }

  /**
   * Detect transactions happening in rapid succession (< 5 minutes apart)
   */
  private static detectRapidTransactions(transactions: any[]): number {
    let rapidCount = 0;
    
    for (let i = 1; i < transactions.length; i++) {
      const prev = new Date(transactions[i - 1].date);
      const curr = new Date(transactions[i].date);
      const diffMinutes = (curr.getTime() - prev.getTime()) / (1000 * 60);
      
      if (diffMinutes < 5 && diffMinutes > 0) {
        rapidCount++;
      }
    }
    
    return rapidCount;
  }

  /**
   * Detect transactions during odd hours (10 PM - 6 AM, weekends)
   */
  private static detectOddHourActivity(transactions: any[]): number {
    let oddHourCount = 0;
    
    for (const txn of transactions) {
      const date = new Date(txn.date);
      const hour = date.getHours();
      const day = date.getDay();
      
      // Night hours or weekend
      if (hour >= 22 || hour <= 6 || day === 0 || day === 6) {
        oddHourCount++;
      }
    }
    
    return oddHourCount;
  }

  /**
   * Calculate velocity trend (increasing, stable, decreasing)
   */
  static calculateTrend(statements: BankStatement[]): 'increasing' | 'stable' | 'decreasing' {
    if (statements.length < 2) return 'stable';

    const volumes = statements.map(s => 
      s.transactions.reduce((sum, t) => sum + Math.abs(t.amount), 0)
    );

    let increasing = 0;
    let decreasing = 0;

    for (let i = 1; i < volumes.length; i++) {
      if (volumes[i] > volumes[i - 1] * 1.2) increasing++;
      else if (volumes[i] < volumes[i - 1] * 0.8) decreasing++;
    }

    if (increasing > volumes.length / 2) return 'increasing';
    if (decreasing > volumes.length / 2) return 'decreasing';
    return 'stable';
  }
}

