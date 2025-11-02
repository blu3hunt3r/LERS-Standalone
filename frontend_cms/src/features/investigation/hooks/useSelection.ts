/**
 * Phase 5, Feature 2, Phase 2: useSelection Hook
 *
 * Manages node selection and highlighting with multi-select support.
 * Extracted from InvestigationWorkbenchTab.tsx (lines 186-189, 509-557, 662-679, 777-791).
 */

import { useState, useCallback, useEffect } from 'react';
import type { Node, Link } from '../types';
import { getNeighbors, getDownstreamNodes, getUpstreamNodes } from '../utils/geometryUtils';

// ============================================================================
// TYPES
// ============================================================================

export interface UseSelectionOptions {
  /** Graph nodes */
  nodes: Node[];
  /** Graph links */
  links: Link[];
  /** Enable search highlighting (default: true) */
  enableSearch?: boolean;
  /** Callback when selection changes */
  onSelectionChange?: (selectedNodeIds: Set<string>) => void;
  /** Callback when highlighted nodes change */
  onHighlightChange?: (highlightedNodeIds: Set<string>) => void;
}

export interface UseSelectionReturn {
  /** Currently selected nodes */
  selectedNodes: Set<string>;
  /** Set selected nodes directly */
  setSelectedNodes: (nodes: Set<string> | ((prev: Set<string>) => Set<string>)) => void;
  /** Currently highlighted nodes (from search) */
  highlightedNodes: Set<string>;
  /** Set highlighted nodes directly */
  setHighlightedNodes: (nodes: Set<string> | ((prev: Set<string>) => Set<string>)) => void;
  /** Search query */
  searchQuery: string;
  /** Set search query */
  setSearchQuery: (query: string) => void;
  /** Handle node click (single or multi-select) */
  handleNodeClick: (nodeId: string, event: { ctrlKey: boolean; metaKey: boolean }) => void;
  /** Handle multi-select with Ctrl/Cmd */
  handleNodeMultiSelect: (nodeId: string, isCtrlPressed: boolean) => void;
  /** Clear all selections */
  clearSelection: () => void;
  /** Select all nodes */
  selectAll: () => void;
  /** Invert selection */
  invertSelection: () => void;
  /** Select neighbors of a node */
  selectNeighbors: (nodeId: string, direction?: 'all' | 'incoming' | 'outgoing') => void;
  /** Select nodes in a path */
  selectPath: (startNodeId: string, endNodeId: string) => void;
  /** Select nodes by IDs */
  selectNodes: (nodeIds: string[]) => void;
  /** Deselect nodes by IDs */
  deselectNodes: (nodeIds: string[]) => void;
  /** Toggle node selection */
  toggleNode: (nodeId: string) => void;
  /** Check if node is selected */
  isNodeSelected: (nodeId: string) => boolean;
  /** Check if node is highlighted */
  isNodeHighlighted: (nodeId: string) => boolean;
  /** Get selection stats */
  selectionStats: {
    selectedCount: number;
    highlightedCount: number;
    totalCount: number;
  };
}

// ============================================================================
// HOOK
// ============================================================================

/**
 * Custom hook for managing node selection and highlighting
 *
 * @param options - Configuration options
 * @returns Selection state and control functions
 *
 * @example
 * ```typescript
 * const {
 *   selectedNodes,
 *   highlightedNodes,
 *   searchQuery,
 *   setSearchQuery,
 *   handleNodeClick,
 *   selectAll,
 *   clearSelection,
 * } = useSelection({
 *   nodes: graphNodes,
 *   links: graphLinks,
 *   onSelectionChange: (selected) => {
 *     console.log('Selected:', selected.size);
 *   },
 * });
 *
 * // Handle node clicks
 * <circle
 *   onClick={(e) => handleNodeClick(node.id, e)}
 *   className={selectedNodes.has(node.id) ? 'selected' : ''}
 * />
 *
 * // Search
 * <input
 *   value={searchQuery}
 *   onChange={(e) => setSearchQuery(e.target.value)}
 * />
 * ```
 */
export function useSelection(options: UseSelectionOptions): UseSelectionReturn {
  const {
    nodes,
    links,
    enableSearch = true,
    onSelectionChange,
    onHighlightChange,
  } = options;

  // ============================================================================
  // STATE
  // ============================================================================

  const [selectedNodes, setSelectedNodesInternal] = useState<Set<string>>(new Set());
  const [highlightedNodes, setHighlightedNodesInternal] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState<string>('');

  // ============================================================================
  // WRAPPED SETTERS WITH CALLBACKS
  // ============================================================================

  const setSelectedNodes = useCallback((
    value: Set<string> | ((prev: Set<string>) => Set<string>)
  ) => {
    setSelectedNodesInternal(prev => {
      const newValue = typeof value === 'function' ? value(prev) : value;
      if (onSelectionChange) {
        onSelectionChange(newValue);
      }
      return newValue;
    });
  }, [onSelectionChange]);

  const setHighlightedNodes = useCallback((
    value: Set<string> | ((prev: Set<string>) => Set<string>)
  ) => {
    setHighlightedNodesInternal(prev => {
      const newValue = typeof value === 'function' ? value(prev) : value;
      if (onHighlightChange) {
        onHighlightChange(newValue);
      }
      return newValue;
    });
  }, [onHighlightChange]);

  // ============================================================================
  // SEARCH HIGHLIGHTING
  // ============================================================================

  useEffect(() => {
    if (!enableSearch) return;

    if (searchQuery.trim()) {
      const matches = new Set<string>();
      const lowerQuery = searchQuery.toLowerCase();

      nodes.forEach(node => {
        // Search in label, type, and metadata
        const searchableText = [
          node.label,
          node.type,
          JSON.stringify(node.metadata || {}),
        ].join(' ').toLowerCase();

        if (searchableText.includes(lowerQuery)) {
          matches.add(node.id);
        }
      });

      setHighlightedNodes(matches);
    } else {
      setHighlightedNodes(new Set());
    }
  }, [searchQuery, nodes, enableSearch, setHighlightedNodes]);

  // ============================================================================
  // SELECTION HANDLERS
  // ============================================================================

  /**
   * Handle node click with optional multi-select
   */
  const handleNodeClick = useCallback((
    nodeId: string,
    event: { ctrlKey: boolean; metaKey: boolean }
  ) => {
    if (event.ctrlKey || event.metaKey) {
      // Multi-select mode
      handleNodeMultiSelect(nodeId, true);
    } else {
      // Single select mode
      setSelectedNodes(new Set([nodeId]));
    }
  }, []);

  /**
   * Handle multi-select with Ctrl/Cmd key
   */
  const handleNodeMultiSelect = useCallback((
    nodeId: string,
    isCtrlPressed: boolean
  ) => {
    if (isCtrlPressed) {
      setSelectedNodes(prev => {
        const newSet = new Set(prev);
        if (newSet.has(nodeId)) {
          newSet.delete(nodeId);
        } else {
          newSet.add(nodeId);
        }
        return newSet;
      });
    } else {
      setSelectedNodes(new Set([nodeId]));
    }
  }, [setSelectedNodes]);

  /**
   * Clear all selections
   */
  const clearSelection = useCallback(() => {
    setSelectedNodes(new Set());
  }, [setSelectedNodes]);

  /**
   * Select all nodes
   */
  const selectAll = useCallback(() => {
    setSelectedNodes(new Set(nodes.map(n => n.id)));
  }, [nodes, setSelectedNodes]);

  /**
   * Invert selection
   */
  const invertSelection = useCallback(() => {
    setSelectedNodes(prev => {
      const inverted = new Set<string>();
      nodes.forEach(node => {
        if (!prev.has(node.id)) {
          inverted.add(node.id);
        }
      });
      return inverted;
    });
  }, [nodes, setSelectedNodes]);

  /**
   * Select neighbors of a node (Maltego-style)
   */
  const selectNeighbors = useCallback((
    nodeId: string,
    direction: 'all' | 'incoming' | 'outgoing' = 'all'
  ) => {
    let neighbors: Set<string>;

    if (direction === 'all') {
      neighbors = getNeighbors(nodeId, links);
    } else if (direction === 'incoming') {
      neighbors = getUpstreamNodes(nodeId, links, 1);
    } else {
      neighbors = getDownstreamNodes(nodeId, links, 1);
    }

    setSelectedNodes(prev => new Set([...prev, ...neighbors]));
  }, [links, setSelectedNodes]);

  /**
   * Select nodes in a path (simplified - selects all nodes between start and end)
   */
  const selectPath = useCallback((
    startNodeId: string,
    endNodeId: string
  ) => {
    // Find shortest path using BFS
    const queue: Array<{ id: string; path: string[] }> = [
      { id: startNodeId, path: [startNodeId] }
    ];
    const visited = new Set<string>([startNodeId]);

    while (queue.length > 0) {
      const { id: currentId, path } = queue.shift()!;

      if (currentId === endNodeId) {
        // Found path, select all nodes in it
        setSelectedNodes(new Set(path));
        return;
      }

      // Explore neighbors
      const neighbors = getNeighbors(currentId, links);
      neighbors.forEach(neighborId => {
        if (!visited.has(neighborId)) {
          visited.add(neighborId);
          queue.push({
            id: neighborId,
            path: [...path, neighborId]
          });
        }
      });
    }

    // No path found
    console.warn(`No path found between ${startNodeId} and ${endNodeId}`);
  }, [links, setSelectedNodes]);

  /**
   * Select nodes by IDs
   */
  const selectNodes = useCallback((nodeIds: string[]) => {
    setSelectedNodes(prev => new Set([...prev, ...nodeIds]));
  }, [setSelectedNodes]);

  /**
   * Deselect nodes by IDs
   */
  const deselectNodes = useCallback((nodeIds: string[]) => {
    setSelectedNodes(prev => {
      const newSet = new Set(prev);
      nodeIds.forEach(id => newSet.delete(id));
      return newSet;
    });
  }, [setSelectedNodes]);

  /**
   * Toggle node selection
   */
  const toggleNode = useCallback((nodeId: string) => {
    setSelectedNodes(prev => {
      const newSet = new Set(prev);
      if (newSet.has(nodeId)) {
        newSet.delete(nodeId);
      } else {
        newSet.add(nodeId);
      }
      return newSet;
    });
  }, [setSelectedNodes]);

  /**
   * Check if node is selected
   */
  const isNodeSelected = useCallback((nodeId: string) => {
    return selectedNodes.has(nodeId);
  }, [selectedNodes]);

  /**
   * Check if node is highlighted
   */
  const isNodeHighlighted = useCallback((nodeId: string) => {
    return highlightedNodes.has(nodeId);
  }, [highlightedNodes]);

  // ============================================================================
  // STATS
  // ============================================================================

  const selectionStats = {
    selectedCount: selectedNodes.size,
    highlightedCount: highlightedNodes.size,
    totalCount: nodes.length,
  };

  // ============================================================================
  // RETURN
  // ============================================================================

  return {
    selectedNodes,
    setSelectedNodes,
    highlightedNodes,
    setHighlightedNodes,
    searchQuery,
    setSearchQuery,
    handleNodeClick,
    handleNodeMultiSelect,
    clearSelection,
    selectAll,
    invertSelection,
    selectNeighbors,
    selectPath,
    selectNodes,
    deselectNodes,
    toggleNode,
    isNodeSelected,
    isNodeHighlighted,
    selectionStats,
  };
}

// ============================================================================
// UTILITY HOOKS
// ============================================================================

/**
 * Hook for keyboard shortcuts related to selection
 *
 * @param selection - Selection hook return value
 * @returns Cleanup function
 *
 * @example
 * ```typescript
 * const selection = useSelection({ nodes, links });
 * useSelectionKeyboard(selection);
 *
 * // Now Ctrl+A, Escape, etc. work automatically
 * ```
 */
export function useSelectionKeyboard(selection: UseSelectionReturn) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl/Cmd + A: Select all
      if ((e.ctrlKey || e.metaKey) && e.key === 'a') {
        e.preventDefault();
        selection.selectAll();
      }

      // Escape: Clear selection
      if (e.key === 'Escape') {
        selection.clearSelection();
      }

      // Ctrl/Cmd + I: Invert selection
      if ((e.ctrlKey || e.metaKey) && e.key === 'i') {
        e.preventDefault();
        selection.invertSelection();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selection]);
}

/**
 * Hook for drag-select box selection
 *
 * @param nodes - All nodes
 * @param onSelect - Callback when selection is made
 * @returns Drag-select state and handlers
 *
 * @example
 * ```typescript
 * const dragSelect = useDragSelect(nodes, (selectedIds) => {
 *   setSelectedNodes(new Set(selectedIds));
 * });
 *
 * <svg
 *   onMouseDown={dragSelect.handleMouseDown}
 *   onMouseMove={dragSelect.handleMouseMove}
 *   onMouseUp={dragSelect.handleMouseUp}
 * >
 *   {dragSelect.box && (
 *     <rect {...dragSelect.box} fill="rgba(0,0,255,0.1)" />
 *   )}
 * </svg>
 * ```
 */
export function useDragSelect(
  nodes: Node[],
  onSelect: (nodeIds: string[]) => void
) {
  const [dragStart, setDragStart] = useState<{ x: number; y: number } | null>(null);
  const [dragEnd, setDragEnd] = useState<{ x: number; y: number } | null>(null);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button !== 0) return; // Left button only
    if (!e.ctrlKey && !e.metaKey) return; // Require Ctrl/Cmd

    setDragStart({ x: e.clientX, y: e.clientY });
    setDragEnd(null);
  }, []);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!dragStart) return;

    setDragEnd({ x: e.clientX, y: e.clientY });
  }, [dragStart]);

  const handleMouseUp = useCallback(() => {
    if (!dragStart || !dragEnd) {
      setDragStart(null);
      setDragEnd(null);
      return;
    }

    // Calculate selection box
    const minX = Math.min(dragStart.x, dragEnd.x);
    const maxX = Math.max(dragStart.x, dragEnd.x);
    const minY = Math.min(dragStart.y, dragEnd.y);
    const maxY = Math.max(dragStart.y, dragEnd.y);

    // Find nodes within box (assumes nodes have screen coordinates)
    const selectedIds = nodes
      .filter(node => {
        // You'll need to transform node.x, node.y to screen coordinates
        // This is a simplified version
        const x = node.x ?? 0;
        const y = node.y ?? 0;
        return x >= minX && x <= maxX && y >= minY && y <= maxY;
      })
      .map(node => node.id);

    onSelect(selectedIds);

    setDragStart(null);
    setDragEnd(null);
  }, [dragStart, dragEnd, nodes, onSelect]);

  const box = dragStart && dragEnd ? {
    x: Math.min(dragStart.x, dragEnd.x),
    y: Math.min(dragStart.y, dragEnd.y),
    width: Math.abs(dragEnd.x - dragStart.x),
    height: Math.abs(dragEnd.y - dragStart.y),
  } : null;

  return {
    box,
    isDragging: !!dragStart,
    handleMouseDown,
    handleMouseMove,
    handleMouseUp,
  };
}
