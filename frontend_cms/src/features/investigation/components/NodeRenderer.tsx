/**
 * Phase 5, Feature 2, Phase 3: NodeRenderer Component
 *
 * Renders individual graph nodes with rich visual features:
 * - Icon display with category colors
 * - Selection highlighting (single and multi-select)
 * - Search result highlighting with pulse animation
 * - Risk level indicators (pulse ring for critical nodes)
 * - Layer-based opacity
 * - Connection handles (dots on hover)
 * - Labels (type and entity name)
 * - Path highlighting
 * - Special node types (terminal, victim-to-victim)
 *
 * Extracted from InvestigationWorkbenchTab.tsx (lines 2966-3251)
 */

import React from 'react';

// ============================================================================
// TYPES
// ============================================================================

export interface Node {
  id: string;
  label: string;
  type: string;
  x: number;
  y: number;
  risk_level?: string;
  confidence?: number;
  metadata?: {
    layer?: number;
    is_terminal?: boolean;
    is_victim_to_victim?: boolean;
    layerColor?: string;
    [key: string]: any;
  };
  entity?: {
    category?: string;
    [key: string]: any;
  };
}

export interface NodeRendererProps {
  /** Node data */
  node: Node;

  /** Is node highlighted (search result) */
  isHighlighted: boolean;

  /** Is node multi-selected */
  isMultiSelected: boolean;

  /** Is node the link source */
  isLinkSource: boolean;

  /** Is node in highlighted path */
  isInHighlightedPath: boolean;

  /** Are there any highlighted paths (dim others) */
  hasHighlightedPaths: boolean;

  /** Is node hovered */
  isHovered: boolean;

  /** Is linking mode active */
  linkingMode: boolean;

  /** Node opacity from layer settings */
  nodeOpacity: number;

  /** Callback when node is clicked (mouse down) */
  onMouseDown: (e: React.MouseEvent, nodeId: string) => void;

  /** Callback when node is double-clicked */
  onDoubleClick: (e: React.MouseEvent, node: Node) => void;

  /** Callback when node is released (mouse up) */
  onMouseUp: (e: React.MouseEvent, node: Node) => void;

  /** Callback when node is clicked */
  onClick: (e: React.MouseEvent) => void;

  /** Callback when node is right-clicked */
  onContextMenu: (e: React.MouseEvent, node: Node) => void;

  /** Callback when mouse enters node */
  onMouseEnter: (nodeId: string) => void;

  /** Callback when mouse leaves node */
  onMouseLeave: () => void;

  /** Callback when connection dot is clicked */
  onConnectionDotMouseDown: (e: React.MouseEvent, nodeId: string) => void;

  /** Helper function to get entity icon */
  getEntityIcon: (type: string) => string;

  /** Helper function to get category color */
  getCategoryColor: (type: string) => string;

  /** Helper function to get risk color */
  getRiskColor: (riskLevel?: string) => string;
}

// ============================================================================
// COMPONENT
// ============================================================================

/**
 * NodeRenderer Component
 *
 * Renders a single graph node with visual indicators and interactions
 *
 * @param props - NodeRendererProps
 *
 * @example
 * ```tsx
 * <NodeRenderer
 *   node={node}
 *   isHighlighted={highlightedNodes.has(node.id)}
 *   isMultiSelected={selectedNodes.has(node.id)}
 *   isLinkSource={linkSource === node.id}
 *   isInHighlightedPath={highlightedPath.nodeIds.has(node.id)}
 *   hasHighlightedPaths={highlightedPath.nodeIds.size > 0}
 *   isHovered={hoveredNode === node.id}
 *   linkingMode={linkingMode}
 *   nodeOpacity={layerOpacity[node.metadata?.layer] || 1}
 *   onMouseDown={handleNodeMouseDown}
 *   onDoubleClick={(e) => setEntityDetailsModal({ open: true, node })}
 *   getEntityIcon={getEntityIcon}
 *   getCategoryColor={getCategoryColor}
 *   getRiskColor={getRiskColor}
 * />
 * ```
 */
export const NodeRenderer: React.FC<NodeRendererProps> = ({
  node,
  isHighlighted,
  isMultiSelected,
  isLinkSource,
  isInHighlightedPath,
  hasHighlightedPaths,
  isHovered,
  linkingMode,
  nodeOpacity,
  onMouseDown,
  onDoubleClick,
  onMouseUp,
  onClick,
  onContextMenu,
  onMouseEnter,
  onMouseLeave,
  onConnectionDotMouseDown,
  getEntityIcon,
  getCategoryColor,
  getRiskColor,
}) => {
  // ============================================================================
  // NODE STYLING
  // ============================================================================

  // SPECIAL NODE DETECTION
  const isTerminalNode =
    node.metadata?.is_terminal === true || node.entity?.category === 'terminal';
  const isVictimSecondary =
    node.metadata?.is_victim_to_victim === true || node.entity?.category === 'victim_secondary';

  // Use layer color if available (tree layout), otherwise use category color
  const hasLayerColor = node.metadata?.layerColor;
  let categoryColor = hasLayerColor ? node.metadata?.layerColor : getCategoryColor(node.type);

  // Override with ORANGE for victim-to-victim nodes (Layer 1 victim accounts)
  if (isVictimSecondary) {
    categoryColor = '#F97316'; // Orange-500 for victim-to-victim
  }
  // Override with RED for terminal nodes (receivers who don't forward)
  else if (isTerminalNode) {
    categoryColor = '#EF4444'; // Red-500 for terminal nodes
  }

  const riskColor = getRiskColor(node.risk_level);
  const nodeSize = 60; // Circle diameter
  const nodeRadius = nodeSize / 2;

  // Calculate final opacity
  const finalOpacity = nodeOpacity * (isInHighlightedPath ? 1 : hasHighlightedPaths ? 0.3 : 1);

  // Truncate label if too long
  const displayLabel =
    node.label.length > 15 ? node.label.substring(0, 12) + '...' : node.label;
  const displayType =
    node.type.length > 10 ? node.type.substring(0, 10) : node.type;

  // ============================================================================
  // RENDER
  // ============================================================================

  // Skip rendering if node doesn't have valid coordinates yet
  if (node.x === undefined || node.y === undefined || isNaN(node.x) || isNaN(node.y)) {
    return null;
  }

  return (
    <g
      transform={`translate(${node.x}, ${node.y})`}
      opacity={finalOpacity}
      onMouseDown={(e) => onMouseDown(e, node.id)}
      onDoubleClick={(e) => onDoubleClick(e, node)}
      onMouseUp={(e) => onMouseUp(e, node)}
      onClick={onClick}
      onContextMenu={(e) => onContextMenu(e, node)}
      onMouseEnter={() => onMouseEnter(node.id)}
      onMouseLeave={onMouseLeave}
      style={{ cursor: linkingMode ? 'crosshair' : 'pointer' }}
    >
      {/* Subtle glow for selected nodes */}
      {(isLinkSource || isMultiSelected) && (
        <circle
          cx="0"
          cy="0"
          r={nodeRadius + 4}
          fill={isMultiSelected ? 'rgba(16, 185, 129, 0.15)' : 'rgba(59, 130, 246, 0.15)'}
          stroke="none"
        />
      )}

      {/* Pulse ring only for critical risk nodes (not selection) */}
      {node.risk_level === 'critical' && !isMultiSelected && !isLinkSource && (
        <circle
          cx="0"
          cy="0"
          r={nodeRadius + 8}
          fill="none"
          stroke={riskColor}
          strokeWidth="2"
          opacity="0.3"
          className="animate-pulse"
        />
      )}

      {/* Highlight ring for search results */}
      {isHighlighted && (
        <circle
          cx="0"
          cy="0"
          r={nodeRadius + 12}
          fill="none"
          stroke="#FBBF24"
          strokeWidth="3"
          opacity="0.6"
          className="animate-pulse"
        />
      )}

      {/* Invisible hitbox for reliable clicking/dragging */}
      <circle
        cx="0"
        cy="0"
        r={nodeRadius + 5}
        fill="transparent"
        style={{
          cursor: linkingMode ? 'crosshair' : 'pointer',
        }}
      />

      {/* Icon ONLY - no circle background */}
      <text
        x="0"
        y="0"
        textAnchor="middle"
        dominantBaseline="central"
        fontSize="32"
        style={{
          pointerEvents: 'none',
          filter:
            isMultiSelected || isLinkSource
              ? 'drop-shadow(0 0 8px rgba(59, 130, 246, 0.8))'
              : 'drop-shadow(0 2px 4px rgba(0,0,0,0.2))',
        }}
      >
        {getEntityIcon(node.type)}
      </text>

      {/* Selection ring - only when selected */}
      {(isMultiSelected || isLinkSource) && (
        <circle
          cx="0"
          cy="0"
          r={nodeRadius + 5}
          fill="none"
          stroke={isMultiSelected ? '#10B981' : '#3B82F6'}
          strokeWidth="3"
          strokeDasharray="5,5"
          opacity="0.6"
        />
      )}

      {/* Label below node - ALWAYS VISIBLE */}
      <text
        x="0"
        y={nodeRadius + 18}
        textAnchor="middle"
        fill="#6B7280"
        fontSize="9"
        fontWeight="500"
        style={{
          textTransform: 'uppercase',
          letterSpacing: '0.5px',
          pointerEvents: 'none',
          userSelect: 'none',
        }}
      >
        {displayType}
      </text>

      <text
        x="0"
        y={nodeRadius + 32}
        textAnchor="middle"
        fill="#1F2937"
        fontSize="11"
        fontWeight="600"
        style={{
          pointerEvents: 'none',
          userSelect: 'none',
        }}
      >
        {displayLabel}
      </text>

      {/* Connection handles - visible on hover, clickable for linking */}
      {(isHovered || linkingMode) && (
        <>
          <circle
            cx={-nodeRadius}
            cy="0"
            r="6"
            fill="#3B82F6"
            stroke="white"
            strokeWidth="2"
            style={{ cursor: 'crosshair' }}
            opacity="0.9"
            onMouseDown={(e) => onConnectionDotMouseDown(e, node.id)}
          />
          <circle
            cx={nodeRadius}
            cy="0"
            r="6"
            fill="#3B82F6"
            stroke="white"
            strokeWidth="2"
            style={{ cursor: 'crosshair' }}
            opacity="0.9"
            onMouseDown={(e) => onConnectionDotMouseDown(e, node.id)}
          />
          <circle
            cx="0"
            cy={-nodeRadius}
            r="6"
            fill="#3B82F6"
            stroke="white"
            strokeWidth="2"
            style={{ cursor: 'crosshair' }}
            opacity="0.9"
            onMouseDown={(e) => onConnectionDotMouseDown(e, node.id)}
          />
          <circle
            cx="0"
            cy={nodeRadius}
            r="6"
            fill="#3B82F6"
            stroke="white"
            strokeWidth="2"
            style={{ cursor: 'crosshair' }}
            opacity="0.9"
            onMouseDown={(e) => onConnectionDotMouseDown(e, node.id)}
          />
        </>
      )}
    </g>
  );
};

// ============================================================================
// DEFAULT EXPORT
// ============================================================================

export default NodeRenderer;
