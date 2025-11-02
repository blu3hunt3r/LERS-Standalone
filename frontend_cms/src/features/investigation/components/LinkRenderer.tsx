/**
 * Phase 5, Feature 2, Phase 3: LinkRenderer Component
 *
 * Renders individual graph links/edges with different styles:
 * - Curved (default) - smooth bezier curve
 * - Straight - direct line
 * - Freehand - natural curve variation
 * - Tree layout - straight lines with layer colors
 *
 * Features:
 * - Invisible hitbox for easy clicking
 * - Hover effects
 * - Label display (always in hierarchical, on hover otherwise)
 * - Metadata annotations (amount, frequency, duration, confidence)
 * - Highlighted path support
 * - Right-click context menu
 * - Double-click to edit
 *
 * Extracted from InvestigationWorkbenchTab.tsx (lines 2622-2806)
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

export interface Link {
  id: string;
  source: string;
  target: string;
  label?: string;
  metadata?: {
    layer?: number;
    opacity?: number;
    amount?: string | number;
    frequency?: number;
    duration?: number;
    confidence?: number;
    [key: string]: any;
  };
}

export type LinkRenderType = 'curved' | 'straight' | 'freehand';
export type LayoutType = 'hierarchical' | 'force' | 'tree' | 'circular' | 'grid' | string;

export interface LinkRendererProps {
  /** Link data */
  link: Link;

  /** Source node */
  sourceNode: Node;

  /** Target node */
  targetNode: Node;

  /** Link rendering type */
  linkRenderType: LinkRenderType;

  /** Current layout type */
  currentLayout: LayoutType;

  /** Is link being edited */
  isEditing: boolean;

  /** Is link hovered */
  isHovered: boolean;

  /** Is link highlighted (in path) */
  isHighlighted: boolean;

  /** Are other links highlighted (dim this one) */
  hasHighlightedLinks: boolean;

  /** Edit link value for dropdown */
  editLinkValue: string;

  /** Relationship types for edit dropdown */
  relationshipTypes: Array<{ value: string; label: string }>;

  /** Callback when link is right-clicked */
  onContextMenu: (e: React.MouseEvent, link: Link) => void;

  /** Callback when link is double-clicked */
  onDoubleClick: (link: Link) => void;

  /** Callback when mouse enters link */
  onMouseEnter: (linkId: string) => void;

  /** Callback when mouse leaves link */
  onMouseLeave: () => void;

  /** Callback when edit value changes */
  onEditValueChange: (value: string) => void;

  /** Callback when editing ends */
  onEditEnd: () => void;

  /** Callback when link label is updated */
  onLabelUpdate: (linkId: string, value: string) => void;

  /** Helper function to get layer color */
  getLayerColor?: (layer: number) => string;

  /** Helper function to get attachment point */
  getAttachmentPoint: (
    centerX: number,
    centerY: number,
    targetX: number,
    targetY: number,
    radius: number
  ) => { x: number; y: number };
}

// ============================================================================
// COMPONENT
// ============================================================================

/**
 * LinkRenderer Component
 *
 * Renders a single graph link/edge with various styles and interactions
 *
 * @param props - LinkRendererProps
 *
 * @example
 * ```tsx
 * <LinkRenderer
 *   link={link}
 *   sourceNode={sourceNode}
 *   targetNode={targetNode}
 *   linkRenderType="curved"
 *   currentLayout="force"
 *   isEditing={editingLink === link.id}
 *   isHovered={hoveredLink === link.id}
 *   isHighlighted={highlightedPath.linkIds.has(link.id)}
 *   hasHighlightedLinks={highlightedPath.linkIds.size > 0}
 *   onContextMenu={handleLinkRightClick}
 *   onDoubleClick={handleLinkDoubleClick}
 *   getAttachmentPoint={getAttachmentPoint}
 * />
 * ```
 */
export const LinkRenderer: React.FC<LinkRendererProps> = ({
  link,
  sourceNode,
  targetNode,
  linkRenderType,
  currentLayout,
  isEditing,
  isHovered,
  isHighlighted,
  hasHighlightedLinks,
  editLinkValue,
  relationshipTypes,
  onContextMenu,
  onDoubleClick,
  onMouseEnter,
  onMouseLeave,
  onEditValueChange,
  onEditEnd,
  onLabelUpdate,
  getLayerColor,
  getAttachmentPoint,
}) => {
  // ============================================================================
  // VALIDATIONS
  // ============================================================================

  // Skip rendering if nodes don't have valid coordinates yet
  if (
    sourceNode.x === undefined || sourceNode.y === undefined ||
    targetNode.x === undefined || targetNode.y === undefined ||
    isNaN(sourceNode.x) || isNaN(sourceNode.y) ||
    isNaN(targetNode.x) || isNaN(targetNode.y)
  ) {
    return null;
  }

  // ============================================================================
  // CALCULATIONS
  // ============================================================================

  // Check if this is a tree layout with layer data
  const sourceLayer = sourceNode.metadata?.layer;
  const targetLayer = targetNode.metadata?.layer;
  const hasLayerData = sourceLayer !== undefined && targetLayer !== undefined;

  // Use layer color for links in tree layout
  const defaultGetLayerColor = (layer: number) => {
    const colors = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#06B6D4'];
    return colors[layer % colors.length];
  };
  const layerColorFn = getLayerColor || defaultGetLayerColor;
  const linkColor = hasLayerData ? layerColorFn(targetLayer) : '#4B5563';

  // Calculate dynamic attachment points on entity edges
  const nodeRadius = 35;
  const arrowOffset = 8;

  const sourcePoint = getAttachmentPoint(
    sourceNode.x,
    sourceNode.y,
    targetNode.x,
    targetNode.y,
    nodeRadius
  );
  const targetPoint = getAttachmentPoint(
    targetNode.x,
    targetNode.y,
    sourceNode.x,
    sourceNode.y,
    nodeRadius + arrowOffset
  );

  const sourceX = sourcePoint.x;
  const sourceY = sourcePoint.y;
  const targetX = targetPoint.x;
  const targetY = targetPoint.y;

  const dx = targetNode.x - sourceNode.x;
  const dy = targetNode.y - sourceNode.y;
  const distance = Math.sqrt(dx * dx + dy * dy);

  // Calculate path based on link render type
  let path: string;

  if (hasLayerData) {
    // STRAIGHT LINE for tree layout
    path = `M ${sourceX},${sourceY} L ${targetX},${targetY}`;
  } else if (linkRenderType === 'straight') {
    path = `M ${sourceX},${sourceY} L ${targetX},${targetY}`;
  } else if (linkRenderType === 'freehand') {
    const offset = distance * 0.15;
    const controlX1 = sourceX + (targetX - sourceX) * 0.25 - (dy * offset) / distance * 0.5;
    const controlY1 = sourceY + (targetY - sourceY) * 0.25 + (dx * offset) / distance * 0.5;
    const controlX2 = sourceX + (targetX - sourceX) * 0.75 + (dy * offset) / distance * 0.5;
    const controlY2 = sourceY + (targetY - sourceY) * 0.75 - (dx * offset) / distance * 0.5;
    path = `M ${sourceX},${sourceY} C ${controlX1},${controlY1} ${controlX2},${controlY2} ${targetX},${targetY}`;
  } else {
    // Curved (default) - smooth bezier curve
    const midX = (sourceX + targetX) / 2;
    const midY = (sourceY + targetY) / 2;
    const offset = distance * 0.2;
    const controlX = midX - (dy * offset) / distance;
    const controlY = midY + (dx * offset) / distance;
    path = `M ${sourceX},${sourceY} Q ${controlX},${controlY} ${targetX},${targetY}`;
  }

  // ============================================================================
  // LABEL LOGIC
  // ============================================================================

  const showLabel = !isEditing && (currentLayout === 'hierarchical' || isHovered);

  const getLabelText = () => {
    let labelText = link.label || '';
    const metadata = link.metadata || {};

    // Add metadata annotations for hierarchical mode
    if (currentLayout === 'hierarchical' && Object.keys(metadata).length > 0) {
      if (metadata.amount) labelText += ` (₹${metadata.amount})`;
      else if (metadata.frequency) labelText += ` (${metadata.frequency}x)`;
      else if (metadata.duration) labelText += ` (${metadata.duration}s)`;
      else if (metadata.confidence) labelText += ` (${Math.round(metadata.confidence * 100)}%)`;
    }

    return labelText;
  };

  const labelText = getLabelText();
  const labelWidth = Math.max(labelText.length * 7, 80);
  const midX = (sourceNode.x + targetNode.x) / 2;
  const midY = (sourceNode.y + targetNode.y) / 2;

  // ============================================================================
  // RENDER
  // ============================================================================

  return (
    <g key={link.id}>
      {/* Invisible thick hitbox for easy clicking */}
      <path
        d={path}
        fill="none"
        stroke="transparent"
        strokeWidth="20"
        style={{ cursor: 'pointer' }}
        onContextMenu={(e) => onContextMenu(e, link)}
        onDoubleClick={() => onDoubleClick(link)}
        onMouseEnter={() => onMouseEnter(link.id)}
        onMouseLeave={onMouseLeave}
      />

      {/* Link Line - Visible - Layer-colored or Dark Grey */}
      <path
        d={path}
        fill="none"
        stroke={isHighlighted ? linkColor : hasLayerData ? linkColor : '#4B5563'}
        strokeWidth={isHighlighted ? '4' : hasLayerData ? '2.5' : '2'}
        opacity={isHighlighted ? 1 : hasHighlightedLinks ? 0.2 : 1}
        markerEnd="url(#arrowhead)"
        style={{ transition: 'all 0.3s', pointerEvents: 'none' }}
      />

      {/* Label */}
      {showLabel && labelText && (
        <>
          {/* Background for label */}
          <rect
            x={midX - labelWidth / 2}
            y={midY - 16}
            width={labelWidth}
            height="22"
            rx="4"
            fill={currentLayout === 'hierarchical' ? '#2D3748' : '#1E293B'}
            opacity={currentLayout === 'hierarchical' ? '0.85' : '0.95'}
            filter="drop-shadow(0 1px 3px rgba(0,0,0,0.2))"
          />
          {/* Label text */}
          <text
            x={midX}
            y={midY - 3}
            textAnchor="middle"
            fill="#E2E8F0"
            fontSize="10"
            fontWeight="500"
            style={{
              pointerEvents: 'none',
              letterSpacing: '0.3px',
              fontFamily: 'system-ui, -apple-system, sans-serif',
            }}
          >
            {labelText}
          </text>
        </>
      )}

      {/* Edit dropdown */}
      {isEditing && (
        <foreignObject
          x={midX - 100}
          y={midY - 20}
          width="200"
          height="100"
        >
          <select
            value={editLinkValue}
            onChange={(e) => {
              onEditValueChange(e.target.value);
              onLabelUpdate(link.id, e.target.value);
            }}
            onBlur={onEditEnd}
            autoFocus
            className="w-full px-2 py-1.5 text-xs border-2 border-slate-500 rounded bg-white shadow-xl focus:outline-none focus:ring-2 focus:ring-slate-500"
            style={{ fontSize: '11px' }}
          >
            <option value="">-- Select Type --</option>
            {relationshipTypes.map((type) => (
              <option key={type.value} value={type.value}>
                {type.label}
              </option>
            ))}
          </select>
        </foreignObject>
      )}
    </g>
  );
};

// ============================================================================
// DEFAULT EXPORT
// ============================================================================

export default LinkRenderer;
