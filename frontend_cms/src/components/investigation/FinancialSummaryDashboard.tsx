/**
 * Financial Summary Dashboard Component
 *
 * Provides comprehensive financial statistics and visualizations for the investigation:
 * - Total money flow statistics
 * - Top suspects by outflow
 * - Top endpoints by inflow
 * - Layer distribution
 * - Risk level distribution
 */

import React, { useMemo } from 'react';
import { BarChart3, TrendingUp, TrendingDown, AlertTriangle, Layers } from 'lucide-react';

interface Node {
  id: string;
  label: string;
  type: string;
  risk_level?: string;
  metadata?: {
    layer?: number;
    [key: string]: any;
  };
}

interface Link {
  id: string;
  source: string;
  target: string;
  label?: string;
  metadata?: {
    amount?: string | number;
    [key: string]: any;
  };
}

interface FinancialSummaryDashboardProps {
  nodes: Node[];
  links: Link[];
}

export const FinancialSummaryDashboard: React.FC<FinancialSummaryDashboardProps> = ({
  nodes,
  links,
}) => {
  // Calculate statistics
  const statistics = useMemo(() => {
    // Calculate total flow
    let totalFlow = 0;
    const nodeOutflows = new Map<string, number>();
    const nodeInflows = new Map<string, number>();

    links.forEach(link => {
      const amount = parseFloat(String(link.metadata?.amount || 0));
      if (!isNaN(amount)) {
        totalFlow += amount;
        nodeOutflows.set(link.source, (nodeOutflows.get(link.source) || 0) + amount);
        nodeInflows.set(link.target, (nodeInflows.get(link.target) || 0) + amount);
      }
    });

    // Get top suspects (by outflow)
    const suspects = Array.from(nodeOutflows.entries())
      .map(([id, amount]) => {
        const node = nodes.find(n => n.id === id);
        return { id, label: node?.label || id, amount };
      })
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 10);

    // Get top endpoints (by inflow, no outflow)
    const endpoints = Array.from(nodeInflows.entries())
      .filter(([id]) => !nodeOutflows.has(id))
      .map(([id, amount]) => {
        const node = nodes.find(n => n.id === id);
        return { id, label: node?.label || id, amount };
      })
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 10);

    // Layer distribution
    const layerDistribution = new Map<number, number>();
    nodes.forEach(node => {
      const layer = node.metadata?.layer ?? -1;
      layerDistribution.set(layer, (layerDistribution.get(layer) || 0) + 1);
    });

    // Risk level distribution
    const riskDistribution = new Map<string, number>();
    nodes.forEach(node => {
      const risk = node.risk_level || 'unknown';
      riskDistribution.set(risk, (riskDistribution.get(risk) || 0) + 1);
    });

    return {
      totalFlow,
      totalTransactions: links.length,
      totalEntities: nodes.length,
      suspects,
      endpoints,
      layerDistribution,
      riskDistribution,
      averageTransactionAmount: totalFlow / links.length || 0,
    };
  }, [nodes, links]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('en-US').format(num);
  };

  return (
    <div className="p-6 space-y-6 bg-gray-50 h-full overflow-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Financial Summary Dashboard</h2>
          <p className="text-sm text-gray-600 mt-1">Comprehensive analysis of money flow patterns</p>
        </div>
        <BarChart3 className="h-8 w-8 text-blue-600" />
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow p-6 border-l-4 border-blue-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Money Flow</p>
              <p className="text-2xl font-bold text-gray-900 mt-2">
                {formatCurrency(statistics.totalFlow)}
              </p>
            </div>
            <TrendingUp className="h-8 w-8 text-blue-500" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6 border-l-4 border-green-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Transactions</p>
              <p className="text-2xl font-bold text-gray-900 mt-2">
                {formatNumber(statistics.totalTransactions)}
              </p>
            </div>
            <BarChart3 className="h-8 w-8 text-green-500" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6 border-l-4 border-purple-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Entities</p>
              <p className="text-2xl font-bold text-gray-900 mt-2">
                {formatNumber(statistics.totalEntities)}
              </p>
            </div>
            <Layers className="h-8 w-8 text-purple-500" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6 border-l-4 border-orange-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Avg Transaction</p>
              <p className="text-2xl font-bold text-gray-900 mt-2">
                {formatCurrency(statistics.averageTransactionAmount)}
              </p>
            </div>
            <TrendingDown className="h-8 w-8 text-orange-500" />
          </div>
        </div>
      </div>

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Suspects */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-red-500" />
            Top Suspects (by Outflow)
          </h3>
          <div className="space-y-3">
            {statistics.suspects.map((suspect, index) => (
              <div key={suspect.id} className="flex items-center justify-between p-3 bg-gray-50 rounded border border-gray-200">
                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center w-8 h-8 rounded-full bg-red-100 text-red-700 font-bold text-sm">
                    {index + 1}
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">{suspect.label}</p>
                    <p className="text-xs text-gray-500">{suspect.id}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-bold text-red-600">{formatCurrency(suspect.amount)}</p>
                  <p className="text-xs text-gray-500">
                    {((suspect.amount / statistics.totalFlow) * 100).toFixed(1)}%
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Top Endpoints */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <TrendingDown className="h-5 w-5 text-green-500" />
            Top Endpoints (by Inflow)
          </h3>
          <div className="space-y-3">
            {statistics.endpoints.map((endpoint, index) => (
              <div key={endpoint.id} className="flex items-center justify-between p-3 bg-gray-50 rounded border border-gray-200">
                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center w-8 h-8 rounded-full bg-green-100 text-green-700 font-bold text-sm">
                    {index + 1}
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">{endpoint.label}</p>
                    <p className="text-xs text-gray-500">{endpoint.id}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-bold text-green-600">{formatCurrency(endpoint.amount)}</p>
                  <p className="text-xs text-gray-500">
                    {((endpoint.amount / statistics.totalFlow) * 100).toFixed(1)}%
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Layer & Risk Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Layer Distribution */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Layers className="h-5 w-5 text-blue-500" />
            Layer Distribution
          </h3>
          <div className="space-y-2">
            {Array.from(statistics.layerDistribution.entries())
              .sort((a, b) => a[0] - b[0])
              .map(([layer, count]) => {
                const percentage = (count / statistics.totalEntities) * 100;
                return (
                  <div key={layer} className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium text-gray-700">
                        Layer {layer === -1 ? 'Unknown' : layer}
                      </span>
                      <span className="text-gray-600">{count} entities ({percentage.toFixed(1)}%)</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-blue-500 h-2 rounded-full transition-all"
                        style={{ width: `${percentage}%` }}
                      ></div>
                    </div>
                  </div>
                );
              })}
          </div>
        </div>

        {/* Risk Distribution */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-orange-500" />
            Risk Level Distribution
          </h3>
          <div className="space-y-2">
            {Array.from(statistics.riskDistribution.entries())
              .sort((a, b) => {
                const order = ['critical', 'high', 'medium', 'low', 'unknown'];
                return order.indexOf(a[0]) - order.indexOf(b[0]);
              })
              .map(([risk, count]) => {
                const percentage = (count / statistics.totalEntities) * 100;
                const colors = {
                  critical: 'bg-red-500',
                  high: 'bg-orange-500',
                  medium: 'bg-yellow-500',
                  low: 'bg-green-500',
                  unknown: 'bg-gray-400',
                };
                return (
                  <div key={risk} className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium text-gray-700 capitalize">{risk}</span>
                      <span className="text-gray-600">{count} entities ({percentage.toFixed(1)}%)</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className={`${colors[risk as keyof typeof colors]} h-2 rounded-full transition-all`}
                        style={{ width: `${percentage}%` }}
                      ></div>
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default FinancialSummaryDashboard;
