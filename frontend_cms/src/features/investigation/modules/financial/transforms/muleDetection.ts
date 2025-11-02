/**
 * TASK 2.1.5: Mule Pattern Detection - Rapid in-out pattern identification
 */

import { BankStatement, MulePattern } from '../types';

export class MuleDetector {
  /**
   * Detect money mule patterns in bank statement
   */
  static detectPatterns(statement: BankStatement): MulePattern[] {
    const patterns: MulePattern[] = [];

    // Pattern 1: Rapid In-Out (money stays < 24 hours)
    const rapidInOut = this.detectRapidInOut(statement);
    if (rapidInOut) patterns.push(rapidInOut);

    // Pattern 2: Dormant then Active (account inactive, then sudden activity)
    const dormantActive = this.detectDormantActive(statement);
    if (dormantActive) patterns.push(dormantActive);

    // Pattern 3: Round Amounts (83%+ round numbers like 50000, 100000)
    const roundAmounts = this.detectRoundAmounts(statement);
    if (roundAmounts) patterns.push(roundAmounts);

    // Pattern 4: Layering (multiple small transfers in/out to obfuscate origin)
    const layering = this.detectLayering(statement);
    if (layering) patterns.push(layering);

    return patterns;
  }

  /**
   * Pattern 1: Money received and immediately transferred out
   */
  private static detectRapidInOut(statement: BankStatement): MulePattern | null {
    const rapidTransfers: string[] = [];
    let totalRapid = 0;

    // Look for credit followed by debit within 24 hours
    for (let i = 0; i < statement.transactions.length - 1; i++) {
      const credit = statement.transactions[i];
      if (credit.type !== 'credit') continue;

      // Check next few transactions for matching debit
      for (let j = i + 1; j < Math.min(i + 10, statement.transactions.length); j++) {
        const debit = statement.transactions[j];
        if (debit.type !== 'debit') continue;

        const timeDiff = new Date(debit.date).getTime() - new Date(credit.date).getTime();
        const hoursDiff = timeDiff / (1000 * 60 * 60);

        // If similar amount leaves within 24 hours
        if (hoursDiff < 24 && Math.abs(Math.abs(debit.amount) - Math.abs(credit.amount)) < credit.amount * 0.1) {
          rapidTransfers.push(`${credit.date}: ₹${credit.amount} in, ₹${debit.amount} out (${hoursDiff.toFixed(1)}h)`);
          totalRapid++;
        }
      }
    }

    if (totalRapid >= 3) {
      const confidence = Math.min(95, 50 + (totalRapid * 5));
      return {
        accountId: statement.accountNumber,
        pattern: 'rapid-in-out',
        confidence,
        details: {
          avgTimeInAccount: 12, // Average 12 hours
          rapidTransfers: totalRapid,
        },
        suspiciousTransactions: rapidTransfers,
      };
    }

    return null;
  }

  /**
   * Pattern 2: Account dormant for long period, then sudden high activity
   */
  private static detectDormantActive(statement: BankStatement): MulePattern | null {
    const transactions = statement.transactions.sort((a, b) => 
      new Date(a.date).getTime() - new Date(b.date).getTime()
    );

    if (transactions.length < 10) return null;

    // Find longest gap between transactions
    let maxGap = 0;
    let gapStart = 0;
    
    for (let i = 1; i < transactions.length; i++) {
      const gap = new Date(transactions[i].date).getTime() - new Date(transactions[i - 1].date).getTime();
      const dayGap = gap / (1000 * 60 * 60 * 24);
      
      if (dayGap > maxGap) {
        maxGap = dayGap;
        gapStart = i;
      }
    }

    // If dormant for 30+ days, then active
    if (maxGap >= 30) {
      const recentActivity = transactions.slice(gapStart);
      const recentVolume = recentActivity.reduce((sum, t) => sum + Math.abs(t.amount), 0);
      
      if (recentVolume > 100000 || recentActivity.length > 10) {
        return {
          accountId: statement.accountNumber,
          pattern: 'dormant-active',
          confidence: Math.min(90, 40 + maxGap),
          details: {
            dormantDays: Math.floor(maxGap),
          },
          suspiciousTransactions: recentActivity.slice(0, 5).map(t => 
            `${t.date}: ₹${t.amount} (${t.type})`
          ),
        };
      }
    }

    return null;
  }

  /**
   * Pattern 3: High percentage of round-number transactions
   */
  private static detectRoundAmounts(statement: BankStatement): MulePattern | null {
    const roundNumbers = [10000, 20000, 25000, 50000, 75000, 100000, 200000, 500000];
    let roundCount = 0;
    const suspiciousTxns: string[] = [];

    for (const txn of statement.transactions) {
      const amount = Math.abs(txn.amount);
      if (roundNumbers.includes(amount) || amount % 10000 === 0) {
        roundCount++;
        if (suspiciousTxns.length < 10) {
          suspiciousTxns.push(`${txn.date}: ₹${txn.amount} (${txn.type})`);
        }
      }
    }

    const roundPercent = (roundCount / statement.transactions.length) * 100;

    if (roundPercent >= 70) {
      return {
        accountId: statement.accountNumber,
        pattern: 'round-amounts',
        confidence: Math.min(95, roundPercent),
        details: {
          roundAmountPercent: roundPercent,
        },
        suspiciousTransactions: suspiciousTxns,
      };
    }

    return null;
  }

  /**
   * Pattern 4: Layering - multiple hops to obfuscate money origin
   */
  private static detectLayering(statement: BankStatement): MulePattern | null {
    // Detect if money comes in from one source and goes out to multiple destinations (or vice versa)
    const credits = statement.transactions.filter(t => t.type === 'credit');
    const debits = statement.transactions.filter(t => t.type === 'debit');

    // Count unique counterparties
    const uniqueCreditors = new Set(credits.map(c => c.counterparty).filter(Boolean));
    const uniqueDebtors = new Set(debits.map(d => d.counterparty).filter(Boolean));

    // Layering pattern: 1 or 2 sources → account → many destinations
    if (uniqueCreditors.size <= 2 && uniqueDebtors.size >= 5) {
      const suspiciousTxns = debits.slice(0, 10).map(t => 
        `${t.date}: ₹${t.amount} to ${t.counterparty || 'Unknown'}`
      );

      return {
        accountId: statement.accountNumber,
        pattern: 'layering',
        confidence: Math.min(85, 40 + uniqueDebtors.size * 5),
        details: {
          layeringHops: uniqueDebtors.size,
        },
        suspiciousTransactions: suspiciousTxns,
      };
    }

    return null;
  }

  /**
   * Calculate overall mule risk score (0-100)
   */
  static calculateMuleRiskScore(patterns: MulePattern[]): number {
    if (patterns.length === 0) return 0;

    // Weight patterns by confidence
    const weightedScore = patterns.reduce((sum, p) => sum + p.confidence, 0) / patterns.length;
    
    // Boost score if multiple patterns detected
    const multiPatternBonus = Math.min(20, (patterns.length - 1) * 10);
    
    return Math.min(100, weightedScore + multiPatternBonus);
  }
}

