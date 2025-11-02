/**
 * TASK 2.1.6: Transaction Clustering - Spending pattern analysis and insights
 */

import { BankStatement, TransactionCluster, BankTransaction } from '../types';

export class TransactionClusterer {
  /**
   * Cluster transactions by spending category
   */
  static clusterByCategory(statement: BankStatement): TransactionCluster[] {
    const clusters = new Map<string, BankTransaction[]>();

    for (const txn of statement.transactions) {
      const category = this.categorizeTransaction(txn);
      if (!clusters.has(category)) {
        clusters.set(category, []);
      }
      clusters.get(category)!.push(txn);
    }

    return Array.from(clusters.entries()).map(([category, transactions]) => ({
      id: `cluster-${category}`,
      category,
      transactions,
      totalAmount: transactions.reduce((sum, t) => sum + Math.abs(t.amount), 0),
      averageAmount: transactions.reduce((sum, t) => sum + Math.abs(t.amount), 0) / transactions.length,
      frequency: transactions.length,
      timePattern: this.detectTimePattern(transactions),
    }));
  }

  /**
   * Categorize transaction based on description
   */
  private static categorizeTransaction(txn: BankTransaction): string {
    const desc = txn.description.toLowerCase();

    // E-commerce
    if (desc.includes('amazon') || desc.includes('flipkart') || desc.includes('myntra') || desc.includes('meesho')) {
      return 'E-commerce';
    }

    // Gambling/Betting
    if (desc.includes('bet') || desc.includes('casino') || desc.includes('lottery') || desc.includes('gaming')) {
      return 'Gambling';
    }

    // Crypto
    if (desc.includes('coinbase') || desc.includes('binance') || desc.includes('wazirx') || desc.includes('crypto')) {
      return 'Cryptocurrency';
    }

    // UPI Transfers
    if (desc.includes('upi') || desc.includes('phonepe') || desc.includes('paytm') || desc.includes('gpay')) {
      return 'UPI Transfer';
    }

    // ATM Withdrawals
    if (desc.includes('atm') || desc.includes('withdrawal') || desc.includes('cash')) {
      return 'Cash Withdrawal';
    }

    // Bank Transfers
    if (desc.includes('neft') || desc.includes('imps') || desc.includes('rtgs')) {
      return 'Bank Transfer';
    }

    // Utilities
    if (desc.includes('electricity') || desc.includes('water') || desc.includes('gas') || desc.includes('mobile') || desc.includes('broadband')) {
      return 'Utilities';
    }

    // Food & Dining
    if (desc.includes('zomato') || desc.includes('swiggy') || desc.includes('restaurant') || desc.includes('food')) {
      return 'Food & Dining';
    }

    // Travel
    if (desc.includes('ola') || desc.includes('uber') || desc.includes('irctc') || desc.includes('flight') || desc.includes('hotel')) {
      return 'Travel';
    }

    // Investment
    if (desc.includes('mutual fund') || desc.includes('sip') || desc.includes('investment') || desc.includes('zerodha') || desc.includes('upstox')) {
      return 'Investment';
    }

    // Insurance
    if (desc.includes('insurance') || desc.includes('premium') || desc.includes('policy')) {
      return 'Insurance';
    }

    // Loan/EMI
    if (desc.includes('loan') || desc.includes('emi') || desc.includes('repayment')) {
      return 'Loan/EMI';
    }

    // Salary/Income
    if (txn.type === 'credit' && (desc.includes('salary') || desc.includes('payroll') || desc.includes('income'))) {
      return 'Salary/Income';
    }

    return 'Other';
  }

  /**
   * Detect time pattern of transactions
   */
  private static detectTimePattern(transactions: BankTransaction[]): 'day' | 'night' | 'weekend' | 'business-hours' | undefined {
    let dayCount = 0;
    let nightCount = 0;
    let weekendCount = 0;
    let businessCount = 0;

    for (const txn of transactions) {
      const date = new Date(txn.date);
      const hour = date.getHours();
      const day = date.getDay();

      if (day === 0 || day === 6) {
        weekendCount++;
      }

      if (hour >= 9 && hour <= 18 && day >= 1 && day <= 5) {
        businessCount++;
      } else if (hour >= 22 || hour <= 6) {
        nightCount++;
      } else {
        dayCount++;
      }
    }

    const total = transactions.length;
    if (nightCount > total * 0.6) return 'night';
    if (weekendCount > total * 0.6) return 'weekend';
    if (businessCount > total * 0.6) return 'business-hours';
    if (dayCount > total * 0.6) return 'day';

    return undefined;
  }

  /**
   * Generate spending insights
   */
  static generateInsights(clusters: TransactionCluster[]): string[] {
    const insights: string[] = [];

    // Sort by total amount
    const sortedClusters = [...clusters].sort((a, b) => b.totalAmount - a.totalAmount);

    if (sortedClusters.length > 0) {
      const top = sortedClusters[0];
      insights.push(`💰 Top spending category: ${top.category} (₹${top.totalAmount.toLocaleString()}, ${top.frequency} transactions)`);
    }

    // Check for gambling
    const gambling = clusters.find(c => c.category === 'Gambling');
    if (gambling && gambling.totalAmount > 50000) {
      insights.push(`🎰 High gambling activity detected: ₹${gambling.totalAmount.toLocaleString()} across ${gambling.frequency} transactions`);
    }

    // Check for crypto
    const crypto = clusters.find(c => c.category === 'Cryptocurrency');
    if (crypto) {
      insights.push(`₿ Cryptocurrency transactions: ₹${crypto.totalAmount.toLocaleString()} (${crypto.frequency} transactions)`);
    }

    // Check for night activity
    const nightClusters = clusters.filter(c => c.timePattern === 'night');
    if (nightClusters.length > 0) {
      const nightTotal = nightClusters.reduce((sum, c) => sum + c.totalAmount, 0);
      insights.push(`🌙 Significant night activity (10 PM - 6 AM): ₹${nightTotal.toLocaleString()}`);
    }

    // Check for cash withdrawals
    const cash = clusters.find(c => c.category === 'Cash Withdrawal');
    if (cash && cash.totalAmount > 100000) {
      insights.push(`💵 High cash withdrawal: ₹${cash.totalAmount.toLocaleString()} (possible cash-based transactions)`);
    }

    // Check for e-commerce
    const ecommerce = clusters.find(c => c.category === 'E-commerce');
    if (ecommerce && ecommerce.frequency > 20) {
      insights.push(`🛒 Frequent online shopping: ${ecommerce.frequency} transactions worth ₹${ecommerce.totalAmount.toLocaleString()}`);
    }

    return insights;
  }

  /**
   * Cluster by amount range
   */
  static clusterByAmountRange(statement: BankStatement): TransactionCluster[] {
    const ranges = [
      { id: 'micro', label: 'Micro (< ₹1,000)', min: 0, max: 1000 },
      { id: 'small', label: 'Small (₹1,000 - ₹10,000)', min: 1000, max: 10000 },
      { id: 'medium', label: 'Medium (₹10,000 - ₹50,000)', min: 10000, max: 50000 },
      { id: 'large', label: 'Large (₹50,000 - ₹1,00,000)', min: 50000, max: 100000 },
      { id: 'very-large', label: 'Very Large (> ₹1,00,000)', min: 100000, max: Infinity },
    ];

    return ranges.map(range => {
      const transactions = statement.transactions.filter(t => {
        const amount = Math.abs(t.amount);
        return amount >= range.min && amount < range.max;
      });

      return {
        id: `amount-${range.id}`,
        category: range.label,
        transactions,
        totalAmount: transactions.reduce((sum, t) => sum + Math.abs(t.amount), 0),
        averageAmount: transactions.length > 0 ? transactions.reduce((sum, t) => sum + Math.abs(t.amount), 0) / transactions.length : 0,
        frequency: transactions.length,
      };
    }).filter(c => c.frequency > 0);
  }
}

