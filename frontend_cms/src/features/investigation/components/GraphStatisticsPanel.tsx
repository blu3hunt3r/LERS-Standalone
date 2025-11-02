/**
 * ============================================================================
 * GRAPH STATISTICS PANEL - Real-time metrics dashboard
 * ============================================================================
 * TASK 3.1.2: Graph statistics with live updates
 */

import React from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { GraphStatistics } from '../types';
import { TrendingUp, Users, Link2, Wallet, Calendar, Network } from 'lucide-react';

interface GraphStatisticsPanelProps {
  statistics: GraphStatistics;
  className?: string;
}

export const GraphStatisticsPanel: React.FC<GraphStatisticsPanelProps> = ({
  statistics,
  className = '',
}) => {
  const formatCurrency = (amount: number): string => {
    if (amount >= 10000000) return `₹${(amount / 10000000).toFixed(2)}Cr`;
    if (amount >= 100000) return `₹${(amount / 100000).toFixed(2)}L`;
    if (amount >= 1000) return `₹${(amount / 1000).toFixed(2)}K`;
    return `₹${amount.toFixed(0)}`;
  };

  const formatDate = (date: Date | null): string => {
    if (!date) return 'N/A';
    return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  const stats = [
    {
      label: 'Entities',
      value: statistics.entityCount,
      icon: Users,
      color: 'text-blue-600',
      bg: 'bg-blue-50',
    },
    {
      label: 'Relationships',
      value: statistics.relationshipCount,
      icon: Link2,
      color: 'text-purple-600',
      bg: 'bg-purple-50',
    },
    {
      label: 'Total Money Flow',
      value: formatCurrency(statistics.totalMoney),
      icon: Wallet,
      color: 'text-green-600',
      bg: 'bg-green-50',
    },
    {
      label: 'Avg Path Length',
      value: `${statistics.avgPathLength} hops`,
      icon: TrendingUp,
      color: 'text-orange-600',
      bg: 'bg-orange-50',
    },
    {
      label: 'Graph Density',
      value: `${statistics.density}%`,
      icon: Network,
      color: 'text-indigo-600',
      bg: 'bg-indigo-50',
    },
    {
      label: 'Timeline',
      value: `${statistics.dateRange.days} days`,
      icon: Calendar,
      color: 'text-pink-600',
      bg: 'bg-pink-50',
    },
  ];

  return (
    <Card className={`p-4 bg-white/95 backdrop-blur ${className}`}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-gray-900">Graph Statistics</h3>
        <Badge variant="outline" className="text-xs">Live</Badge>
      </div>

      {/* Main Stats Grid */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        {stats.map((stat, i) => (
          <div key={i} className={`p-3 rounded-lg ${stat.bg}`}>
            <div className="flex items-center gap-2 mb-1">
              <stat.icon className={`h-4 w-4 ${stat.color}`} />
              <span className="text-xs text-gray-600">{stat.label}</span>
            </div>
            <div className="text-lg font-bold text-gray-900">{stat.value}</div>
          </div>
        ))}
      </div>

      {/* Detailed Stats */}
      <div className="space-y-2 pt-4 border-t border-gray-200">
        <div className="flex items-center justify-between text-xs">
          <span className="text-gray-600">Components:</span>
          <span className="font-medium text-gray-900">{statistics.components}</span>
        </div>
        <div className="flex items-center justify-between text-xs">
          <span className="text-gray-600">Largest Component:</span>
          <span className="font-medium text-gray-900">{statistics.largestComponent} entities</span>
        </div>
        <div className="flex items-center justify-between text-xs">
          <span className="text-gray-600">Isolated Entities:</span>
          <span className="font-medium text-gray-900">{statistics.isolatedEntities}</span>
        </div>
      </div>

      {/* Date Range */}
      {statistics.dateRange.start && statistics.dateRange.end && (
        <div className="mt-4 pt-4 border-t border-gray-200">
          <div className="text-xs text-gray-500">
            <div className="font-medium text-gray-700 mb-1">Investigation Period</div>
            <div className="flex items-center justify-between">
              <span>{formatDate(statistics.dateRange.start)}</span>
              <span className="text-gray-400">→</span>
              <span>{formatDate(statistics.dateRange.end)}</span>
            </div>
          </div>
        </div>
      )}
    </Card>
  );
};

