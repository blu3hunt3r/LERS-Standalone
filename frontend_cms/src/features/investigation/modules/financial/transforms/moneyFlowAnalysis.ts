/**
 * TASK 2.1.3: Money Flow Analysis Transform - Multi-hop tracing with Sankey
 */

import { BankStatement, MoneyFlowNode, MoneyFlowLink } from '../types';

export interface MoneyFlowResult {
  nodes: MoneyFlowNode[];
  links: MoneyFlowLink[];
  totalFlow: number;
  hops: number;
  sankeyData: any; // For D3 Sankey diagram
}

export class MoneyFlowAnalyzer {
  /**
   * Trace money flow from a source account (multi-hop)
   */
  static traceFlow(
    statements: Map<string, BankStatement>,
    sourceAccount: string,
    maxHops: number = 3
  ): MoneyFlowResult {
    const nodes = new Map<string, MoneyFlowNode>();
    const links: MoneyFlowLink[] = [];
    const visited = new Set<string>();
    const queue: { account: string; hop: number }[] = [{ account: sourceAccount, hop: 0 }];

    while (queue.length > 0) {
      const { account, hop } = queue.shift()!;
      
      if (visited.has(account) || hop > maxHops) continue;
      visited.add(account);

      const statement = statements.get(account);
      if (!statement) continue;

      // Create node for this account
      if (!nodes.has(account)) {
        nodes.set(account, {
          accountId: account,
          accountNumber: statement.accountNumber,
          totalIn: 0,
          totalOut: 0,
          netFlow: 0,
          transactionCount: 0,
        });
      }

      const node = nodes.get(account)!;

      // Analyze transactions
      for (const txn of statement.transactions) {
        node.transactionCount++;
        
        if (txn.type === 'credit') {
          node.totalIn += Math.abs(txn.amount);
        } else {
          node.totalOut += Math.abs(txn.amount);
        }

        // Extract counterparty and create link
        if (txn.counterparty) {
          const counterpartyId = this.normalizeAccountId(txn.counterparty);
          
          // Find or create link
          let link = links.find(
            l => (l.source === account && l.target === counterpartyId) ||
                 (l.source === counterpartyId && l.target === account)
          );
          
          if (!link) {
            link = {
              source: txn.type === 'debit' ? account : counterpartyId,
              target: txn.type === 'debit' ? counterpartyId : account,
              amount: 0,
              transactionCount: 0,
              dates: [],
            };
            links.push(link);
          }
          
          link.amount += Math.abs(txn.amount);
          link.transactionCount++;
          link.dates.push(txn.date);

          // Add counterparty to queue for next hop
          if (hop < maxHops && statements.has(counterpartyId)) {
            queue.push({ account: counterpartyId, hop: hop + 1 });
          }
        }
      }

      node.netFlow = node.totalIn - node.totalOut;
    }

    const totalFlow = Array.from(nodes.values()).reduce((sum, n) => sum + n.totalOut, 0);

    return {
      nodes: Array.from(nodes.values()),
      links,
      totalFlow,
      hops: maxHops,
      sankeyData: this.buildSankeyData(Array.from(nodes.values()), links),
    };
  }

  /**
   * Build Sankey diagram data for D3
   */
  private static buildSankeyData(nodes: MoneyFlowNode[], links: MoneyFlowLink[]) {
    return {
      nodes: nodes.map((n, idx) => ({
        node: idx,
        name: n.accountNumber.slice(-4),
        value: n.totalOut,
      })),
      links: links.map(l => {
        const sourceIdx = nodes.findIndex(n => n.accountId === l.source);
        const targetIdx = nodes.findIndex(n => n.accountId === l.target);
        return {
          source: sourceIdx,
          target: targetIdx,
          value: l.amount,
        };
      }),
    };
  }

  /**
   * Normalize account ID for consistent matching
   */
  private static normalizeAccountId(accountInfo: string): string {
    // Extract numbers from account info
    const numbers = accountInfo.match(/\d{9,18}/);
    return numbers ? numbers[0] : accountInfo.toLowerCase().replace(/\s+/g, '-');
  }

  /**
   * Identify circular flows (money laundering indicator)
   */
  static detectCircularFlow(result: MoneyFlowResult): string[][] {
    const circles: string[][] = [];
    const graph = new Map<string, string[]>();

    // Build adjacency list
    for (const link of result.links) {
      if (!graph.has(link.source)) graph.set(link.source, []);
      graph.get(link.source)!.push(link.target);
    }

    // DFS to find cycles
    const visited = new Set<string>();
    const recStack = new Set<string>();

    const dfs = (node: string, path: string[]): void => {
      visited.add(node);
      recStack.add(node);
      path.push(node);

      const neighbors = graph.get(node) || [];
      for (const neighbor of neighbors) {
        if (!visited.has(neighbor)) {
          dfs(neighbor, [...path]);
        } else if (recStack.has(neighbor)) {
          // Found a cycle
          const cycleStart = path.indexOf(neighbor);
          circles.push(path.slice(cycleStart));
        }
      }

      recStack.delete(node);
    };

    for (const node of result.nodes) {
      if (!visited.has(node.accountId)) {
        dfs(node.accountId, []);
      }
    }

    return circles;
  }
}

