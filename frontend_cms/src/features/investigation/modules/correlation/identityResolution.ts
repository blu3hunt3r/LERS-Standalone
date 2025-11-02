/**
 * TASK 5.1.1: Identity Resolution System - Fuzzy matching across sources
 */

export class IdentityResolver {
  /**
   * Fuzzy match phone numbers
   */
  static matchPhoneNumbers(phone1: string, phone2: string): number {
    const clean1 = this.normalizePhone(phone1);
    const clean2 = this.normalizePhone(phone2);
    
    if (clean1 === clean2) return 1.0;
    if (clean1.endsWith(clean2.slice(-8)) || clean2.endsWith(clean1.slice(-8))) return 0.9;
    return 0.0;
  }

  /**
   * Fuzzy match names
   */
  static matchNames(name1: string, name2: string): number {
    const clean1 = name1.toLowerCase().trim();
    const clean2 = name2.toLowerCase().trim();
    
    if (clean1 === clean2) return 1.0;
    
    // Check if one is substring of other
    if (clean1.includes(clean2) || clean2.includes(clean1)) return 0.8;
    
    // Levenshtein distance
    return 1 - (this.levenshteinDistance(clean1, clean2) / Math.max(clean1.length, clean2.length));
  }

  /**
   * Match email addresses
   */
  static matchEmails(email1: string, email2: string): number {
    return email1.toLowerCase() === email2.toLowerCase() ? 1.0 : 0.0;
  }

  /**
   * Resolve entity across multiple sources
   */
  static resolveEntity(sources: { type: string; value: string; metadata?: any }[]): {
    confidence: number;
    matchedSources: string[];
    primaryIdentity: string;
  } {
    if (sources.length === 0) return { confidence: 0, matchedSources: [], primaryIdentity: '' };
    if (sources.length === 1) return {
      confidence: 0.5,
      matchedSources: [sources[0].type],
      primaryIdentity: sources[0].value,
    };

    let totalConfidence = 0;
    let matches = 0;

    for (let i = 0; i < sources.length - 1; i++) {
      for (let j = i + 1; j < sources.length; j++) {
        const sim = this.calculateSimilarity(sources[i].value, sources[j].value);
        if (sim > 0.7) {
          totalConfidence += sim;
          matches++;
        }
      }
    }

    const avgConfidence = matches > 0 ? totalConfidence / matches : 0.5;

    return {
      confidence: avgConfidence,
      matchedSources: sources.map(s => s.type),
      primaryIdentity: sources[0].value,
    };
  }

  private static normalizePhone(phone: string): string {
    return phone.replace(/[\s\-()]/g, '').replace(/^\+?91/, '');
  }

  private static levenshteinDistance(str1: string, str2: string): number {
    const matrix: number[][] = [];

    for (let i = 0; i <= str2.length; i++) {
      matrix[i] = [i];
    }

    for (let j = 0; j <= str1.length; j++) {
      matrix[0][j] = j;
    }

    for (let i = 1; i <= str2.length; i++) {
      for (let j = 1; j <= str1.length; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          );
        }
      }
    }

    return matrix[str2.length][str1.length];
  }

  private static calculateSimilarity(val1: string, val2: string): number {
    // Try different matching strategies
    if (val1.includes('@') && val2.includes('@')) {
      return this.matchEmails(val1, val2);
    } else if (/^\d+$/.test(val1) && /^\d+$/.test(val2)) {
      return this.matchPhoneNumbers(val1, val2);
    } else {
      return this.matchNames(val1, val2);
    }
  }
}

