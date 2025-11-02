/**
 * Hierarchical Tree Explorer for Financial Investigation
 *
 * Replaces node-link graph with a clean, expandable tree structure
 * showing money flow from suspects through mules to endpoints.
 *
 * NO CRISS-CROSSING LINES - Just clear parent-child relationships!
 */

import React, { useState, useMemo, useCallback } from 'react';
import { ChevronRight, ChevronDown, AlertCircle, TrendingUp, Users, DollarSign, Clock, MapPin, Eye, FileText, Flag } from 'lucide-react';

interface Transaction {
  id: string;
  from: string;
  to: string;
  amount: number;
  date: string;
  time: string;
  layer: number;
}

interface AccountNode {
  id: string;
  accountNumber: string;
  bankName: string;
  ifsc: string;
  layer: number;
  classification: 'SUSPECT' | 'MULE' | 'SPLITTER' | 'ENDPOINT' | 'INTERMEDIATE';
  riskScore: number;
  totalIn: number;
  totalOut: number;
  forwardTime?: number; // minutes
  children: AccountNode[];
  transactions: Transaction[];
  isExpanded: boolean;
}

interface HierarchicalTreeExplorerProps {
  nodes: any[];
  links: any[];
  onAccountClick?: (accountId: string) => void;
}

export const HierarchicalTreeExplorer: React.FC<HierarchicalTreeExplorerProps> = ({
  nodes,
  links,
  onAccountClick
}) => {
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState({
    minAmount: 0,
    classifications: ['SUSPECT', 'MULE', 'SPLITTER', 'ENDPOINT'] as string[],
    riskLevels: ['CRITICAL', 'HIGH'] as string[]
  });

  // Build hierarchical tree structure from flat graph data
  const treeData = useMemo(() => {
    console.log('🌳 Building hierarchical tree from', nodes.length, 'nodes and', links.length, 'links');

    // Create account lookup
    const accountMap = new Map<string, AccountNode>();

    nodes.forEach(node => {
      accountMap.set(node.id, {
        id: node.id,
        accountNumber: node.metadata?.account_number || node.id,
        bankName: node.metadata?.bank_name || 'Unknown Bank',
        ifsc: node.metadata?.ifsc_code || '',
        layer: node.metadata?.layer || 0,
        classification: node.metadata?.classification || 'INTERMEDIATE',
        riskScore: node.metadata?.risk_score || 50,
        totalIn: 0,
        totalOut: 0,
        children: [],
        transactions: [],
        isExpanded: false
      });
    });

    // Calculate totals and build parent-child relationships
    const childrenMap = new Map<string, Set<string>>();

    links.forEach(link => {
      const fromNode = accountMap.get(link.source);
      const toNode = accountMap.get(link.target);

      if (fromNode && toNode) {
        const amount = parseFloat(link.metadata?.amount || link.metadata?.transaction_amount || '0');
        fromNode.totalOut += amount;
        toNode.totalIn += amount;

        // Track parent-child relationship
        if (!childrenMap.has(link.source)) {
          childrenMap.set(link.source, new Set());
        }
        childrenMap.get(link.source)!.add(link.target);

        // Store transaction
        const transaction: Transaction = {
          id: link.id,
          from: link.source,
          to: link.target,
          amount,
          date: link.metadata?.transaction_date || link.metadata?.date || '',
          time: '',
          layer: toNode.layer
        };
        fromNode.transactions.push(transaction);
      }
    });

    // Build tree from suspects (layer 0 or accounts with no incoming)
    const rootNodes: AccountNode[] = [];

    accountMap.forEach((account, accountId) => {
      if (account.layer === 0 || account.totalIn === 0) {
        rootNodes.push(account);
      }
    });

    // Recursively build children
    const buildChildren = (parentId: string, visited: Set<string> = new Set()): AccountNode[] => {
      if (visited.has(parentId)) return []; // Prevent circular references
      visited.add(parentId);

      const childIds = childrenMap.get(parentId);
      if (!childIds || childIds.size === 0) return [];

      const children: AccountNode[] = [];
      childIds.forEach(childId => {
        const childNode = accountMap.get(childId);
        if (childNode) {
          const childCopy = { ...childNode };
          childCopy.children = buildChildren(childId, new Set(visited));
          children.push(childCopy);
        }
      });

      return children.sort((a, b) => b.totalOut - a.totalOut); // Sort by amount (largest first)
    };

    rootNodes.forEach(root => {
      root.children = buildChildren(root.id);
    });

    console.log('✅ Tree built:', rootNodes.length, 'root nodes (suspects)');
    return rootNodes.sort((a, b) => b.totalOut - a.totalOut);
  }, [nodes, links]);

  // Toggle node expansion
  const toggleNode = useCallback((nodeId: string) => {
    setExpandedNodes(prev => {
      const next = new Set(prev);
      if (next.has(nodeId)) {
        next.delete(nodeId);
      } else {
        next.add(nodeId);
      }
      return next;
    });
  }, []);

  // Expand all nodes
  const expandAll = useCallback(() => {
    const allIds = new Set<string>();
    const collectIds = (node: AccountNode) => {
      allIds.add(node.id);
      node.children.forEach(collectIds);
    };
    treeData.forEach(collectIds);
    setExpandedNodes(allIds);
  }, [treeData]);

  // Collapse all nodes
  const collapseAll = useCallback(() => {
    setExpandedNodes(new Set());
  }, []);

  // Get classification icon and color
  const getClassificationStyle = (classification: string) => {
    switch (classification) {
      case 'SUSPECT':
        return { icon: AlertCircle, color: 'text-red-600', bgColor: 'bg-red-50', label: 'Suspect' };
      case 'MULE':
        return { icon: TrendingUp, color: 'text-orange-600', bgColor: 'bg-orange-50', label: 'Mule' };
      case 'SPLITTER':
        return { icon: Users, color: 'text-yellow-600', bgColor: 'bg-yellow-50', label: 'Splitter' };
      case 'ENDPOINT':
        return { icon: MapPin, color: 'text-green-600', bgColor: 'bg-green-50', label: 'Endpoint' };
      default:
        return { icon: DollarSign, color: 'text-blue-600', bgColor: 'bg-blue-50', label: 'Intermediate' };
    }
  };

  // Format amount in Indian numbering
  const formatAmount = (amount: number): string => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(amount);
  };

  // Render tree node recursively
  const renderTreeNode = (node: AccountNode, depth: number = 0): React.ReactNode => {
    const isExpanded = expandedNodes.has(node.id);
    const hasChildren = node.children.length > 0;
    const style = getClassificationStyle(node.classification);
    const Icon = style.icon;

    return (
      <div key={node.id} className="select-none">
        {/* Node Header */}
        <div
          className={`flex items-center gap-2 py-2 px-3 hover:bg-gray-50 rounded-lg cursor-pointer transition-colors ${
            depth === 0 ? 'bg-gray-50 border-l-4 border-red-500' : ''
          }`}
          style={{ marginLeft: `${depth * 24}px` }}
          onClick={() => {
            if (hasChildren) toggleNode(node.id);
            if (onAccountClick) onAccountClick(node.id);
          }}
        >
          {/* Expand/Collapse Icon */}
          <div className="w-4 h-4 flex items-center justify-center">
            {hasChildren && (
              isExpanded ? (
                <ChevronDown className="w-4 h-4 text-gray-600" />
              ) : (
                <ChevronRight className="w-4 h-4 text-gray-600" />
              )
            )}
          </div>

          {/* Classification Icon */}
          <div className={`${style.bgColor} p-1.5 rounded`}>
            <Icon className={`w-4 h-4 ${style.color}`} />
          </div>

          {/* Account Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-mono text-sm font-medium text-gray-900">
                {node.accountNumber}
              </span>
              <span className={`text-xs px-2 py-0.5 rounded-full ${style.bgColor} ${style.color} font-medium`}>
                {style.label}
              </span>
              {node.layer !== undefined && (
                <span className="text-xs text-gray-500">
                  Layer {node.layer}
                </span>
              )}
            </div>
            <div className="text-xs text-gray-600 truncate">
              {node.bankName} {node.ifsc && `(${node.ifsc})`}
            </div>
          </div>

          {/* Flow Summary */}
          <div className="flex items-center gap-4 text-xs">
            {node.totalOut > 0 && (
              <div className="text-right">
                <div className="text-gray-500">Sent</div>
                <div className="font-semibold text-red-600">{formatAmount(node.totalOut)}</div>
              </div>
            )}
            {node.totalIn > 0 && (
              <div className="text-right">
                <div className="text-gray-500">Received</div>
                <div className="font-semibold text-green-600">{formatAmount(node.totalIn)}</div>
              </div>
            )}
            {node.children.length > 0 && (
              <div className="text-gray-500">
                → {node.children.length} recipient{node.children.length > 1 ? 's' : ''}
              </div>
            )}
          </div>

          {/* Action Icons */}
          <div className="flex items-center gap-1">
            <button
              onClick={(e) => {
                e.stopPropagation();
                // View details
              }}
              className="p-1 hover:bg-gray-200 rounded"
              title="View Details"
            >
              <Eye className="w-4 h-4 text-gray-600" />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                // Flag account
              }}
              className="p-1 hover:bg-gray-200 rounded"
              title="Flag Account"
            >
              <Flag className="w-4 h-4 text-gray-600" />
            </button>
          </div>
        </div>

        {/* Child Nodes */}
        {isExpanded && hasChildren && (
          <div className="border-l-2 border-gray-200 ml-6">
            {node.children.map(child => renderTreeNode(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="h-full flex flex-col bg-white">
      {/* Header */}
      <div className="border-b border-gray-200 p-4">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">
              Hierarchical Money Trail Explorer
            </h2>
            <p className="text-sm text-gray-600">
              Follow the money from suspects to endpoints • No criss-crossing!
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={expandAll}
              className="px-3 py-1.5 text-sm bg-blue-50 text-blue-700 rounded hover:bg-blue-100"
            >
              Expand All
            </button>
            <button
              onClick={collapseAll}
              className="px-3 py-1.5 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
            >
              Collapse All
            </button>
          </div>
        </div>

        {/* Search & Stats */}
        <div className="flex items-center gap-4">
          <div className="flex-1">
            <input
              type="text"
              placeholder="Search account number, amount, or bank..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div className="flex items-center gap-4 text-sm">
            <div className="flex items-center gap-1">
              <AlertCircle className="w-4 h-4 text-red-600" />
              <span className="text-gray-700">
                {treeData.length} Suspects
              </span>
            </div>
            <div className="flex items-center gap-1">
              <DollarSign className="w-4 h-4 text-gray-600" />
              <span className="text-gray-700">
                {formatAmount(treeData.reduce((sum, node) => sum + node.totalOut, 0))} Total
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Tree Content */}
      <div className="flex-1 overflow-auto p-4">
        {treeData.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-500">
            <FileText className="w-12 h-12 mb-2" />
            <p>No transaction data available</p>
            <p className="text-sm">Upload a transaction file to see the money trail</p>
          </div>
        ) : (
          <div className="space-y-2">
            {treeData.map(node => renderTreeNode(node, 0))}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="border-t border-gray-200 px-4 py-2 bg-gray-50">
        <div className="flex items-center justify-between text-xs text-gray-600">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1">
              <div className="w-3 h-3 bg-red-100 border border-red-300 rounded"></div>
              Suspect
            </span>
            <span className="flex items-center gap-1">
              <div className="w-3 h-3 bg-orange-100 border border-orange-300 rounded"></div>
              Mule
            </span>
            <span className="flex items-center gap-1">
              <div className="w-3 h-3 bg-yellow-100 border border-yellow-300 rounded"></div>
              Splitter
            </span>
            <span className="flex items-center gap-1">
              <div className="w-3 h-3 bg-green-100 border border-green-300 rounded"></div>
              Endpoint
            </span>
          </div>
          <div>
            Click to expand • Right-click for actions • Scroll to explore
          </div>
        </div>
      </div>
    </div>
  );
};

export default HierarchicalTreeExplorer;
