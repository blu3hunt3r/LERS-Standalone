/**
 * TASK 5.1.4: Lifestyle Consistency Check - Behavioral inconsistency detection
 */

export class LifestyleChecker {
  static check(data: {
    bankingData?: { totalSpending: number; luxuryPurchases: number };
    socialMedia?: { postsAboutWealth: number; luxuryBrands: number };
    employment?: { salary: number; position: string };
    assets?: { vehicles: string[]; properties: string[] };
  }): {
    isConsistent: boolean;
    inconsistencies: string[];
    riskScore: number;
  } {
    const inconsistencies: string[] = [];
    let riskScore = 0;

    // Check spending vs declared income
    if (data.bankingData && data.employment) {
      const monthlySpending = data.bankingData.totalSpending;
      const monthlySalary = data.employment.salary / 12;

      if (monthlySpending > monthlySalary * 2) {
        inconsistencies.push(
          `💰 Spending (₹${monthlySpending.toLocaleString()}) exceeds salary (₹${monthlySalary.toLocaleString()}) by 2x`
        );
        riskScore += 30;
      }
    }

    // Check social media lifestyle vs actual spending
    if (data.socialMedia && data.socialMedia.postsAboutWealth > 10 && data.bankingData) {
      if (data.bankingData.luxuryPurchases < 5) {
        inconsistencies.push(
          `📱 Posts luxury lifestyle but minimal luxury purchases (${data.bankingData.luxuryPurchases})`
        );
        riskScore += 20;
      }
    }

    // Check assets vs declared income
    if (data.assets && data.employment) {
      const hasExpensiveAssets = data.assets.vehicles.some(v => 
        v.toLowerCase().includes('bmw') || 
        v.toLowerCase().includes('mercedes') || 
        v.toLowerCase().includes('audi')
      );

      if (hasExpensiveAssets && data.employment.salary < 1000000) {
        inconsistencies.push(
          `🚗 Owns luxury vehicle but salary < ₹10L/year (declared: ₹${data.employment.salary.toLocaleString()})`
        );
        riskScore += 25;
      }
    }

    return {
      isConsistent: inconsistencies.length === 0,
      inconsistencies,
      riskScore: Math.min(100, riskScore),
    };
  }
}

