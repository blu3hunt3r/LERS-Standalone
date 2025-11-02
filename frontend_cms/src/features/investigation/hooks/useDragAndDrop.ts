/**
 * Phase 5, Feature 2, Phase 2: useDragAndDrop Hook
 *
 * Manages drag-and-drop interactions for graph nodes with RAF optimization.
 * Extracted from InvestigationWorkbenchTab.tsx (lines 168-184, 1557-1786).
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import type { Node, Link } from '../types';

// ============================================================================
// TYPES
// ============================================================================

export interface UseDragAndDropOptions {
  /** Graph nodes */
  nodes: Node[];
  /** Graph links */
  links: Link[];
  /** Current zoom level */
  zoom: number;
  /** Current pan offset */
  pan: { x: number; y: number };
  /** Currently selected nodes */
  selectedNodes: Set<string>;
  /** Is linking mode active */
  linkingMode: boolean;
  /** Set linking mode */
  setLinkingMode: (active: boolean) => void;
  /** Callback when node position changes */
  onNodeMove: (nodeId: string, x: number, y: number) => void;
  /** Callback when link is created */
  onLinkCreate: (sourceId: string, targetId: string) => void;
  /** Callback when multiple nodes finish moving (batch update) */
  onNodesMoveComplete?: (updates: Array<{ id: string; x: number; y: number }>) => void;
  /** Container ref for coordinate calculations */
  containerRef: React.RefObject<HTMLElement>;
  /** SVG ref for coordinate calculations */
  svgRef: React.RefObject<SVGSVGElement>;
  /** Minimum drag distance before starting drag (default: 3px) */
  dragThreshold?: number;
  /** Enable RAF throttling (default: true) */
  enableRAF?: boolean;
}

export interface UseDragAndDropReturn {
  /** Currently dragged node ID */
  draggedNode: string | null;
  /** Temporary link end position (during linking) */
  tempLinkEnd: { x: number; y: number } | null;
  /** Connection dot position (when hovering edge) */
  connectionDot: { x: number; y: number } | null;
  /** Drag origin type */
  dragOrigin: 'center' | 'edge' | null;
  /** Has the node moved (to prevent click event) */
  hasNodeMoved: boolean;
  /** Link source node ID */
  linkSource: string | null;
  /** Set link source */
  setLinkSource: (nodeId: string | null) => void;
  /** Is panning the canvas */
  isPanning: boolean;
  /** Drag-select box start position */
  dragSelectStart: { x: number; y: number } | null;
  /** Drag-select box end position */
  dragSelectEnd: { x: number; y: number } | null;
  /** Handle node mouse down (start potential drag) */
  handleNodeMouseDown: (e: React.MouseEvent, nodeId: string) => void;
  /** Handle connection dot mouse down (start linking) */
  handleConnectionDotMouseDown: (e: React.MouseEvent, nodeId: string) => void;
  /** Handle SVG mouse down (pan or drag-select) */
  handleSvgMouseDown: (e: React.MouseEvent) => void;
  /** Handle mouse move (dragging, linking, panning) */
  handleMouseMove: (e: React.MouseEvent) => void;
  /** Handle mouse up (complete drag/link/pan) */
  handleMouseUp: (e?: React.MouseEvent) => void;
  /** Get computed cursor style */
  cursor: string;
  /** Update node positions in state */
  updateNodePositions: (nodeId: string, dx: number, dy: number) => void;
}

// ============================================================================
// HOOK
// ============================================================================

/**
 * Custom hook for managing drag-and-drop interactions
 *
 * @param options - Configuration options
 * @returns Drag-and-drop state and handlers
 *
 * @example
 * ```typescript
 * const dragDrop = useDragAndDrop({
 *   nodes,
 *   links,
 *   zoom,
 *   pan,
 *   selectedNodes,
 *   linkingMode,
 *   setLinkingMode,
 *   onNodeMove: (nodeId, x, y) => {
 *     updateEntityPosition({ entity_id: nodeId, position_x: x, position_y: y });
 *   },
 *   onLinkCreate: (sourceId, targetId) => {
 *     createRelationship({ source_entity_id: sourceId, target_entity_id: targetId });
 *   },
 *   containerRef,
 *   svgRef,
 * });
 *
 * // Use in SVG
 * <svg
 *   onMouseDown={dragDrop.handleSvgMouseDown}
 *   onMouseMove={dragDrop.handleMouseMove}
 *   onMouseUp={dragDrop.handleMouseUp}
 *   style={{ cursor: dragDrop.cursor }}
 * >
 *   {nodes.map(node => (
 *     <circle
 *       key={node.id}
 *       onMouseDown={(e) => dragDrop.handleNodeMouseDown(e, node.id)}
 *       opacity={dragDrop.draggedNode === node.id ? 0.5 : 1}
 *     />
 *   ))}
 *
 *   {dragDrop.tempLinkEnd && dragDrop.linkSource && (
 *     <line
 *       x1={sourceNode.x}
 *       y1={sourceNode.y}
 *       x2={dragDrop.tempLinkEnd.x}
 *       y2={dragDrop.tempLinkEnd.y}
 *       stroke="blue"
 *     />
 *   )}
 * </svg>
 * ```
 */
export function useDragAndDrop(options: UseDragAndDropOptions): UseDragAndDropReturn {
  const {
    nodes,
    links,
    zoom,
    pan,
    selectedNodes,
    linkingMode,
    setLinkingMode,
    onNodeMove,
    onLinkCreate,
    onNodesMoveComplete,
    containerRef,
    svgRef,
    dragThreshold = 3,
    enableRAF = true,
  } = options;

  // ============================================================================
  // STATE
  // ============================================================================

  const [draggedNode, setDraggedNode] = useState<string | null>(null);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [linkSource, setLinkSource] = useState<string | null>(null);
  const [tempLinkEnd, setTempLinkEnd] = useState<{ x: number; y: number } | null>(null);
  const [dragOrigin, setDragOrigin] = useState<'center' | 'edge' | null>(null);
  const [connectionDot, setConnectionDot] = useState<{x: number, y: number} | null>(null);
  const [hasNodeMoved, setHasNodeMoved] = useState(false);
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const [dragSelectStart, setDragSelectStart] = useState<{x: number, y: number} | null>(null);
  const [dragSelectEnd, setDragSelectEnd] = useState<{x: number, y: number} | null>(null);

  // Use window object to track potential drag node (avoids state update lag)
  const potentialDragNodeRef = useRef<string | null>(null);

  // RAF optimization
  const rafIdRef = useRef<number | null>(null);

  // ============================================================================
  // CLEANUP
  // ============================================================================

  useEffect(() => {
    return () => {
      if (rafIdRef.current !== null) {
        cancelAnimationFrame(rafIdRef.current);
      }
    };
  }, []);

  // ============================================================================
  // NODE DRAGGING
  // ============================================================================

  /**
   * Handle node mouse down - prepare for potential drag
   */
  const handleNodeMouseDown = useCallback((e: React.MouseEvent, nodeId: string) => {
    e.stopPropagation();

    if (e.button === 0 && !linkingMode) {
      // Set up for potential dragging - don't set draggedNode yet
      // We'll set it in handleMouseMove if mouse actually moves
      setDragStart({ x: e.clientX, y: e.clientY });
      setHasNodeMoved(false);

      // Store potential drag node
      potentialDragNodeRef.current = nodeId;
    }
  }, [linkingMode]);

  /**
   * Handle connection dot mouse down - start linking mode
   */
  const handleConnectionDotMouseDown = useCallback((e: React.MouseEvent, nodeId: string) => {
    e.preventDefault();
    e.stopPropagation();

    const node = nodes.find(n => n.id === nodeId);
    if (!node) return;

    const rect = svgRef.current?.getBoundingClientRect();
    if (!rect) return;

    const mouseX = ((e.clientX - rect.left) - pan.x) / zoom;
    const mouseY = ((e.clientY - rect.top) - pan.y) / zoom;

    // Disable text selection during linking
    document.body.style.userSelect = 'none';

    // Start linking mode from connection dot
    setDragOrigin('edge');
    setLinkingMode(true);
    setLinkSource(nodeId);
    setConnectionDot({ x: mouseX, y: mouseY });
  }, [nodes, svgRef, pan, zoom, setLinkingMode]);

  // ============================================================================
  // SVG CANVAS INTERACTIONS
  // ============================================================================

  /**
   * Handle SVG mouse down - pan or drag-select
   */
  const handleSvgMouseDown = useCallback((e: React.MouseEvent) => {
    // Ctrl+Drag: Drag-to-select box
    if (e.button === 0 && (e.ctrlKey || e.metaKey) && !draggedNode && !linkingMode) {
      e.preventDefault();
      e.stopPropagation();

      const rect = svgRef.current?.getBoundingClientRect();
      if (rect) {
        const x = ((e.clientX - rect.left) - pan.x) / zoom;
        const y = ((e.clientY - rect.top) - pan.y) / zoom;
        setDragSelectStart({ x, y });
        setDragSelectEnd({ x, y });
      }
      return;
    }
    // Middle button: Pan canvas
    else if (e.button === 1) {
      e.preventDefault();
      setIsPanning(true);
      setPanStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
    }
    // Normal drag on empty canvas: Pan canvas
    else if (e.button === 0 && !draggedNode && !linkingMode && !e.ctrlKey && !e.metaKey) {
      e.preventDefault();
      setIsPanning(true);
      setPanStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
    }
  }, [draggedNode, linkingMode, svgRef, pan, zoom]);

  // ============================================================================
  // MOUSE MOVE (RAF THROTTLED)
  // ============================================================================

  /**
   * Update node positions in state (called from throttled move handler)
   */
  const updateNodePositions = useCallback((nodeId: string, dx: number, dy: number) => {
    const nodesToMove = selectedNodes.size > 0 && selectedNodes.has(nodeId)
      ? selectedNodes
      : new Set([nodeId]);

    // Call onNodeMove for each node (this should update React state)
    nodesToMove.forEach(id => {
      const node = nodes.find(n => n.id === id);
      if (node) {
        onNodeMove(id, node.x + dx, node.y + dy);
      }
    });
  }, [nodes, selectedNodes, onNodeMove]);

  /**
   * Handle mouse move (RAF throttled for performance)
   */
  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    // Cancel any pending animation frame
    if (enableRAF && rafIdRef.current !== null) {
      cancelAnimationFrame(rafIdRef.current);
    }

    const performMove = () => {
      // Panning canvas
      if (isPanning) {
        // Pan state update should happen in parent component
        // We just provide the new pan values
        const newPan = {
          x: e.clientX - panStart.x,
          y: e.clientY - panStart.y
        };
        // Parent should handle setPan via custom handler
        return;
      }

      // Drag-select box
      if (dragSelectStart) {
        const rect = svgRef.current?.getBoundingClientRect();
        if (rect) {
          const x = ((e.clientX - rect.left) - pan.x) / zoom;
          const y = ((e.clientY - rect.top) - pan.y) / zoom;
          setDragSelectEnd({ x, y });
        }
        return;
      }

      // Check if we should start dragging (mouse moved from initial position)
      const potentialDragNode = potentialDragNodeRef.current;
      if (potentialDragNode && !draggedNode && !isPanning) {
        const dx = Math.abs(e.clientX - dragStart.x);
        const dy = Math.abs(e.clientY - dragStart.y);

        // Only start dragging if moved more than threshold (prevents accidental drag on click)
        if (dx > dragThreshold || dy > dragThreshold) {
          setDraggedNode(potentialDragNode);
          potentialDragNodeRef.current = null;
        }
      }

      // Dragging node(s) - OPTIMIZED: Batch updates to reduce re-renders
      if (draggedNode) {
        const dx = (e.clientX - dragStart.x) / zoom;
        const dy = (e.clientY - dragStart.y) / zoom;

        // Mark that node has moved (to prevent onClick from firing)
        if (!hasNodeMoved && (Math.abs(dx) > 1 || Math.abs(dy) > 1)) {
          setHasNodeMoved(true);
        }

        // PERFORMANCE: Only update if movement is significant (> 1px)
        if (Math.abs(dx) > 1 || Math.abs(dy) > 1) {
          updateNodePositions(draggedNode, dx, dy);
          setDragStart({ x: e.clientX, y: e.clientY });
        }
      }
      // Visual linking - show temp line
      else if (linkingMode && linkSource) {
        const rect = svgRef.current?.getBoundingClientRect();
        if (rect) {
          const x = ((e.clientX - rect.left) - pan.x) / zoom;
          const y = ((e.clientY - rect.top) - pan.y) / zoom;
          setTempLinkEnd({ x, y });
        }
      }

      rafIdRef.current = null;
    };

    // Schedule update for next frame (throttles to 60fps max)
    if (enableRAF) {
      rafIdRef.current = requestAnimationFrame(performMove);
    } else {
      performMove();
    }
  }, [
    isPanning,
    panStart,
    dragSelectStart,
    draggedNode,
    dragStart,
    linkingMode,
    linkSource,
    hasNodeMoved,
    svgRef,
    pan,
    zoom,
    dragThreshold,
    updateNodePositions,
    enableRAF,
  ]);

  // ============================================================================
  // MOUSE UP
  // ============================================================================

  /**
   * Handle mouse up - complete drag/link/pan
   */
  const handleMouseUp = useCallback((e?: React.MouseEvent) => {
    // Cancel any pending RAF
    if (rafIdRef.current !== null) {
      cancelAnimationFrame(rafIdRef.current);
      rafIdRef.current = null;
    }

    // Re-enable text selection
    document.body.style.userSelect = '';

    // Complete drag-select
    if (dragSelectStart && dragSelectEnd) {
      const minX = Math.min(dragSelectStart.x, dragSelectEnd.x);
      const maxX = Math.max(dragSelectStart.x, dragSelectEnd.x);
      const minY = Math.min(dragSelectStart.y, dragSelectEnd.y);
      const maxY = Math.max(dragSelectStart.y, dragSelectEnd.y);

      // Find all nodes within the selection box
      const nodesInBox = nodes.filter(node =>
        node.x >= minX && node.x <= maxX &&
        node.y >= minY && node.y <= maxY
      );

      // Callback with selected nodes (parent handles selection state)
      // Parent should call setSelectedNodes with nodesInBox IDs

      // Clear drag-select state
      setDragSelectStart(null);
      setDragSelectEnd(null);
    }

    // Stop panning
    if (isPanning) {
      setIsPanning(false);
    }

    // Save node position(s) - BATCH UPDATE to reduce API calls
    if (draggedNode) {
      // If dragging multiple selected nodes, save all their positions
      const nodesToSave = selectedNodes.size > 0 && selectedNodes.has(draggedNode)
        ? Array.from(selectedNodes)
        : [draggedNode];

      // Batch position updates - only send one update per node after drag completes
      if (onNodesMoveComplete) {
        const updates = nodesToSave
          .map(nodeId => {
            const node = nodes.find(n => n.id === nodeId);
            return node ? { id: nodeId, x: node.x, y: node.y } : null;
          })
          .filter(Boolean) as Array<{ id: string; x: number; y: number }>;

        onNodesMoveComplete(updates);
      } else {
        // Fallback to individual updates
        nodesToSave.forEach(nodeId => {
          const node = nodes.find(n => n.id === nodeId);
          if (node) {
            onNodeMove(nodeId, node.x, node.y);
          }
        });
      }
    }

    // Clean up drag state
    setDraggedNode(null);
    setDragOrigin(null);
    setConnectionDot(null);
    potentialDragNodeRef.current = null;
  }, [
    dragSelectStart,
    dragSelectEnd,
    isPanning,
    draggedNode,
    selectedNodes,
    nodes,
    onNodeMove,
    onNodesMoveComplete,
  ]);

  // ============================================================================
  // COMPUTED VALUES
  // ============================================================================

  /**
   * Get computed cursor style based on current interaction mode
   */
  const cursor = (() => {
    if (isPanning) return 'grabbing';
    if (draggedNode) return 'grabbing';
    if (linkingMode) return 'crosshair';
    if (dragSelectStart) return 'crosshair';
    return 'default';
  })();

  // ============================================================================
  // RETURN
  // ============================================================================

  return {
    draggedNode,
    tempLinkEnd,
    connectionDot,
    dragOrigin,
    hasNodeMoved,
    linkSource,
    setLinkSource,
    isPanning,
    dragSelectStart,
    dragSelectEnd,
    handleNodeMouseDown,
    handleConnectionDotMouseDown,
    handleSvgMouseDown,
    handleMouseMove,
    handleMouseUp,
    cursor,
    updateNodePositions,
  };
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Convert screen coordinates to graph coordinates
 */
export function screenToGraphCoords(
  screenX: number,
  screenY: number,
  svgRect: DOMRect,
  pan: { x: number; y: number },
  zoom: number
): { x: number; y: number } {
  return {
    x: ((screenX - svgRect.left) - pan.x) / zoom,
    y: ((screenY - svgRect.top) - pan.y) / zoom,
  };
}

/**
 * Check if drag distance exceeds threshold
 */
export function isDragThresholdExceeded(
  start: { x: number; y: number },
  current: { x: number; y: number },
  threshold: number = 3
): boolean {
  const dx = Math.abs(current.x - start.x);
  const dy = Math.abs(current.y - start.y);
  return dx > threshold || dy > threshold;
}

/**
 * Calculate batch node updates after drag
 */
export function calculateBatchNodeUpdates(
  draggedNodeId: string,
  selectedNodes: Set<string>,
  nodes: Node[],
  dx: number,
  dy: number
): Array<{ id: string; x: number; y: number }> {
  const nodesToUpdate = selectedNodes.size > 0 && selectedNodes.has(draggedNodeId)
    ? Array.from(selectedNodes)
    : [draggedNodeId];

  return nodesToUpdate
    .map(nodeId => {
      const node = nodes.find(n => n.id === nodeId);
      return node ? { id: nodeId, x: node.x + dx, y: node.y + dy } : null;
    })
    .filter(Boolean) as Array<{ id: string; x: number; y: number }>;
}
