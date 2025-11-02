/**
 * Alluvial Flow Diagram for Layer-to-Layer Money Movement
 *
 * Shows aggregate flows between layers with exact amounts
 * Visual: River-like flow showing how money moves through layers
 */

import React, { useMemo, useState } from 'react';
import { TrendingUp, DollarSign, Layers, Info } from 'lucide-react';

interface LayerFlow {
  layer: number;
  totalAmount: number;
  accountCount: number;
  flowsTo: { targetLayer: number; amount: number; linkCount: number; }[];
}

interface AlluvialFlowDiagramProps {
  nodes: any[];
  links: any[];
}

export const AlluvialFlowDiagram: React.FC<AlluvialFlowDiagramProps> = ({
  nodes,
  links
}) => {
  const [hoveredFlow, setHoveredFlow] = useState<{ from: number; to: number; } | null>(null);

  // Calculate layer-to-layer flows
  const layerFlows = useMemo(() => {
    console.log('🌊 Building alluvial flow diagram...');

    const layerMap = new Map<number, LayerFlow>();

    // Initialize layers
    nodes.forEach(node => {
      const layer = node.metadata?.layer || 0;
      if (!layerMap.has(layer)) {
        layerMap.set(layer, {
          layer,
          totalAmount: 0,
          accountCount: 0,
          flowsTo: []
        });
      }
      layerMap.get(layer)!.accountCount++;
    });

    // Calculate flows between layers
    links.forEach(link => {
      const fromNode = nodes.find(n => n.id === link.source);
      const toNode = nodes.find(n => n.id === link.target);

      if (fromNode && toNode) {
        const fromLayer = fromNode.metadata?.layer || 0;
        const toLayer = toNode.metadata?.layer || 0;
        const amount = parseFloat(link.metadata?.amount || link.metadata?.transaction_amount || '0');

        const fromLayerData = layerMap.get(fromLayer);
        if (fromLayerData) {
          fromLayerData.totalAmount += amount;

          // Find or create flow to target layer
          let flow = fromLayerData.flowsTo.find(f => f.targetLayer === toLayer);
          if (!flow) {
            flow = { targetLayer: toLayer, amount: 0, linkCount: 0 };
            fromLayerData.flowsTo.push(flow);
          }
          flow.amount += amount;
          flow.linkCount++;
        }
      }
    });

    // Sort layers and flows
    const layers = Array.from(layerMap.values()).sort((a, b) => a.layer - b.layer);
    layers.forEach(layer => {
      layer.flowsTo.sort((a, b) => b.amount - a.amount);
    });

    console.log('✅ Layer flows:', layers.length, 'layers');
    return layers;
  }, [nodes, links]);

  // Format amount
  const formatAmount = (amount: number): string => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(amount);
  };

  // Format compact amount (for labels)
  const formatCompactAmount = (amount: number): string => {
    if (amount >= 10000000) return `₹${(amount / 10000000).toFixed(1)}Cr`;
    if (amount >= 100000) return `₹${(amount / 100000).toFixed(1)}L`;
    if (amount >= 1000) return `₹${(amount / 1000).toFixed(0)}K`;
    return `₹${amount.toFixed(0)}`;
  };

  // Calculate dimensions
  const width = 1200;
  const height = 600;
  const layerWidth = 80;
  const layerSpacing = (width - layerWidth * 2) / (layerFlows.length - 1 || 1);
  const maxAmount = Math.max(...layerFlows.map(l => l.totalAmount), 1);

  return (
    <div className="h-full flex flex-col bg-white">
      {/* Header */}
      <div className="border-b border-gray-200 p-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <Layers className="w-5 h-5 text-blue-600" />
              Alluvial Flow Diagram - Layer Money Movement
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              See how money flows through each layer with exact amounts
            </p>
          </div>
          <div className="flex items-center gap-4 text-sm">
            <div className="flex items-center gap-1">
              <DollarSign className="w-4 h-4 text-gray-600" />
              <span className="text-gray-700">
                Total: {formatAmount(layerFlows.reduce((sum, l) => sum + l.totalAmount, 0))}
              </span>
            </div>
            <div className="text-gray-500">•</div>
            <div className="text-gray-700">
              {layerFlows.length} Layers
            </div>
          </div>
        </div>
      </div>

      {/* Diagram */}
      <div className="flex-1 overflow-auto p-8">
        <svg
          width={width}
          height={height}
          viewBox={`0 0 ${width} ${height}`}
          className="mx-auto"
        >
          <defs>
            {/* Gradient for flow paths */}
            <linearGradient id="flowGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#3B82F6" stopOpacity="0.3" />
              <stop offset="100%" stopColor="#10B981" stopOpacity="0.3" />
            </linearGradient>
          </defs>

          {/* Draw flows between layers */}
          {layerFlows.map((layer, layerIndex) => {
            const x1 = layerIndex * layerSpacing + layerWidth;
            const layerHeight = (layer.totalAmount / maxAmount) * (height - 100);
            const y1 = (height - layerHeight) / 2;

            return layer.flowsTo.map((flow, flowIndex) => {
              const targetLayerIndex = layerFlows.findIndex(l => l.layer === flow.targetLayer);
              if (targetLayerIndex === -1) return null;

              const x2 = targetLayerIndex * layerSpacing;
              const targetLayer = layerFlows[targetLayerIndex];
              const targetHeight = (targetLayer.totalAmount / maxAmount) * (height - 100);
              const y2 = (height - targetHeight) / 2;

              const flowHeight = (flow.amount / maxAmount) * (height - 100);
              const isHovered = hoveredFlow?.from === layer.layer && hoveredFlow?.to === flow.targetLayer;

              // Calculate path for flow
              const path = `
                M ${x1} ${y1 + flowHeight / 2}
                C ${x1 + (x2 - x1) / 2} ${y1 + flowHeight / 2},
                  ${x1 + (x2 - x1) / 2} ${y2 + flowHeight / 2},
                  ${x2} ${y2 + flowHeight / 2}
              `;

              return (
                <g key={`${layer.layer}-${flow.targetLayer}`}>
                  {/* Flow path */}
                  <path
                    d={path}
                    fill="none"
                    stroke={isHovered ? '#3B82F6' : '#94A3B8'}
                    strokeWidth={flowHeight}
                    strokeOpacity={isHovered ? 0.8 : 0.3}
                    onMouseEnter={() => setHoveredFlow({ from: layer.layer, to: flow.targetLayer })}
                    onMouseLeave={() => setHoveredFlow(null)}
                    className="cursor-pointer transition-all duration-200"
                  />

                  {/* Flow label (on hover) */}
                  {isHovered && (
                    <>
                      <rect
                        x={(x1 + x2) / 2 - 80}
                        y={(y1 + y2) / 2 - 30}
                        width={160}
                        height={60}
                        fill="white"
                        stroke="#3B82F6"
                        strokeWidth={2}
                        rx={8}
                      />
                      <text
                        x={(x1 + x2) / 2}
                        y={(y1 + y2) / 2 - 10}
                        textAnchor="middle"
                        className="text-sm font-semibold fill-gray-900"
                      >
                        Layer {layer.layer} → {flow.targetLayer}
                      </text>
                      <text
                        x={(x1 + x2) / 2}
                        y={(y1 + y2) / 2 + 8}
                        textAnchor="middle"
                        className="text-sm font-bold fill-blue-600"
                      >
                        {formatAmount(flow.amount)}
                      </text>
                      <text
                        x={(x1 + x2) / 2}
                        y={(y1 + y2) / 2 + 24}
                        textAnchor="middle"
                        className="text-xs fill-gray-600"
                      >
                        {flow.linkCount} transactions
                      </text>
                    </>
                  )}
                </g>
              );
            });
          })}

          {/* Draw layer bars */}
          {layerFlows.map((layer, index) => {
            const x = index * layerSpacing;
            const layerHeight = (layer.totalAmount / maxAmount) * (height - 100);
            const y = (height - layerHeight) / 2;

            return (
              <g key={layer.layer}>
                {/* Layer bar */}
                <rect
                  x={x}
                  y={y}
                  width={layerWidth}
                  height={layerHeight}
                  fill="#3B82F6"
                  fillOpacity={0.8}
                  stroke="#1E40AF"
                  strokeWidth={2}
                  rx={4}
                />

                {/* Layer label */}
                <text
                  x={x + layerWidth / 2}
                  y={y - 10}
                  textAnchor="middle"
                  className="text-sm font-semibold fill-gray-900"
                >
                  Layer {layer.layer}
                </text>

                {/* Amount */}
                <text
                  x={x + layerWidth / 2}
                  y={y + layerHeight / 2 - 8}
                  textAnchor="middle"
                  className="text-sm font-bold fill-white"
                >
                  {formatCompactAmount(layer.totalAmount)}
                </text>

                {/* Account count */}
                <text
                  x={x + layerWidth / 2}
                  y={y + layerHeight / 2 + 8}
                  textAnchor="middle"
                  className="text-xs fill-white"
                >
                  {layer.accountCount} accounts
                </text>

                {/* Outgoing flows count */}
                <text
                  x={x + layerWidth / 2}
                  y={y + layerHeight + 20}
                  textAnchor="middle"
                  className="text-xs fill-gray-600"
                >
                  → {layer.flowsTo.length} flows
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      {/* Legend */}
      <div className="border-t border-gray-200 p-4">
        <div className="flex items-start gap-4">
          <div className="flex items-center gap-2">
            <Info className="w-4 h-4 text-blue-600" />
            <span className="text-sm text-gray-700 font-medium">How to read:</span>
          </div>
          <div className="flex-1 grid grid-cols-3 gap-4 text-sm text-gray-600">
            <div>
              <span className="font-medium">Bar height</span> = Total money in layer
            </div>
            <div>
              <span className="font-medium">Flow width</span> = Amount transferred
            </div>
            <div>
              <span className="font-medium">Hover flow</span> = See exact amounts
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AlluvialFlowDiagram;
