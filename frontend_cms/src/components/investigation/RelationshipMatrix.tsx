/**
 * Relationship Matrix Component
 *
 * Visualizes entity relationships as a heat map showing:
 * - Direct connections between entities
 * - Connection strength (transaction count/amount)
 * - Degrees of separation
 * - Bidirectional vs unidirectional flows
 */

import React, { useMemo, useState } from 'react';
import { Network, ArrowRight, ArrowLeftRight } from 'lucide-react';

interface Node {
  id: string;
  label: string;
  type: string;
}

interface Link {
  id: string;
  source: string;
  target: string;
  metadata?: {
    amount?: string | number;
    [key: string]: any;
  };
}

interface RelationshipMatrixProps {
  nodes: Node[];
  links: Link[];
}

export const RelationshipMatrix: React.FC<RelationshipMatrixProps> = ({ nodes, links }) => {
  const [sortBy, setSortBy] = useState<'label' | 'connections'>('connections');
  const [showTop, setShowTop] = useState(20);

  const matrixData = useMemo(() => {
    // Build adjacency matrix
    const matrix = new Map<string, Map<string, { count: number; amount: number; bidirectional: boolean }>>();
    const connectionCounts = new Map<string, number>();

    // Initialize matrix
    nodes.forEach(node => {
      matrix.set(node.id, new Map());
      connectionCounts.set(node.id, 0);
    });

    // Populate matrix
    links.forEach(link => {
      const sourceMap = matrix.get(link.source);
      const targetMap = matrix.get(link.target);

      if (sourceMap) {
        const existing = sourceMap.get(link.target) || { count: 0, amount: 0, bidirectional: false };
        const amount = parseFloat(String(link.metadata?.amount || 0));
        sourceMap.set(link.target, {
          count: existing.count + 1,
          amount: existing.amount + (isNaN(amount) ? 0 : amount),
          bidirectional: existing.bidirectional,
        });

        connectionCounts.set(link.source, (connectionCounts.get(link.source) || 0) + 1);
      }

      // Check for reverse connection (bidirectional)
      if (targetMap?.has(link.source)) {
        const forward = sourceMap?.get(link.target);
        const reverse = targetMap.get(link.source);
        if (forward && reverse) {
          forward.bidirectional = true;
          reverse.bidirectional = true;
        }
      }
    });

    // Get top connected nodes
    const sortedNodes = [...nodes]
      .sort((a, b) => {
        if (sortBy === 'connections') {
          return (connectionCounts.get(b.id) || 0) - (connectionCounts.get(a.id) || 0);
        }
        return a.label.localeCompare(b.label);
      })
      .slice(0, showTop);

    // Calculate max connection value for heat map
    let maxConnections = 0;
    let maxAmount = 0;
    matrix.forEach(row => {
      row.forEach(cell => {
        maxConnections = Math.max(maxConnections, cell.count);
        maxAmount = Math.max(maxAmount, cell.amount);
      });
    });

    return {
      matrix,
      sortedNodes,
      connectionCounts,
      maxConnections,
      maxAmount,
    };
  }, [nodes, links, sortBy, showTop]);

  const getHeatColor = (count: number, max: number) => {
    if (count === 0) return 'bg-gray-100';
    const intensity = Math.min(count / max, 1);
    if (intensity > 0.7) return 'bg-red-500';
    if (intensity > 0.4) return 'bg-orange-400';
    if (intensity > 0.2) return 'bg-yellow-300';
    return 'bg-blue-200';
  };

  const formatCurrency = (amount: number) => {
    if (amount === 0) return '';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
      notation: 'compact',
    }).format(amount);
  };

  return (
    <div className="p-6 space-y-6 bg-gray-50 h-full overflow-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Relationship Matrix</h2>
          <p className="text-sm text-gray-600 mt-1">Heat map of entity connections and transaction flows</p>
        </div>
        <Network className="h-8 w-8 text-indigo-600" />
      </div>

      {/* Controls */}
      <div className="bg-white rounded-lg shadow p-4 flex items-center gap-4 flex-wrap">
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium text-gray-700">Sort by:</label>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as 'label' | 'connections')}
            className="px-3 py-1.5 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="connections">Most Connections</option>
            <option value="label">Alphabetical</option>
          </select>
        </div>

        <div className="flex items-center gap-2">
          <label className="text-sm font-medium text-gray-700">Show top:</label>
          <select
            value={showTop}
            onChange={(e) => setShowTop(parseInt(e.target.value))}
            className="px-3 py-1.5 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value={10}>10 entities</option>
            <option value={20}>20 entities</option>
            <option value={30}>30 entities</option>
            <option value={50}>50 entities</option>
          </select>
        </div>

        <div className="flex items-center gap-3 ml-auto text-xs">
          <div className="flex items-center gap-1">
            <ArrowRight className="h-4 w-4 text-gray-600" />
            <span className="text-gray-600">One-way</span>
          </div>
          <div className="flex items-center gap-1">
            <ArrowLeftRight className="h-4 w-4 text-purple-600" />
            <span className="text-gray-600">Bidirectional</span>
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="bg-white rounded-lg shadow p-4">
        <h3 className="text-sm font-semibold text-gray-900 mb-3">Heat Map Legend</h3>
        <div className="flex items-center gap-2 text-xs">
          <span className="text-gray-600">Low</span>
          <div className="flex gap-1">
            <div className="w-8 h-6 bg-blue-200 rounded border border-gray-300"></div>
            <div className="w-8 h-6 bg-yellow-300 rounded border border-gray-300"></div>
            <div className="w-8 h-6 bg-orange-400 rounded border border-gray-300"></div>
            <div className="w-8 h-6 bg-red-500 rounded border border-gray-300"></div>
          </div>
          <span className="text-gray-600">High</span>
          <span className="text-gray-400 ml-4">Hover over cells to see details</span>
        </div>
      </div>

      {/* Matrix */}
      <div className="bg-white rounded-lg shadow p-6 overflow-auto">
        <div className="inline-block min-w-full">
          <table className="border-collapse">
            <thead>
              <tr>
                <th className="sticky left-0 top-0 z-20 bg-gray-100 border border-gray-300 p-2 text-xs font-semibold text-gray-700 min-w-[150px]">
                  From → To
                </th>
                {matrixData.sortedNodes.map(node => (
                  <th
                    key={node.id}
                    className="sticky top-0 z-10 bg-gray-100 border border-gray-300 p-2 text-xs font-semibold text-gray-700 min-w-[80px]"
                  >
                    <div className="transform -rotate-45 origin-left whitespace-nowrap overflow-hidden text-ellipsis max-w-[100px]">
                      {node.label}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {matrixData.sortedNodes.map(sourceNode => (
                <tr key={sourceNode.id}>
                  <td className="sticky left-0 z-10 bg-gray-50 border border-gray-300 p-2 text-xs font-medium text-gray-900 max-w-[150px]">
                    <div className="truncate" title={sourceNode.label}>
                      {sourceNode.label}
                    </div>
                    <div className="text-gray-500 text-[10px]">
                      {matrixData.connectionCounts.get(sourceNode.id) || 0} connections
                    </div>
                  </td>
                  {matrixData.sortedNodes.map(targetNode => {
                    const cell = matrixData.matrix.get(sourceNode.id)?.get(targetNode.id);
                    const count = cell?.count || 0;
                    const amount = cell?.amount || 0;
                    const isSelf = sourceNode.id === targetNode.id;

                    return (
                      <td
                        key={targetNode.id}
                        className={`border border-gray-300 p-0 text-center relative group ${
                          isSelf ? 'bg-gray-200' : getHeatColor(count, matrixData.maxConnections)
                        }`}
                        title={
                          isSelf
                            ? 'Same entity'
                            : count > 0
                            ? `${count} transaction${count > 1 ? 's' : ''}\n${formatCurrency(amount)}\n${
                                cell?.bidirectional ? 'Bidirectional' : 'One-way'
                              }`
                            : 'No connection'
                        }
                      >
                        <div className="h-16 w-full flex items-center justify-center">
                          {!isSelf && count > 0 && (
                            <div className="text-xs font-bold text-gray-900">
                              {count}
                              {cell?.bidirectional && (
                                <ArrowLeftRight className="h-3 w-3 inline ml-1 text-purple-600" />
                              )}
                            </div>
                          )}
                        </div>
                        {!isSelf && count > 0 && (
                          <div className="hidden group-hover:block absolute top-full left-1/2 -translate-x-1/2 mt-1 bg-gray-900 text-white text-xs rounded px-2 py-1 whitespace-nowrap z-30 shadow-lg">
                            <div className="font-bold">{count} transactions</div>
                            <div>{formatCurrency(amount)}</div>
                            <div className="text-gray-300">
                              {cell?.bidirectional ? '↔ Bidirectional' : '→ One-way'}
                            </div>
                          </div>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-lg shadow p-4">
          <h3 className="text-sm font-semibold text-gray-900 mb-2">Total Connections</h3>
          <p className="text-2xl font-bold text-blue-600">{links.length}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <h3 className="text-sm font-semibold text-gray-900 mb-2">Bidirectional Flows</h3>
          <p className="text-2xl font-bold text-purple-600">
            {Array.from(matrixData.matrix.values()).reduce((count, row) => {
              return count + Array.from(row.values()).filter(cell => cell.bidirectional).length;
            }, 0)}
          </p>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <h3 className="text-sm font-semibold text-gray-900 mb-2">Most Connected</h3>
          <p className="text-lg font-bold text-green-600 truncate">
            {matrixData.sortedNodes[0]?.label || 'N/A'}
          </p>
          <p className="text-xs text-gray-500">
            {matrixData.connectionCounts.get(matrixData.sortedNodes[0]?.id) || 0} connections
          </p>
        </div>
      </div>
    </div>
  );
};

export default RelationshipMatrix;
