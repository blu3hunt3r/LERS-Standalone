/**
 * Phase 5, Feature 2, Phase 3: GraphCanvas Component
 *
 * Main SVG canvas for rendering the investigation graph:
 * - Handles pan and zoom transforms
 * - Renders nodes and links with viewport culling
 * - Manages mouse interactions (click, drag, context menu)
 * - Supports drag-to-select
 * - Visual linking mode
 * - Layer controls overlay
 * - Temporary link rendering
 *
 * Integrates:
 * - NodeRenderer for individual nodes
 * - LinkRenderer for individual links
 * - LayerControlsOverlay for layer badges
 *
 * Extracted from InvestigationWorkbenchTab.tsx (lines 2555-3254)
 */

import React, { useRef } from 'react';
import { NodeRenderer } from './NodeRenderer';
import { LinkRenderer } from './LinkRenderer';
import { LayerControlsOverlay } from './LayerControlsOverlay';

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
  metadata?: any;
  entity?: any;
}

export interface Link {
  id: string;
  source: string;
  target: string;
  label?: string;
  metadata?: any;
}

export type LinkRenderType = 'curved' | 'straight' | 'freehand';
export type LayoutType = 'hierarchical' | 'force' | 'tree' | 'circular' | 'grid' | string;

export interface GraphCanvasProps {
  // Data
  visibleNodesInViewport: Node[];
  visibleLinksInViewport: Link[];
  filteredNodes: Node[];

  // Transform
  zoom: number;
  pan: { x: number; y: number };

  // Interaction state
  selectedNodes: Set<string>;
  highlightedNodes: Set<string>;
  highlightedPath: { nodeIds: Set<string>; linkIds: Set<string> };
  hoveredNode: string | null;
  hoveredLink: string | null;
  draggedNode: string | null;
  isPanning: boolean;
  linkingMode: boolean;
  linkSource: string | null;
  tempLinkEnd: { x: number; y: number } | null;
  connectionDot: { x: number; y: number } | null;
  dragSelectStart: { x: number; y: number } | null;
  dragSelectEnd: { x: number; y: number } | null;

  // Editing state
  editingLink: string | null;
  editLinkValue: string;

  // Layer state
  collapsedLayers: Set<number>;
  layerOpacity: Record<number, number>;

  // Rendering options
  linkRenderType: LinkRenderType;
  currentLayout: LayoutType;

  // Relationship types for edit dropdown
  relationshipTypes: Array<{ value: string; label: string }>;

  // Callbacks - Mouse events
  onSvgMouseDown: (e: React.MouseEvent) => void;
  onMouseMove: (e: React.MouseEvent) => void;
  onMouseUp: () => void;
  onWheel: (e: React.WheelEvent) => void;
  onCanvasClick: (e: React.MouseEvent<SVGSVGElement>) => void;
  onCanvasRightClick: (e: React.MouseEvent) => void;

  // Callbacks - Node events
  onNodeMouseDown: (e: React.MouseEvent, nodeId: string) => void;
  onNodeDoubleClick: (e: React.MouseEvent, node: Node) => void;
  onNodeMouseUp: (e: React.MouseEvent, node: Node) => void;
  onNodeClick: (e: React.MouseEvent) => void;
  onNodeRightClick: (e: React.MouseEvent, node: Node) => void;
  onNodeMouseEnter: (nodeId: string) => void;
  onNodeMouseLeave: () => void;
  onConnectionDotMouseDown: (e: React.MouseEvent, nodeId: string) => void;

  // Callbacks - Link events
  onLinkRightClick: (e: React.MouseEvent, link: Link) => void;
  onLinkDoubleClick: (link: Link) => void;
  onLinkMouseEnter: (linkId: string) => void;
  onLinkMouseLeave: () => void;
  onLinkLabelUpdate: (linkId: string, value: string) => void;
  onEditLinkValueChange: (value: string) => void;
  onEditingLinkEnd: () => void;

  // Callbacks - Layer events
  onToggleLayerCollapse: (layer: number) => void;

  // Helper functions
  getEntityIcon: (type: string) => string;
  getCategoryColor: (type: string) => string;
  getRiskColor: (riskLevel?: string) => string;
  getLayerColor: (layer: number) => string;
  getAttachmentPoint: (
    centerX: number,
    centerY: number,
    targetX: number,
    targetY: number,
    radius: number
  ) => { x: number; y: number };

  // Optional: Custom SVG ref
  svgRef?: React.RefObject<SVGSVGElement>;
}

// ============================================================================
// COMPONENT
// ============================================================================

/**
 * GraphCanvas Component
 *
 * Main canvas for rendering investigation graph with all interactions
 *
 * @param props - GraphCanvasProps
 *
 * @example
 * ```tsx
 * <GraphCanvas
 *   visibleNodesInViewport={visibleNodesInViewport}
 *   visibleLinksInViewport={visibleLinksInViewport}
 *   filteredNodes={filteredNodes}
 *   zoom={zoom}
 *   pan={pan}
 *   selectedNodes={selectedNodes}
 *   highlightedNodes={highlightedNodes}
 *   highlightedPath={highlightedPath}
 *   linkRenderType={linkRenderType}
 *   currentLayout={currentLayout}
 *   onSvgMouseDown={handleSvgMouseDown}
 *   onMouseMove={handleMouseMove}
 *   onMouseUp={handleMouseUp}
 *   onWheel={handleWheel}
 *   getEntityIcon={getEntityIcon}
 *   getCategoryColor={getCategoryColor}
 *   getRiskColor={getRiskColor}
 *   getLayerColor={getLayerColor}
 *   getAttachmentPoint={getAttachmentPoint}
 * />
 * ```
 */
export const GraphCanvas: React.FC<GraphCanvasProps> = ({
  visibleNodesInViewport,
  visibleLinksInViewport,
  filteredNodes,
  zoom,
  pan,
  selectedNodes,
  highlightedNodes,
  highlightedPath,
  hoveredNode,
  hoveredLink,
  draggedNode,
  isPanning,
  linkingMode,
  linkSource,
  tempLinkEnd,
  connectionDot,
  dragSelectStart,
  dragSelectEnd,
  editingLink,
  editLinkValue,
  collapsedLayers,
  layerOpacity,
  linkRenderType,
  currentLayout,
  relationshipTypes,
  onSvgMouseDown,
  onMouseMove,
  onMouseUp,
  onWheel,
  onCanvasClick,
  onCanvasRightClick,
  onNodeMouseDown,
  onNodeDoubleClick,
  onNodeMouseUp,
  onNodeClick,
  onNodeRightClick,
  onNodeMouseEnter,
  onNodeMouseLeave,
  onConnectionDotMouseDown,
  onLinkRightClick,
  onLinkDoubleClick,
  onLinkMouseEnter,
  onLinkMouseLeave,
  onLinkLabelUpdate,
  onEditLinkValueChange,
  onEditingLinkEnd,
  onToggleLayerCollapse,
  getEntityIcon,
  getCategoryColor,
  getRiskColor,
  getLayerColor,
  getAttachmentPoint,
  svgRef: externalSvgRef,
}) => {
  // ============================================================================
  // REF
  // ============================================================================

  const internalSvgRef = useRef<SVGSVGElement>(null);
  const svgRef = externalSvgRef || internalSvgRef;

  // ============================================================================
  // CURSOR LOGIC
  // ============================================================================

  const getCursor = () => {
    if (isPanning) return 'grabbing';
    if (draggedNode) return 'grabbing';
    if (linkingMode) return 'crosshair';
    return 'grab';
  };

  // ============================================================================
  // RENDER
  // ============================================================================

  return (
    <svg
      ref={svgRef}
      className="w-full h-full"
      style={{
        cursor: getCursor(),
        userSelect: 'none',
        WebkitUserSelect: 'none',
        MozUserSelect: 'none',
        msUserSelect: 'none',
      }}
      onMouseDown={onSvgMouseDown}
      onMouseUp={onMouseUp}
      onWheel={onWheel}
      onClick={onCanvasClick}
    >
      {/* Defs - Arrow markers and patterns */}
      <defs>
        <marker
          id="arrowhead"
          markerWidth="6"
          markerHeight="6"
          refX="5"
          refY="2"
          orient="auto"
          markerUnits="strokeWidth"
        >
          <path d="M0,0 L0,4 L5,2 z" fill="#4B5563" />
        </marker>

        <pattern id="dots" x="0" y="0" width="20" height="20" patternUnits="userSpaceOnUse">
          <circle cx="2" cy="2" r="1.5" fill="#cbd5e1" opacity="0.4" />
        </pattern>
      </defs>

      {/* Background */}
      <rect width="100%" height="100%" fill="url(#dots)" />

      {/* Main transform group - pan and zoom */}
      <g
        style={{
          transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
          transformOrigin: '0 0',
        }}
      >
        {/* Render links - VIEWPORT CULLED for performance */}
        {visibleLinksInViewport.map((link) => {
          const sourceNode = visibleNodesInViewport.find((n) => n.id === link.source);
          const targetNode = visibleNodesInViewport.find((n) => n.id === link.target);
          if (!sourceNode || !targetNode) return null;

          // Skip rendering links if either node is in a collapsed layer
          const sourceLayer = sourceNode.metadata?.layer;
          const targetLayer = targetNode.metadata?.layer;
          if (
            (sourceLayer !== undefined && collapsedLayers.has(sourceLayer)) ||
            (targetLayer !== undefined && collapsedLayers.has(targetLayer))
          ) {
            return null;
          }

          return (
            <LinkRenderer
              key={link.id}
              link={link}
              sourceNode={sourceNode}
              targetNode={targetNode}
              linkRenderType={linkRenderType}
              currentLayout={currentLayout}
              isEditing={editingLink === link.id}
              isHovered={hoveredLink === link.id}
              isHighlighted={highlightedPath.linkIds.has(link.id)}
              hasHighlightedLinks={highlightedPath.linkIds.size > 0}
              editLinkValue={editLinkValue}
              relationshipTypes={relationshipTypes}
              onContextMenu={onLinkRightClick}
              onDoubleClick={onLinkDoubleClick}
              onMouseEnter={onLinkMouseEnter}
              onMouseLeave={onLinkMouseLeave}
              onEditValueChange={onEditLinkValueChange}
              onEditEnd={onEditingLinkEnd}
              onLabelUpdate={onLinkLabelUpdate}
              getLayerColor={getLayerColor}
              getAttachmentPoint={getAttachmentPoint}
            />
          );
        })}

        {/* Temp link while creating */}
        {linkingMode && linkSource && tempLinkEnd && (
          <>
            {/* Dashed line from source/dot to cursor */}
            <line
              x1={connectionDot?.x || filteredNodes.find((n) => n.id === linkSource)?.x || 0}
              y1={connectionDot?.y || filteredNodes.find((n) => n.id === linkSource)?.y || 0}
              x2={tempLinkEnd.x}
              y2={tempLinkEnd.y}
              stroke="#3B82F6"
              strokeWidth="2"
              strokeDasharray="5,5"
              opacity="0.6"
            />
            {/* Connection dot at origin point */}
            {connectionDot && (
              <circle
                cx={connectionDot.x}
                cy={connectionDot.y}
                r="6"
                fill="#3B82F6"
                stroke="white"
                strokeWidth="2"
                className="animate-pulse"
                filter="drop-shadow(0 2px 4px rgba(59,130,246,0.4))"
              />
            )}
          </>
        )}

        {/* Drag-to-Select Box */}
        {dragSelectStart && dragSelectEnd && (
          <rect
            x={Math.min(dragSelectStart.x, dragSelectEnd.x)}
            y={Math.min(dragSelectStart.y, dragSelectEnd.y)}
            width={Math.abs(dragSelectEnd.x - dragSelectStart.x)}
            height={Math.abs(dragSelectEnd.y - dragSelectStart.y)}
            fill="rgba(59, 130, 246, 0.1)"
            stroke="#3B82F6"
            strokeWidth="2"
            strokeDasharray="5,5"
            style={{ pointerEvents: 'none' }}
          />
        )}

        {/* Layer Controls (for tree layout) - Collapsible */}
        <LayerControlsOverlay
          filteredNodes={filteredNodes}
          collapsedLayers={collapsedLayers}
          onToggleLayerCollapse={onToggleLayerCollapse}
          getLayerColor={getLayerColor}
        />

        {/* Render nodes - VIEWPORT CULLED for performance */}
        {visibleNodesInViewport.map((node) => {
          // Skip rendering nodes in collapsed layers
          if (node.metadata?.layer !== undefined && collapsedLayers.has(node.metadata.layer)) {
            return null;
          }

          const nodeOpacity =
            node.metadata?.layer !== undefined && layerOpacity[node.metadata.layer] !== undefined
              ? layerOpacity[node.metadata.layer]
              : 1;

          return (
            <NodeRenderer
              key={node.id}
              node={node}
              isHighlighted={highlightedNodes.has(node.id)}
              isMultiSelected={selectedNodes.has(node.id)}
              isLinkSource={linkSource === node.id}
              isInHighlightedPath={highlightedPath.nodeIds.has(node.id)}
              hasHighlightedPaths={highlightedPath.nodeIds.size > 0}
              isHovered={hoveredNode === node.id}
              linkingMode={linkingMode}
              nodeOpacity={nodeOpacity}
              onMouseDown={onNodeMouseDown}
              onDoubleClick={onNodeDoubleClick}
              onMouseUp={onNodeMouseUp}
              onClick={onNodeClick}
              onContextMenu={onNodeRightClick}
              onMouseEnter={onNodeMouseEnter}
              onMouseLeave={onNodeMouseLeave}
              onConnectionDotMouseDown={onConnectionDotMouseDown}
              getEntityIcon={getEntityIcon}
              getCategoryColor={getCategoryColor}
              getRiskColor={getRiskColor}
            />
          );
        })}
      </g>
    </svg>
  );
};

// ============================================================================
// DEFAULT EXPORT
// ============================================================================

export default GraphCanvas;
