/**
 * Phase 5, Feature 2, Phase 2: useFilters Hook
 *
 * Manages graph filtering with viewport culling for performance.
 * Extracted from InvestigationWorkbenchTab.tsx (lines 202-211, 682-774).
 */

import { useState, useMemo, useCallback } from 'react';
import type { Node, Link } from '../types';

// ============================================================================
// TYPES
// ============================================================================

export interface GraphFilters {
  /** Filter by entity types */
  entityTypes: string[];
  /** Filter by risk levels */
  riskLevels: string[];
  /** Minimum confidence level (0-100) */
  minConfidence: number;
  /** Filter by date from */
  dateFrom: string;
  /** Filter by date to */
  dateTo: string;
  /** Only show nodes with metadata */
  hasMetadata: boolean;
  /** Filter by layers */
  layers: number[];
}

export interface UseFiltersOptions {
  /** Graph nodes */
  nodes: Node[];
  /** Graph links */
  links: Link[];
  /** Visible entity types */
  visibleEntityTypes: Set<string>;
  /** Visible layers */
  visibleLayers: Set<string>;
  /** Layer opacity map */
  layerOpacity: Record<number, number>;
  /** Collapsed layers */
  collapsedLayers?: Set<number>;
  /** Layer preset mode */
  layerPreset?: string;
  /** Available layers */
  availableLayers?: number[];
  /** Current zoom level */
  zoom: number;
  /** Current pan offset */
  pan: { x: number; y: number };
  /** SVG ref for viewport calculations */
  svgRef?: React.RefObject<SVGSVGElement>;
  /** Enable viewport culling (default: true) */
  enableViewportCulling?: boolean;
  /** Viewport culling padding (default: 800px) */
  viewportPadding?: number;
}

export interface UseFiltersReturn {
  /** Current filters */
  filters: GraphFilters;
  /** Set filters (partial update) */
  setFilters: (filters: Partial<GraphFilters>) => void;
  /** Reset all filters */
  resetFilters: () => void;
  /** Filtered nodes (after filters, before viewport culling) */
  filteredNodes: Node[];
  /** Filtered links (only links between filtered nodes) */
  filteredLinks: Link[];
  /** Visible nodes in viewport (after culling) */
  visibleNodesInViewport: Node[];
  /** Visible links in viewport (after culling) */
  visibleLinksInViewport: Link[];
  /** Filter statistics */
  filterStats: {
    totalNodes: number;
    filteredNodes: number;
    visibleNodes: number;
    totalLinks: number;
    filteredLinks: number;
    visibleLinks: number;
    culledNodes: number;
    culledLinks: number;
  };
  /** Check if any filter is active */
  hasActiveFilters: boolean;
  /** Apply specific filter */
  applyFilter: (key: keyof GraphFilters, value: any) => void;
  /** Clear specific filter */
  clearFilter: (key: keyof GraphFilters) => void;
}

// ============================================================================
// DEFAULT FILTERS
// ============================================================================

const DEFAULT_FILTERS: GraphFilters = {
  entityTypes: [],
  riskLevels: [],
  minConfidence: 0,
  dateFrom: '',
  dateTo: '',
  hasMetadata: false,
  layers: [],
};

// ============================================================================
// HOOK
// ============================================================================

/**
 * Custom hook for managing graph filtering and viewport culling
 *
 * @param options - Configuration options
 * @returns Filter state and control functions
 *
 * @example
 * ```typescript
 * const {
 *   filters,
 *   setFilters,
 *   filteredNodes,
 *   filteredLinks,
 *   visibleNodesInViewport,
 *   visibleLinksInViewport,
 *   filterStats,
 *   hasActiveFilters,
 *   resetFilters,
 * } = useFilters({
 *   nodes,
 *   links,
 *   visibleEntityTypes,
 *   visibleLayers,
 *   layerOpacity,
 *   zoom,
 *   pan,
 *   svgRef,
 * });
 *
 * // Set filters
 * setFilters({
 *   entityTypes: ['person', 'account'],
 *   riskLevels: ['high', 'critical'],
 *   minConfidence: 80,
 * });
 *
 * // Render only visible nodes (viewport culling)
 * visibleNodesInViewport.map(node => <NodeComponent node={node} />)
 * ```
 */
export function useFilters(options: UseFiltersOptions): UseFiltersReturn {
  const {
    nodes,
    links,
    visibleEntityTypes,
    visibleLayers,
    layerOpacity,
    collapsedLayers = new Set(),
    layerPreset = 'custom',
    availableLayers = [],
    zoom,
    pan,
    svgRef,
    enableViewportCulling = true,
    viewportPadding = 800,
  } = options;

  // ============================================================================
  // STATE
  // ============================================================================

  const [filters, setFiltersInternal] = useState<GraphFilters>(DEFAULT_FILTERS);

  // ============================================================================
  // FILTER FUNCTIONS
  // ============================================================================

  /**
   * Set filters (partial update)
   */
  const setFilters = useCallback((newFilters: Partial<GraphFilters>) => {
    setFiltersInternal(prev => ({ ...prev, ...newFilters }));
  }, []);

  /**
   * Reset all filters to default
   */
  const resetFilters = useCallback(() => {
    setFiltersInternal(DEFAULT_FILTERS);
  }, []);

  /**
   * Apply specific filter
   */
  const applyFilter = useCallback((key: keyof GraphFilters, value: any) => {
    setFiltersInternal(prev => ({ ...prev, [key]: value }));
  }, []);

  /**
   * Clear specific filter
   */
  const clearFilter = useCallback((key: keyof GraphFilters) => {
    setFiltersInternal(prev => ({
      ...prev,
      [key]: DEFAULT_FILTERS[key],
    }));
  }, []);

  /**
   * Check if any filter is active
   */
  const hasActiveFilters = useMemo(() => {
    return (
      filters.entityTypes.length > 0 ||
      filters.riskLevels.length > 0 ||
      filters.minConfidence > 0 ||
      filters.dateFrom !== '' ||
      filters.dateTo !== '' ||
      filters.hasMetadata ||
      filters.layers.length > 0
    );
  }, [filters]);

  // ============================================================================
  // FILTERED NODES (MEMOIZED)
  // ============================================================================

  const filteredNodes = useMemo(() => {
    return nodes.filter(node => {
      // Visible entity types filter
      if (!visibleEntityTypes.has(node.type)) {
        return false;
      }

      // Entity types filter
      if (filters.entityTypes.length > 0 && !filters.entityTypes.includes(node.type)) {
        return false;
      }

      // Risk levels filter
      if (filters.riskLevels.length > 0 && !filters.riskLevels.includes(node.risk_level || 'low')) {
        return false;
      }

      // Confidence filter
      if (node.entity && node.entity.confidence < filters.minConfidence) {
        return false;
      }

      // Date from filter
      if (filters.dateFrom && node.entity && node.entity.created_at) {
        const nodeDate = new Date(node.entity.created_at);
        const fromDate = new Date(filters.dateFrom);
        if (nodeDate < fromDate) return false;
      }

      // Date to filter
      if (filters.dateTo && node.entity && node.entity.created_at) {
        const nodeDate = new Date(node.entity.created_at);
        const toDate = new Date(filters.dateTo);
        if (nodeDate > toDate) return false;
      }

      // Metadata filter
      if (filters.hasMetadata && (!node.metadata || Object.keys(node.metadata).length === 0)) {
        return false;
      }

      // Layer visibility filter
      if (visibleLayers.size > 0) {
        const layer = node.metadata?.layer;
        if (layer !== undefined && layer !== null) {
          if (!visibleLayers.has(String(layer))) return false;
        }
      }

      // Hide if no layers visible and custom preset
      if (!visibleLayers.size && layerPreset === 'custom' && availableLayers.length > 0) {
        return false;
      }

      return true;
    });
  }, [nodes, visibleEntityTypes, filters, visibleLayers, layerPreset, availableLayers]);

  // ============================================================================
  // FILTERED LINKS (MEMOIZED)
  // ============================================================================

  const filteredLinks = useMemo(() => {
    const visibleNodeIds = new Set(filteredNodes.map(n => n.id));

    return links
      .filter(link =>
        visibleNodeIds.has(link.source) && visibleNodeIds.has(link.target)
      )
      .map(link => {
        // Inject layer opacity into link metadata
        const sourceNode = filteredNodes.find(n => n.id === link.source);
        const targetNode = filteredNodes.find(n => n.id === link.target);
        const layer = targetNode?.metadata?.layer ?? sourceNode?.metadata?.layer;
        const opacity = layer !== undefined && layerOpacity[layer] !== undefined
          ? layerOpacity[layer]
          : 1;

        return {
          ...link,
          metadata: {
            ...link.metadata,
            layer,
            opacity,
          },
        };
      });
  }, [links, filteredNodes, layerOpacity]);

  // ============================================================================
  // VIEWPORT CULLING (MEMOIZED)
  // ============================================================================

  /**
   * Visible nodes in viewport (after culling)
   */
  const visibleNodesInViewport = useMemo(() => {
    if (!enableViewportCulling || !svgRef?.current) {
      return filteredNodes;
    }

    const rect = svgRef.current.getBoundingClientRect();
    const viewportWidth = rect.width;
    const viewportHeight = rect.height;

    // Calculate viewport bounds in graph coordinates with padding
    const minX = (-pan.x) / zoom - viewportPadding;
    const maxX = (-pan.x + viewportWidth) / zoom + viewportPadding;
    const minY = (-pan.y) / zoom - viewportPadding;
    const maxY = (-pan.y + viewportHeight) / zoom + viewportPadding;

    // Only include nodes within viewport bounds
    return filteredNodes.filter(node =>
      node.x >= minX && node.x <= maxX &&
      node.y >= minY && node.y <= maxY
    );
  }, [filteredNodes, pan, zoom, enableViewportCulling, svgRef, viewportPadding]);

  /**
   * Visible links in viewport (after culling)
   */
  const visibleLinksInViewport = useMemo(() => {
    if (!enableViewportCulling) {
      return filteredLinks;
    }

    const visibleNodeIds = new Set(visibleNodesInViewport.map(n => n.id));
    return filteredLinks.filter(link =>
      visibleNodeIds.has(link.source) && visibleNodeIds.has(link.target)
    );
  }, [filteredLinks, visibleNodesInViewport, enableViewportCulling]);

  // ============================================================================
  // STATISTICS
  // ============================================================================

  const filterStats = useMemo(() => {
    return {
      totalNodes: nodes.length,
      filteredNodes: filteredNodes.length,
      visibleNodes: visibleNodesInViewport.length,
      totalLinks: links.length,
      filteredLinks: filteredLinks.length,
      visibleLinks: visibleLinksInViewport.length,
      culledNodes: filteredNodes.length - visibleNodesInViewport.length,
      culledLinks: filteredLinks.length - visibleLinksInViewport.length,
    };
  }, [
    nodes.length,
    filteredNodes.length,
    visibleNodesInViewport.length,
    links.length,
    filteredLinks.length,
    visibleLinksInViewport.length,
  ]);

  // ============================================================================
  // RETURN
  // ============================================================================

  return {
    filters,
    setFilters,
    resetFilters,
    filteredNodes,
    filteredLinks,
    visibleNodesInViewport,
    visibleLinksInViewport,
    filterStats,
    hasActiveFilters,
    applyFilter,
    clearFilter,
  };
}

// ============================================================================
// UTILITY HOOKS
// ============================================================================

/**
 * Hook for filter presets
 *
 * @example
 * ```typescript
 * const { presets, applyPreset, savePreset } = useFilterPresets();
 *
 * // Apply preset
 * applyPreset('high-risk-only');
 *
 * // Save current filters as preset
 * savePreset('my-preset', currentFilters);
 * ```
 */
export function useFilterPresets() {
  const [presets, setPresets] = useState<Record<string, GraphFilters>>({
    'all': DEFAULT_FILTERS,
    'high-risk-only': {
      ...DEFAULT_FILTERS,
      riskLevels: ['high', 'critical'],
    },
    'high-confidence': {
      ...DEFAULT_FILTERS,
      minConfidence: 80,
    },
    'recent-only': {
      ...DEFAULT_FILTERS,
      dateFrom: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    },
  });

  const applyPreset = useCallback((name: string): GraphFilters | null => {
    return presets[name] || null;
  }, [presets]);

  const savePreset = useCallback((name: string, filters: GraphFilters) => {
    setPresets(prev => ({ ...prev, [name]: filters }));
  }, []);

  const deletePreset = useCallback((name: string) => {
    setPresets(prev => {
      const newPresets = { ...prev };
      delete newPresets[name];
      return newPresets;
    });
  }, []);

  return {
    presets,
    applyPreset,
    savePreset,
    deletePreset,
  };
}

/**
 * Hook for filter persistence to localStorage
 *
 * @param filters - Current filters
 * @param storageKey - localStorage key
 *
 * @example
 * ```typescript
 * const filters = useFilters({ ... });
 * useFilterPersistence(filters.filters, `graph-filters-${caseId}`);
 * // Filters are now automatically saved and restored
 * ```
 */
export function useFilterPersistence(
  filters: GraphFilters,
  storageKey: string
) {
  // Load from localStorage on mount
  const loadFilters = useCallback((): GraphFilters | null => {
    try {
      const saved = localStorage.getItem(storageKey);
      return saved ? JSON.parse(saved) : null;
    } catch (error) {
      console.error('Failed to load filters from localStorage:', error);
      return null;
    }
  }, [storageKey]);

  // Save to localStorage whenever filters change
  const saveFilters = useCallback(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(filters));
    } catch (error) {
      console.error('Failed to save filters to localStorage:', error);
    }
  }, [filters, storageKey]);

  return {
    loadFilters,
    saveFilters,
  };
}

/**
 * Calculate filter effectiveness (how many items filtered out)
 */
export function calculateFilterEffectiveness(
  totalCount: number,
  filteredCount: number
): {
  percentageFiltered: number;
  percentageVisible: number;
  effectiveness: 'none' | 'low' | 'medium' | 'high';
} {
  const percentageFiltered = totalCount > 0
    ? ((totalCount - filteredCount) / totalCount) * 100
    : 0;
  const percentageVisible = 100 - percentageFiltered;

  let effectiveness: 'none' | 'low' | 'medium' | 'high' = 'none';
  if (percentageFiltered > 75) effectiveness = 'high';
  else if (percentageFiltered > 50) effectiveness = 'medium';
  else if (percentageFiltered > 25) effectiveness = 'low';

  return {
    percentageFiltered,
    percentageVisible,
    effectiveness,
  };
}
