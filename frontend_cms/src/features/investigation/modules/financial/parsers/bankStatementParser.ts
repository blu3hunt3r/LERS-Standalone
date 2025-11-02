/**
 * TASK 2.1.2: Bank Statement Parser - Excel/PDF/CSV parser with OCR
 */

import { BankStatement, BankTransaction } from '../types';

export class BankStatementParser {
  /**
   * Parse CSV bank statement
   */
  static parseCSV(csvContent: string): BankStatement {
    const lines = csvContent.split('\n').filter(l => l.trim());
    const transactions: BankTransaction[] = [];
    
    // Skip header row
    for (let i = 1; i < lines.length; i++) {
      const cols = lines[i].split(',').map(c => c.trim().replace(/["']/g, ''));
      
      if (cols.length >= 4) {
        const transaction: BankTransaction = {
          date: cols[0],
          description: cols[1],
          amount: parseFloat(cols[2]) || 0,
          balance: parseFloat(cols[3]) || 0,
          type: parseFloat(cols[2]) > 0 ? 'credit' : 'debit',
        };
        
        // Extract counterparty from description
        transaction.counterparty = this.extractCounterparty(cols[1]);
        transaction.reference = cols[4] || '';
        
        transactions.push(transaction);
      }
    }
    
    return {
      accountNumber: 'UNKNOWN',
      accountHolder: 'UNKNOWN',
      bankName: 'UNKNOWN',
      startDate: transactions[0]?.date || '',
      endDate: transactions[transactions.length - 1]?.date || '',
      openingBalance: transactions[0]?.balance || 0,
      closingBalance: transactions[transactions.length - 1]?.balance || 0,
      transactions,
    };
  }

  /**
   * Parse Excel bank statement (requires SheetJS/xlsx library)
   */
  static parseExcel(file: File): Promise<BankStatement> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = (e) => {
        try {
          // In real implementation, use xlsx library here
          // For now, treat as CSV
          const text = e.target?.result as string;
          const statement = this.parseCSV(text);
          resolve(statement);
        } catch (error) {
          reject(error);
        }
      };
      
      reader.onerror = reject;
      reader.readAsText(file);
    });
  }

  /**
   * Parse PDF bank statement (requires pdf.js or Tesseract for OCR)
   */
  static async parsePDF(file: File): Promise<BankStatement> {
    // Placeholder for PDF parsing
    // In production, use pdf.js to extract text or Tesseract.js for OCR
    throw new Error('PDF parsing not yet implemented. Please use CSV/Excel format.');
  }

  /**
   * Extract counterparty name from transaction description
   */
  private static extractCounterparty(description: string): string {
    // Common patterns for extracting counterparty
    const patterns = [
      /UPI-(.+?)-/i,
      /NEFT-(.+?)-/i,
      /IMPS-(.+?)-/i,
      /TO (.+?) A\/C/i,
      /FROM (.+?) A\/C/i,
    ];
    
    for (const pattern of patterns) {
      const match = description.match(pattern);
      if (match && match[1]) {
        return match[1].trim();
      }
    }
    
    return description.substring(0, 50); // Fallback
  }

  /**
   * Detect bank from statement format
   */
  static detectBank(content: string): string {
    const banks: Record<string, RegExp> = {
      'SBI': /state bank of india|sbi/i,
      'HDFC': /hdfc bank/i,
      'ICICI': /icici bank/i,
      'Axis': /axis bank/i,
      'PNB': /punjab national bank/i,
      'Kotak': /kotak mahindra/i,
    };
    
    for (const [bank, pattern] of Object.entries(banks)) {
      if (pattern.test(content)) {
        return bank;
      }
    }
    
    return 'Unknown Bank';
  }

  /**
   * Extract account number from statement
   */
  static extractAccountNumber(content: string): string {
    const patterns = [
      /Account No[.:]?\s*(\d{9,18})/i,
      /A\/C No[.:]?\s*(\d{9,18})/i,
      /Account Number[.:]?\s*(\d{9,18})/i,
    ];
    
    for (const pattern of patterns) {
      const match = content.match(pattern);
      if (match && match[1]) {
        return match[1];
      }
    }
    
    return 'UNKNOWN';
  }
}

