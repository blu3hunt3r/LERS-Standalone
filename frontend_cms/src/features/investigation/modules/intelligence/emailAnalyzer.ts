/**
 * TASK 6.1.1: Email Intelligence Module - Email analysis with header parser
 */

export class EmailAnalyzer {
  static parseHeaders(headers: string): {
    from: string;
    to: string[];
    originatingIP: string;
    spfResult: string;
    dkimResult: string;
    route: string[];
    timezone: string;
  } {
    const parsed = {
      from: '',
      to: [] as string[],
      originatingIP: '',
      spfResult: '',
      dkimResult: '',
      route: [] as string[],
      timezone: '',
    };

    const lines = headers.split('\n');

    for (const line of lines) {
      if (line.startsWith('From:')) {
        parsed.from = line.substring(5).trim();
      } else if (line.startsWith('To:')) {
        parsed.to = line.substring(3).trim().split(',').map(e => e.trim());
      } else if (line.startsWith('Received-SPF:')) {
        parsed.spfResult = line.includes('pass') ? 'PASS' : 'FAIL';
      } else if (line.startsWith('DKIM-Signature:')) {
        parsed.dkimResult = 'PRESENT';
      } else if (line.startsWith('Received:')) {
        const ipMatch = line.match(/\[(\d+\.\d+\.\d+\.\d+)\]/);
        if (ipMatch && !parsed.originatingIP) {
          parsed.originatingIP = ipMatch[1];
        }
        parsed.route.push(line);
      }
    }

    return parsed;
  }

  static analyzeAuthenticity(headers: any): {
    isAuthentic: boolean;
    riskScore: number;
    flags: string[];
  } {
    const flags: string[] = [];
    let riskScore = 0;

    if (headers.spfResult === 'FAIL') {
      flags.push('SPF_FAILED');
      riskScore += 30;
    }

    if (!headers.dkimResult) {
      flags.push('NO_DKIM');
      riskScore += 20;
    }

    if (!headers.originatingIP) {
      flags.push('NO_ORIGINATING_IP');
      riskScore += 25;
    }

    return {
      isAuthentic: riskScore < 30,
      riskScore,
      flags,
    };
  }
}

