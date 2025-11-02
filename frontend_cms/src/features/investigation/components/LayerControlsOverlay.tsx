/**
 * Phase 5, Feature 2, Phase 3: LayerControlsOverlay Component
 *
 * Renders collapsible layer badges on the graph canvas:
 * - Layer label with expand/collapse button
 * - Node count badge
 * - Color-coded by layer
 * - Horizontal connector line to layer
 * - Click to expand/collapse layer
 *
 * Only renders when layer data is present (tree layout active)
 *
 * Extracted from InvestigationWorkbenchTab.tsx (lines 2853-2964)
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
  metadata?: {
    layer?: number;
    [key: string]: any;
  };
}

export interface LayerControlsOverlayProps {
  /** All filtered nodes (to group by layer) */
  filteredNodes: Node[];

  /** Set of collapsed layer IDs */
  collapsedLayers: Set<number>;

  /** Callback when layer collapse is toggled */
  onToggleLayerCollapse: (layer: number) => void;

  /** Helper function to get layer color */
  getLayerColor: (layer: number) => string;
}

// ============================================================================
// COMPONENT
// ============================================================================

/**
 * LayerControlsOverlay Component
 *
 * Renders collapsible layer badges on the canvas for tree layouts
 *
 * @param props - LayerControlsOverlayProps
 *
 * @example
 * ```tsx
 * <LayerControlsOverlay
 *   filteredNodes={filteredNodes}
 *   collapsedLayers={collapsedLayers}
 *   onToggleLayerCollapse={toggleLayerCollapse}
 *   getLayerColor={getLayerColor}
 * />
 * ```
 */
export const LayerControlsOverlay: React.FC<LayerControlsOverlayProps> = ({
  filteredNodes,
  collapsedLayers,
  onToggleLayerCollapse,
  getLayerColor,
}) => {
  // ============================================================================
  // GROUP NODES BY LAYER
  // ============================================================================

  const layerGroups = React.useMemo(() => {
    const groups = new Map<number, Node[]>();
    filteredNodes.forEach((node) => {
      if (node.metadata?.layer !== undefined) {
        const layer = node.metadata.layer;
        if (!groups.has(layer)) {
          groups.set(layer, []);
        }
        groups.get(layer)!.push(node);
      }
    });
    return groups;
  }, [filteredNodes]);

  // Only render if we have layer data (tree layout active)
  if (layerGroups.size === 0) return null;

  // ============================================================================
  // RENDER
  // ============================================================================

  return (
    <>
      {Array.from(layerGroups.entries()).map(([layer, nodes]) => {
        if (nodes.length === 0) return null;

        const isCollapsed = collapsedLayers.has(layer);

        // Calculate layer dimensions
        const minX = Math.min(...nodes.map((n) => n.x)) - 100;
        const maxX = Math.max(...nodes.map((n) => n.x)) + 100;
        const avgY = nodes.reduce((sum, n) => sum + n.y, 0) / nodes.length;

        const layerColor = getLayerColor(layer);

        return (
          <g key={`layer-control-${layer}`}>
            {/* Clickable layer label with expand/collapse button */}
            <g
              transform={`translate(${minX - 120}, ${avgY})`}
              style={{ cursor: 'pointer' }}
              onClick={() => onToggleLayerCollapse(layer)}
            >
              {/* Background for button */}
              <rect
                x="-10"
                y="-18"
                width="110"
                height="36"
                fill="white"
                stroke={layerColor}
                strokeWidth="2"
                rx="6"
                opacity="0.95"
              />

              {/* Expand/Collapse icon */}
              <text
                x="5"
                y="5"
                textAnchor="middle"
                dominantBaseline="middle"
                fontSize="16"
                fill={layerColor}
              >
                {isCollapsed ? '▶' : '▼'}
              </text>

              {/* Layer label */}
              <text
                x="25"
                y="5"
                textAnchor="start"
                dominantBaseline="middle"
                fill={layerColor}
                fontSize="13"
                fontWeight="600"
              >
                Layer {layer}
              </text>

              {/* Node count badge */}
              <circle cx="85" cy="5" r="10" fill={layerColor} opacity="0.2" />
              <text
                x="85"
                y="5"
                textAnchor="middle"
                dominantBaseline="middle"
                fill={layerColor}
                fontSize="10"
                fontWeight="600"
              >
                {nodes.length}
              </text>
            </g>

            {/* Horizontal line connecting to layer */}
            <line
              x1={minX - 10}
              y1={avgY}
              x2={minX}
              y2={avgY}
              stroke={layerColor}
              strokeWidth="2"
              opacity="0.4"
              strokeDasharray="4,4"
              style={{ pointerEvents: 'none' }}
            />
          </g>
        );
      })}
    </>
  );
};

// ============================================================================
// DEFAULT EXPORT
// ============================================================================

export default LayerControlsOverlay;
