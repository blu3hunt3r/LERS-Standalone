/**
 * Smart Tables View for Financial Investigation
 *
 * Shows exact money flow with cumulative tracking:
 * - Account received X from parent
 * - Account sent Y to child 1 (cumulative: Y)
 * - Account sent Z to child 2 (cumulative: Y+Z)
 * - Account retained: X - (Y+Z)
 */

import React, { useState, useMemo } from 'react';
import {
  ChevronRight,
  ChevronDown,
  TrendingDown,
  TrendingUp,
  DollarSign,
  AlertCircle,
  Filter,
  Download,
  Search,
  ArrowRight,
  Wallet,
  Eye
} from 'lucide-react';

interface Transaction {
  id: string;
  from: string;
  to: string;
  amount: number;
  date: string;
  time: string;
}

interface AccountFlow {
  accountId: string;
  accountNumber: string;
  bankName: string;
  layer: number;
  classification: string;

  // Money tracking
  totalReceived: number;
  receivedFrom: { accountId: string; accountNumber: string; amount: number; }[];

  totalSent: number;
  sentTo: { accountId: string; accountNumber: string; amount: number; cumulativeAmount: number; }[];

  retained: number; // totalReceived - totalSent
  retentionRate: number; // (retained / totalReceived) * 100

  transactions: Transaction[];
}

interface SmartTablesViewProps {
  nodes: any[];
  links: any[];
  onAccountClick?: (accountId: string) => void;
}

export const SmartTablesView: React.FC<SmartTablesViewProps> = ({
  nodes,
  links,
  onAccountClick
}) => {
  const [expandedAccounts, setExpandedAccounts] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'received' | 'sent' | 'retained'>('received');
  const [filterLayer, setFilterLayer] = useState<number | null>(null);

  // Build account flow data
  const accountFlows = useMemo(() => {
    console.log('💰 Building account flow data with exact money tracking...');

    const flowMap = new Map<string, AccountFlow>();

    // Initialize accounts
    nodes.forEach(node => {
      flowMap.set(node.id, {
        accountId: node.id,
        accountNumber: node.metadata?.account_number || node.id,
        bankName: node.metadata?.bank_name || 'Unknown Bank',
        layer: node.metadata?.layer || 0,
        classification: node.metadata?.classification || 'INTERMEDIATE',
        totalReceived: 0,
        receivedFrom: [],
        totalSent: 0,
        sentTo: [],
        retained: 0,
        retentionRate: 0,
        transactions: []
      });
    });

    // Process all transactions
    links.forEach(link => {
      const fromAccount = flowMap.get(link.source);
      const toAccount = flowMap.get(link.target);

      if (fromAccount && toAccount) {
        const amount = parseFloat(link.metadata?.amount || link.metadata?.transaction_amount || '0');
        const date = link.metadata?.transaction_date || link.metadata?.date || '';

        // Track received
        toAccount.totalReceived += amount;
        toAccount.receivedFrom.push({
          accountId: link.source,
          accountNumber: fromAccount.accountNumber,
          amount
        });

        // Track sent (with cumulative)
        fromAccount.totalSent += amount;
        const cumulativeAmount = fromAccount.totalSent; // Running total
        fromAccount.sentTo.push({
          accountId: link.target,
          accountNumber: toAccount.accountNumber,
          amount,
          cumulativeAmount
        });

        // Store transaction
        const transaction: Transaction = {
          id: link.id,
          from: link.source,
          to: link.target,
          amount,
          date,
          time: ''
        };
        fromAccount.transactions.push(transaction);
      }
    });

    // Calculate retention
    flowMap.forEach(account => {
      account.retained = account.totalReceived - account.totalSent;
      account.retentionRate = account.totalReceived > 0
        ? (account.retained / account.totalReceived) * 100
        : 0;

      // Sort sentTo by order (to maintain sequence)
      account.sentTo.sort((a, b) => a.cumulativeAmount - b.cumulativeAmount);
    });

    const flows = Array.from(flowMap.values());
    console.log('✅ Account flows built:', flows.length, 'accounts');
    return flows;
  }, [nodes, links]);

  // Filter and sort
  const filteredFlows = useMemo(() => {
    let filtered = accountFlows;

    // Filter by search
    if (searchQuery) {
      filtered = filtered.filter(f =>
        f.accountNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
        f.bankName.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Filter by layer
    if (filterLayer !== null) {
      filtered = filtered.filter(f => f.layer === filterLayer);
    }

    // Sort
    filtered = [...filtered].sort((a, b) => {
      if (sortBy === 'received') return b.totalReceived - a.totalReceived;
      if (sortBy === 'sent') return b.totalSent - a.totalSent;
      return b.retained - a.retained;
    });

    return filtered;
  }, [accountFlows, searchQuery, filterLayer, sortBy]);

  // Format amount
  const formatAmount = (amount: number): string => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(amount);
  };

  // Toggle expand
  const toggleExpand = (accountId: string) => {
    setExpandedAccounts(prev => {
      const next = new Set(prev);
      if (next.has(accountId)) {
        next.delete(accountId);
      } else {
        next.add(accountId);
      }
      return next;
    });
  };

  // Get classification style
  const getClassificationColor = (classification: string) => {
    switch (classification) {
      case 'SUSPECT': return 'text-red-600 bg-red-50';
      case 'MULE': return 'text-orange-600 bg-orange-50';
      case 'SPLITTER': return 'text-yellow-600 bg-yellow-50';
      case 'ENDPOINT': return 'text-green-600 bg-green-50';
      default: return 'text-blue-600 bg-blue-50';
    }
  };

  return (
    <div className="h-full flex flex-col bg-white">
      {/* Header */}
      <div className="border-b border-gray-200 p-4">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">
              Smart Tables - Exact Money Flow Tracking
            </h2>
            <p className="text-sm text-gray-600">
              See how much each account received, sent (with cumulative totals), and retained
            </p>
          </div>
          <button className="px-3 py-1.5 text-sm bg-blue-50 text-blue-700 rounded hover:bg-blue-100 flex items-center gap-1">
            <Download className="w-4 h-4" />
            Export CSV
          </button>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-4">
          {/* Search */}
          <div className="flex-1 relative">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-gray-400" />
            <input
              type="text"
              placeholder="Search account or bank..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Sort */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
          >
            <option value="received">Sort by Received</option>
            <option value="sent">Sort by Sent</option>
            <option value="retained">Sort by Retained</option>
          </select>

          {/* Layer Filter */}
          <select
            value={filterLayer ?? ''}
            onChange={(e) => setFilterLayer(e.target.value ? parseInt(e.target.value) : null)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Layers</option>
            {Array.from(new Set(accountFlows.map(f => f.layer))).sort().map(layer => (
              <option key={layer} value={layer}>Layer {layer}</option>
            ))}
          </select>
        </div>

        {/* Stats */}
        <div className="flex items-center gap-6 mt-4 text-sm">
          <div className="flex items-center gap-2">
            <DollarSign className="w-4 h-4 text-gray-600" />
            <span className="text-gray-700">
              Total Flow: {formatAmount(accountFlows.reduce((sum, f) => sum + f.totalSent, 0))}
            </span>
          </div>
          <div className="text-gray-500">•</div>
          <div className="text-gray-700">
            {filteredFlows.length} Accounts
          </div>
        </div>
      </div>

      {/* Table Content */}
      <div className="flex-1 overflow-auto">
        <div className="min-w-full">
          {filteredFlows.map(account => {
            const isExpanded = expandedAccounts.has(account.accountId);
            const hasOutgoing = account.sentTo.length > 0;

            return (
              <div key={account.accountId} className="border-b border-gray-100">
                {/* Account Row */}
                <div
                  className="flex items-center gap-4 p-4 hover:bg-gray-50 cursor-pointer"
                  onClick={() => hasOutgoing && toggleExpand(account.accountId)}
                >
                  {/* Expand Icon */}
                  <div className="w-6 flex items-center justify-center">
                    {hasOutgoing && (
                      isExpanded ? (
                        <ChevronDown className="w-4 h-4 text-gray-600" />
                      ) : (
                        <ChevronRight className="w-4 h-4 text-gray-600" />
                      )
                    )}
                  </div>

                  {/* Account Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-mono text-sm font-medium text-gray-900">
                        {account.accountNumber}
                      </span>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${getClassificationColor(account.classification)}`}>
                        {account.classification}
                      </span>
                      <span className="text-xs text-gray-500">Layer {account.layer}</span>
                    </div>
                    <div className="text-xs text-gray-600">{account.bankName}</div>
                  </div>

                  {/* Money Flow Summary */}
                  <div className="flex items-center gap-6">
                    {/* Received */}
                    <div className="text-right">
                      <div className="flex items-center gap-1 text-xs text-gray-500 mb-1">
                        <TrendingDown className="w-3 h-3" />
                        <span>Received</span>
                      </div>
                      <div className="text-sm font-semibold text-green-600">
                        {formatAmount(account.totalReceived)}
                      </div>
                      <div className="text-xs text-gray-500">
                        from {account.receivedFrom.length} source{account.receivedFrom.length !== 1 ? 's' : ''}
                      </div>
                    </div>

                    {/* Sent */}
                    <div className="text-right">
                      <div className="flex items-center gap-1 text-xs text-gray-500 mb-1">
                        <TrendingUp className="w-3 h-3" />
                        <span>Sent</span>
                      </div>
                      <div className="text-sm font-semibold text-red-600">
                        {formatAmount(account.totalSent)}
                      </div>
                      <div className="text-xs text-gray-500">
                        to {account.sentTo.length} recipient{account.sentTo.length !== 1 ? 's' : ''}
                      </div>
                    </div>

                    {/* Retained */}
                    <div className="text-right">
                      <div className="flex items-center gap-1 text-xs text-gray-500 mb-1">
                        <Wallet className="w-3 h-3" />
                        <span>Retained</span>
                      </div>
                      <div className={`text-sm font-semibold ${account.retained > 0 ? 'text-blue-600' : 'text-gray-600'}`}>
                        {formatAmount(account.retained)}
                      </div>
                      <div className="text-xs text-gray-500">
                        {account.retentionRate.toFixed(1)}% kept
                      </div>
                    </div>

                    {/* Action */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (onAccountClick) onAccountClick(account.accountId);
                      }}
                      className="p-2 hover:bg-gray-200 rounded"
                      title="View Details"
                    >
                      <Eye className="w-4 h-4 text-gray-600" />
                    </button>
                  </div>
                </div>

                {/* Expanded: Detailed Flow */}
                {isExpanded && hasOutgoing && (
                  <div className="bg-gray-50 px-4 py-3 border-t border-gray-200">
                    <div className="ml-10">
                      {/* Received From */}
                      {account.receivedFrom.length > 0 && (
                        <div className="mb-4">
                          <div className="text-xs font-semibold text-gray-700 mb-2">
                            ⬇️ Received From:
                          </div>
                          <div className="space-y-1">
                            {account.receivedFrom.map((source, idx) => (
                              <div key={idx} className="flex items-center gap-2 text-sm">
                                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                                <span className="font-mono text-gray-700">{source.accountNumber}</span>
                                <ArrowRight className="w-3 h-3 text-gray-400" />
                                <span className="font-semibold text-green-600">
                                  {formatAmount(source.amount)}
                                </span>
                              </div>
                            ))}
                          </div>
                          <div className="mt-2 pt-2 border-t border-gray-300 text-sm font-semibold">
                            <span className="text-gray-700">Total Received: </span>
                            <span className="text-green-600">{formatAmount(account.totalReceived)}</span>
                          </div>
                        </div>
                      )}

                      {/* Sent To (with cumulative) */}
                      {account.sentTo.length > 0 && (
                        <div>
                          <div className="text-xs font-semibold text-gray-700 mb-2">
                            ⬆️ Sent To (Cumulative Tracking):
                          </div>
                          <div className="space-y-1">
                            {account.sentTo.map((recipient, idx) => (
                              <div key={idx} className="flex items-center gap-2 text-sm">
                                <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                                <span className="font-mono text-gray-700">{recipient.accountNumber}</span>
                                <ArrowRight className="w-3 h-3 text-gray-400" />
                                <span className="font-semibold text-red-600">
                                  {formatAmount(recipient.amount)}
                                </span>
                                <span className="text-xs text-gray-500">
                                  (cumulative: {formatAmount(recipient.cumulativeAmount)})
                                </span>
                              </div>
                            ))}
                          </div>
                          <div className="mt-2 pt-2 border-t border-gray-300 text-sm font-semibold">
                            <span className="text-gray-700">Total Sent: </span>
                            <span className="text-red-600">{formatAmount(account.totalSent)}</span>
                          </div>
                        </div>
                      )}

                      {/* Retention Summary */}
                      <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
                        <div className="text-sm">
                          <span className="text-gray-700 font-medium">Money Retained: </span>
                          <span className="font-bold text-blue-700">
                            {formatAmount(account.retained)}
                          </span>
                          <span className="text-gray-600 ml-2">
                            ({account.retentionRate.toFixed(1)}% of received)
                          </span>
                        </div>
                        {account.retained > 0 && account.sentTo.length === 0 && (
                          <div className="mt-1 text-xs text-green-700 flex items-center gap-1">
                            <AlertCircle className="w-3 h-3" />
                            <span>💰 ENDPOINT: Money stopped here!</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Empty State */}
      {filteredFlows.length === 0 && (
        <div className="flex-1 flex items-center justify-center text-gray-500">
          <div className="text-center">
            <Filter className="w-12 h-12 mx-auto mb-2 text-gray-400" />
            <p>No accounts match your filters</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default SmartTablesView;
