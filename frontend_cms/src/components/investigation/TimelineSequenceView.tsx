/**
 * Timeline Sequence View - Chronological Money Flow
 *
 * Shows transactions in time order with running balance tracking
 * Visual: Timeline with exact amounts and cumulative totals
 */

import React, { useState, useMemo } from 'react';
import {
  Clock,
  ArrowRight,
  Calendar,
  TrendingUp,
  Filter,
  Play,
  Pause,
  SkipForward,
  ChevronDown,
  ChevronUp
} from 'lucide-react';

interface TimelineTransaction {
  id: string;
  timestamp: Date;
  dateStr: string;
  timeStr: string;

  fromAccountId: string;
  fromAccountNumber: string;
  fromBank: string;

  toAccountId: string;
  toAccountNumber: string;
  toBank: string;

  amount: number;

  // Running totals
  cumulativeAmount: number;

  // Layer info
  fromLayer: number;
  toLayer: number;

  // Timing
  timeSincePrevious?: number; // minutes
}

interface TimelineSequenceViewProps {
  nodes: any[];
  links: any[];
  onAccountClick?: (accountId: string) => void;
}

export const TimelineSequenceView: React.FC<TimelineSequenceViewProps> = ({
  nodes,
  links,
  onAccountClick
}) => {
  const [filterDate, setFilterDate] = useState<string>('');
  const [groupByDay, setGroupByDay] = useState(true);
  const [showOnlyLarge, setShowOnlyLarge] = useState(false);
  const [expandedDays, setExpandedDays] = useState<Set<string>>(new Set());

  // Parse and sort transactions chronologically
  const timelineTransactions = useMemo(() => {
    console.log('⏱️ Building timeline sequence with running totals...');

    const transactions: TimelineTransaction[] = [];
    const nodeMap = new Map(nodes.map(n => [n.id, n]));

    links.forEach(link => {
      const fromNode = nodeMap.get(link.source);
      const toNode = nodeMap.get(link.target);

      if (fromNode && toNode) {
        const amount = parseFloat(link.metadata?.amount || link.metadata?.transaction_amount || '0');
        const dateStr = link.metadata?.transaction_date || link.metadata?.date || '';

        // Parse date (format: DD/MM/YYYY HH:mm:ss AM/PM)
        let timestamp = new Date();
        try {
          const parts = dateStr.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})\s+(\d{1,2}):(\d{2}):(\d{2})\s+(AM|PM)/);
          if (parts) {
            const [, day, month, year, hour, minute, second, ampm] = parts;
            let hour24 = parseInt(hour);
            if (ampm === 'PM' && hour24 !== 12) hour24 += 12;
            if (ampm === 'AM' && hour24 === 12) hour24 = 0;
            timestamp = new Date(parseInt(year), parseInt(month) - 1, parseInt(day), hour24, parseInt(minute), parseInt(second));
          }
        } catch (e) {
          console.warn('Failed to parse date:', dateStr);
        }

        transactions.push({
          id: link.id,
          timestamp,
          dateStr,
          timeStr: timestamp.toLocaleTimeString('en-IN'),

          fromAccountId: link.source,
          fromAccountNumber: fromNode.metadata?.account_number || link.source,
          fromBank: fromNode.metadata?.bank_name || 'Unknown',

          toAccountId: link.target,
          toAccountNumber: toNode.metadata?.account_number || link.target,
          toBank: toNode.metadata?.bank_name || 'Unknown',

          amount,
          cumulativeAmount: 0, // Will calculate below

          fromLayer: fromNode.metadata?.layer || 0,
          toLayer: toNode.metadata?.layer || 0,
        });
      }
    });

    // Sort by timestamp
    transactions.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

    // Calculate cumulative amounts and time gaps
    let cumulative = 0;
    let previousTimestamp: Date | null = null;

    transactions.forEach(txn => {
      cumulative += txn.amount;
      txn.cumulativeAmount = cumulative;

      if (previousTimestamp) {
        const diffMs = txn.timestamp.getTime() - previousTimestamp.getTime();
        txn.timeSincePrevious = Math.round(diffMs / 60000); // minutes
      }

      previousTimestamp = txn.timestamp;
    });

    console.log('✅ Timeline built:', transactions.length, 'transactions');
    return transactions;
  }, [nodes, links]);

  // Group by day
  const groupedByDay = useMemo(() => {
    const groups = new Map<string, TimelineTransaction[]>();

    timelineTransactions.forEach(txn => {
      const dayKey = txn.timestamp.toLocaleDateString('en-IN');
      if (!groups.has(dayKey)) {
        groups.set(dayKey, []);
      }
      groups.get(dayKey)!.push(txn);
    });

    return Array.from(groups.entries()).map(([date, txns]) => ({
      date,
      transactions: txns,
      totalAmount: txns.reduce((sum, t) => sum + t.amount, 0),
      count: txns.length
    }));
  }, [timelineTransactions]);

  // Filter
  const filteredTransactions = useMemo(() => {
    let filtered = timelineTransactions;

    if (filterDate) {
      filtered = filtered.filter(t =>
        t.dateStr.includes(filterDate)
      );
    }

    if (showOnlyLarge) {
      const threshold = 100000; // ₹1L+
      filtered = filtered.filter(t => t.amount >= threshold);
    }

    return filtered;
  }, [timelineTransactions, filterDate, showOnlyLarge]);

  // Format amount
  const formatAmount = (amount: number): string => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(amount);
  };

  // Toggle day expansion
  const toggleDay = (date: string) => {
    setExpandedDays(prev => {
      const next = new Set(prev);
      if (next.has(date)) {
        next.delete(date);
      } else {
        next.add(date);
      }
      return next;
    });
  };

  return (
    <div className="h-full flex flex-col bg-white">
      {/* Header */}
      <div className="border-b border-gray-200 p-4">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <Clock className="w-5 h-5 text-purple-600" />
              Timeline Sequence - Chronological Money Flow
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              See transactions in time order with running cumulative totals
            </p>
          </div>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-4">
          <div className="flex-1 relative">
            <Calendar className="w-4 h-4 absolute left-3 top-2.5 text-gray-400" />
            <input
              type="text"
              placeholder="Filter by date (DD/MM/YYYY)..."
              value={filterDate}
              onChange={(e) => setFilterDate(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            />
          </div>

          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={groupByDay}
              onChange={(e) => setGroupByDay(e.target.checked)}
              className="rounded border-gray-300"
            />
            <span>Group by day</span>
          </label>

          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={showOnlyLarge}
              onChange={(e) => setShowOnlyLarge(e.target.checked)}
              className="rounded border-gray-300"
            />
            <span>Only ₹1L+ transactions</span>
          </label>
        </div>

        {/* Stats */}
        <div className="flex items-center gap-6 mt-4 text-sm">
          <div className="text-gray-700">
            {filteredTransactions.length} Transactions
          </div>
          <div className="text-gray-500">•</div>
          <div className="text-gray-700">
            Final Total: <span className="font-semibold text-purple-600">
              {formatAmount(filteredTransactions[filteredTransactions.length - 1]?.cumulativeAmount || 0)}
            </span>
          </div>
        </div>
      </div>

      {/* Timeline Content */}
      <div className="flex-1 overflow-auto">
        {groupByDay ? (
          // Grouped by day view
          <div className="divide-y divide-gray-200">
            {groupedByDay.map(group => {
              const isExpanded = expandedDays.has(group.date);
              return (
                <div key={group.date}>
                  {/* Day Header */}
                  <div
                    className="bg-gray-50 p-4 flex items-center justify-between cursor-pointer hover:bg-gray-100"
                    onClick={() => toggleDay(group.date)}
                  >
                    <div className="flex items-center gap-3">
                      {isExpanded ? (
                        <ChevronDown className="w-5 h-5 text-gray-600" />
                      ) : (
                        <ChevronUp className="w-5 h-5 text-gray-600" />
                      )}
                      <Calendar className="w-5 h-5 text-purple-600" />
                      <span className="font-semibold text-gray-900">{group.date}</span>
                    </div>
                    <div className="flex items-center gap-4 text-sm">
                      <span className="text-gray-600">{group.count} transactions</span>
                      <span className="font-semibold text-purple-600">
                        {formatAmount(group.totalAmount)}
                      </span>
                    </div>
                  </div>

                  {/* Transactions */}
                  {isExpanded && (
                    <div className="bg-white">
                      {group.transactions.map((txn, idx) => (
                        <TransactionRow
                          key={txn.id}
                          transaction={txn}
                          isFirst={idx === 0}
                          formatAmount={formatAmount}
                          onAccountClick={onAccountClick}
                        />
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          // Continuous timeline view
          <div>
            {filteredTransactions.map((txn, idx) => (
              <TransactionRow
                key={txn.id}
                transaction={txn}
                isFirst={idx === 0}
                formatAmount={formatAmount}
                onAccountClick={onAccountClick}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

// Transaction Row Component
const TransactionRow: React.FC<{
  transaction: TimelineTransaction;
  isFirst: boolean;
  formatAmount: (amount: number) => string;
  onAccountClick?: (accountId: string) => void;
}> = ({ transaction: txn, isFirst, formatAmount, onAccountClick }) => {
  return (
    <div className="border-b border-gray-100 p-4 hover:bg-gray-50 relative">
      {/* Timeline marker */}
      <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-purple-500 to-blue-500"></div>

      <div className="flex items-start gap-4 ml-4">
        {/* Time */}
        <div className="w-32 flex-shrink-0">
          <div className="text-sm font-medium text-gray-900">{txn.timeStr}</div>
          <div className="text-xs text-gray-500">{txn.dateStr.split(' ')[0]}</div>
          {!isFirst && txn.timeSincePrevious !== undefined && (
            <div className="text-xs text-purple-600 mt-1">
              +{txn.timeSincePrevious}m
            </div>
          )}
        </div>

        {/* Flow */}
        <div className="flex-1 flex items-center gap-3">
          {/* From Account */}
          <button
            onClick={() => onAccountClick && onAccountClick(txn.fromAccountId)}
            className="flex-1 text-left p-3 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100"
          >
            <div className="text-xs text-red-700 mb-1">From (Layer {txn.fromLayer})</div>
            <div className="font-mono text-sm font-medium text-gray-900">{txn.fromAccountNumber}</div>
            <div className="text-xs text-gray-600 truncate">{txn.fromBank}</div>
          </button>

          {/* Arrow with amount */}
          <div className="flex flex-col items-center gap-1">
            <ArrowRight className="w-6 h-6 text-purple-600" />
            <div className="text-sm font-bold text-purple-600 whitespace-nowrap">
              {formatAmount(txn.amount)}
            </div>
          </div>

          {/* To Account */}
          <button
            onClick={() => onAccountClick && onAccountClick(txn.toAccountId)}
            className="flex-1 text-left p-3 bg-green-50 border border-green-200 rounded-lg hover:bg-green-100"
          >
            <div className="text-xs text-green-700 mb-1">To (Layer {txn.toLayer})</div>
            <div className="font-mono text-sm font-medium text-gray-900">{txn.toAccountNumber}</div>
            <div className="text-xs text-gray-600 truncate">{txn.toBank}</div>
          </button>
        </div>

        {/* Running Total */}
        <div className="w-40 flex-shrink-0 text-right">
          <div className="text-xs text-gray-500 mb-1">Cumulative Total</div>
          <div className="text-lg font-bold text-purple-700">
            {formatAmount(txn.cumulativeAmount)}
          </div>
          <div className="text-xs text-gray-500 mt-1">
            <TrendingUp className="w-3 h-3 inline mr-1" />
            Running sum
          </div>
        </div>
      </div>
    </div>
  );
};

export default TimelineSequenceView;
