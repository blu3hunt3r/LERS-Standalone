/**
 * TASK 1.3.2: Animated Money Flow - SVG gradient animation for transactions
 * TASK 1.3.3: Multi-Edge Support - Handle multiple relationships between nodes
 * TASK 1.3.4: Edge Interaction Enhancements - Tooltips, click handlers
 */

import React, { useState } from 'react';
import { Link, Node } from '../types';
import { getEdgeWidth, getLinkColor } from '../utils/colorUtils';

interface EnhancedEdgeProps {
  link: Link;
  sourceNode: Node;
  targetNode: Node;
  isHighlighted?: boolean;
  onDoubleClick?: () => void;
  onRightClick?: (e: React.MouseEvent) => void;
}

export const EnhancedEdge: React.FC<EnhancedEdgeProps> = ({
  link,
  sourceNode,
  targetNode,
  isHighlighted = false,
  onDoubleClick,
  onRightClick,
}) => {
  const [showTooltip, setShowTooltip] = useState(false);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });

  const width = getEdgeWidth(link.amount);
  const color = getLinkColor(link.type);
  const isMoneyFlow = link.type === 'TRANSFERRED' && link.amount && link.amount > 0;

  // Calculate curved path for better multi-edge support
  const midX = (sourceNode.x + targetNode.x) / 2;
  const midY = (sourceNode.y + targetNode.y) / 2;
  const dx = targetNode.x - sourceNode.x;
  const dy = targetNode.y - sourceNode.y;
  const dist = Math.sqrt(dx * dx + dy * dy);
  const offset = dist * 0.15; // Curve offset
  
  const controlX = midX - (dy * offset / dist);
  const controlY = midY + (dx * offset / dist);
  
  const path = `M ${sourceNode.x},${sourceNode.y} Q ${controlX},${controlY} ${targetNode.x},${targetNode.y}`;

  const formatCurrency = (amount: number): string => {
    if (amount >= 10000000) return `₹${(amount / 10000000).toFixed(2)}Cr`;
    if (amount >= 100000) return `₹${(amount / 100000).toFixed(2)}L`;
    if (amount >= 1000) return `₹${(amount / 1000).toFixed(2)}K`;
    return `₹${amount}`;
  };

  const formatDate = (dateStr?: string): string => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    setTooltipPos({ x: e.clientX, y: e.clientY });
    setShowTooltip(true);
  };

  return (
    <g>
      {/* Animated money flow layer (if applicable) */}
      {isMoneyFlow && (
        <>
          {/* Gradient definition */}
          <defs>
            <linearGradient id={`money-flow-${link.id}`} x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#10B981" stopOpacity="0.2" />
              <stop offset="50%" stopColor="#10B981" stopOpacity="1" />
              <stop offset="100%" stopColor="#10B981" stopOpacity="0.2" />
              <animate
                attributeName="x1"
                values="-100%;100%"
                dur="2s"
                repeatCount="indefinite"
              />
              <animate
                attributeName="x2"
                values="0%;200%"
                dur="2s"
                repeatCount="indefinite"
              />
            </linearGradient>
          </defs>

          {/* Animated path */}
          <path
            d={path}
            fill="none"
            stroke={`url(#money-flow-${link.id})`}
            strokeWidth={width + 2}
            strokeLinecap="round"
            markerEnd={`url(#arrowhead-money-${link.id})`}
            style={{ pointerEvents: 'none' }}
          />

          {/* Arrow marker */}
          <defs>
            <marker
              id={`arrowhead-money-${link.id}`}
              markerWidth="10"
              markerHeight="10"
              refX="9"
              refY="3"
              orient="auto"
            >
              <path d="M0,0 L0,6 L9,3 z" fill="#10B981" />
            </marker>
          </defs>
        </>
      )}

      {/* Invisible thick hitbox for easy clicking */}
      <path
        d={path}
        fill="none"
        stroke="transparent"
        strokeWidth="20"
        style={{ cursor: 'pointer' }}
        onMouseMove={handleMouseMove}
        onMouseLeave={() => setShowTooltip(false)}
        onDoubleClick={onDoubleClick}
        onContextMenu={onRightClick}
      />

      {/* Main edge line */}
      <path
        d={path}
        fill="none"
        stroke={isHighlighted ? '#3B82F6' : color}
        strokeWidth={width}
        strokeLinecap="round"
        markerEnd={`url(#arrowhead-${link.id})`}
        style={{ 
          pointerEvents: 'none',
          transition: 'stroke 0.2s, stroke-width 0.2s',
        }}
      />

      {/* Arrow marker */}
      <defs>
        <marker
          id={`arrowhead-${link.id}`}
          markerWidth="10"
          markerHeight="10"
          refX="9"
          refY="3"
          orient="auto"
        >
          <path d="M0,0 L0,6 L9,3 z" fill={isHighlighted ? '#3B82F6' : color} />
        </marker>
      </defs>

      {/* Label */}
      <g transform={`translate(${midX}, ${midY})`}>
        {/* Label background */}
        <rect
          x={-40}
          y={-10}
          width={80}
          height={20}
          rx="10"
          fill="white"
          stroke="#E5E7EB"
          strokeWidth="1"
          filter="drop-shadow(0 1px 2px rgba(0,0,0,0.1))"
        />
        
        {/* Label text */}
        <text
          textAnchor="middle"
          y="4"
          fill="#475569"
          fontSize="10"
          fontWeight="600"
          style={{ textTransform: 'uppercase', letterSpacing: '0.5px', pointerEvents: 'none' }}
        >
          {link.label}
        </text>
      </g>

      {/* Tooltip */}
      {showTooltip && (
        <foreignObject
          x={tooltipPos.x - midX + 10}
          y={tooltipPos.y - midY + 10}
          width="200"
          height="120"
          style={{ pointerEvents: 'none' }}
        >
          <div className="bg-gray-900 text-white text-xs p-3 rounded-lg shadow-xl">
            <div className="font-semibold mb-2">{link.label}</div>
            {link.amount && (
              <div className="text-green-300 font-bold mb-1">
                {formatCurrency(link.amount)}
              </div>
            )}
            {link.date && (
              <div className="text-gray-300 mb-1">
                Date: {formatDate(link.date)}
              </div>
            )}
            {link.metadata?.confidence && (
              <div className="text-gray-300">
                Confidence: {link.metadata.confidence}%
              </div>
            )}
            <div className="text-gray-400 mt-2 text-[10px]">
              Double-click to edit
            </div>
          </div>
        </foreignObject>
      )}
    </g>
  );
};

