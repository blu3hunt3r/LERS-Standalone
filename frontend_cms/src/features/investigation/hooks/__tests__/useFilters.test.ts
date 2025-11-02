/**
 * Phase 5, Feature 2, Phase 4: Unit Tests for useFilters Hook
 *
 * Tests graph filtering and viewport culling functionality:
 * - Entity type filters
 * - Risk level filters
 * - Confidence filters
 * - Date range filters
 * - Metadata filters
 * - Layer visibility
 * - Viewport culling
 * - Filter statistics
 * - Filter presets
 */

import { renderHook, act } from '@testing-library/react';
import { useFilters, calculateFilterEffectiveness } from '../useFilters';
import type { Node, Link } from '../../types';
import React from 'react';

// ============================================================================
// MOCK DATA
// ============================================================================

const mockNodes: Node[] = [
  {
    id: '1',
    label: 'John Doe',
    type: 'person',
    x: 100,
    y: 100,
    risk_level: 'high',
    metadata: { layer: 0, created_at: '2024-01-01' },
    entity: { confidence: 90, created_at: '2024-01-01' },
  },
  {
    id: '2',
    label: 'Jane Smith',
    type: 'person',
    x: 200,
    y: 200,
    risk_level: 'low',
    metadata: { layer: 1, created_at: '2024-01-15' },
    entity: { confidence: 50, created_at: '2024-01-15' },
  },
  {
    id: '3',
    label: 'Acme Corp',
    type: 'company',
    x: 300,
    y: 300,
    risk_level: 'critical',
    metadata: { layer: 0, created_at: '2024-02-01' },
    entity: { confidence: 95, created_at: '2024-02-01' },
  },
  {
    id: '4',
    label: 'Bank Account',
    type: 'account',
    x: 400,
    y: 400,
    risk_level: 'medium',
    // No metadata
    entity: { confidence: 70, created_at: '2024-02-15' },
  },
  {
    id: '5',
    label: 'Transaction',
    type: 'transaction',
    x: 1500, // Outside viewport
    y: 1500,
    risk_level: 'low',
    metadata: { layer: 2 },
    entity: { confidence: 60 },
  },
];

const mockLinks: Link[] = [
  { id: 'l1', source: '1', target: '2' },
  { id: 'l2', source: '2', target: '3' },
  { id: 'l3', source: '3', target: '4' },
  { id: 'l4', source: '4', target: '5' },
];

// Mock SVG ref
const createMockSvgRef = () =>
  ({
    current: {
      getBoundingClientRect: () => ({
        left: 0,
        top: 0,
        width: 800,
        height: 600,
        right: 800,
        bottom: 600,
        x: 0,
        y: 0,
        toJSON: () => ({}),
      }),
    },
  } as React.RefObject<SVGSVGElement>);

describe('useFilters', () => {
  // ============================================================================
  // BASIC INITIALIZATION
  // ============================================================================

  test('initializes with default values', () => {
    const { result } = renderHook(() =>
      useFilters({
        nodes: mockNodes,
        links: mockLinks,
        visibleEntityTypes: new Set(['person', 'company', 'account', 'transaction']),
        visibleLayers: new Set(),
        layerOpacity: {},
        zoom: 1,
        pan: { x: 0, y: 0 },
      })
    );

    expect(result.current.filters.entityTypes).toEqual([]);
    expect(result.current.filters.riskLevels).toEqual([]);
    expect(result.current.filters.minConfidence).toBe(0);
    expect(result.current.filters.dateFrom).toBe('');
    expect(result.current.filters.dateTo).toBe('');
    expect(result.current.filters.hasMetadata).toBe(false);
    expect(result.current.filters.layers).toEqual([]);
  });

  test('returns all nodes when no filters applied', () => {
    const { result } = renderHook(() =>
      useFilters({
        nodes: mockNodes,
        links: mockLinks,
        visibleEntityTypes: new Set(['person', 'company', 'account', 'transaction']),
        visibleLayers: new Set(),
        layerOpacity: {},
        zoom: 1,
        pan: { x: 0, y: 0 },
        enableViewportCulling: false,
      })
    );

    expect(result.current.filteredNodes.length).toBe(5);
    expect(result.current.filteredLinks.length).toBe(4);
  });

  // ============================================================================
  // ENTITY TYPE FILTER
  // ============================================================================

  test('filters by entity type', () => {
    const { result } = renderHook(() =>
      useFilters({
        nodes: mockNodes,
        links: mockLinks,
        visibleEntityTypes: new Set(['person', 'company', 'account', 'transaction']),
        visibleLayers: new Set(),
        layerOpacity: {},
        zoom: 1,
        pan: { x: 0, y: 0 },
        enableViewportCulling: false,
      })
    );

    act(() => {
      result.current.setFilters({ entityTypes: ['person'] });
    });

    expect(result.current.filteredNodes.length).toBe(2);
    expect(result.current.filteredNodes.every(n => n.type === 'person')).toBe(true);
  });

  test('filters by multiple entity types', () => {
    const { result } = renderHook(() =>
      useFilters({
        nodes: mockNodes,
        links: mockLinks,
        visibleEntityTypes: new Set(['person', 'company', 'account', 'transaction']),
        visibleLayers: new Set(),
        layerOpacity: {},
        zoom: 1,
        pan: { x: 0, y: 0 },
        enableViewportCulling: false,
      })
    );

    act(() => {
      result.current.setFilters({ entityTypes: ['person', 'company'] });
    });

    expect(result.current.filteredNodes.length).toBe(3);
  });

  // ============================================================================
  // RISK LEVEL FILTER
  // ============================================================================

  test('filters by risk level', () => {
    const { result } = renderHook(() =>
      useFilters({
        nodes: mockNodes,
        links: mockLinks,
        visibleEntityTypes: new Set(['person', 'company', 'account', 'transaction']),
        visibleLayers: new Set(),
        layerOpacity: {},
        zoom: 1,
        pan: { x: 0, y: 0 },
        enableViewportCulling: false,
      })
    );

    act(() => {
      result.current.setFilters({ riskLevels: ['high', 'critical'] });
    });

    expect(result.current.filteredNodes.length).toBe(2);
    expect(result.current.filteredNodes.every(n =>
      n.risk_level === 'high' || n.risk_level === 'critical'
    )).toBe(true);
  });

  // ============================================================================
  // CONFIDENCE FILTER
  // ============================================================================

  test('filters by minimum confidence', () => {
    const { result } = renderHook(() =>
      useFilters({
        nodes: mockNodes,
        links: mockLinks,
        visibleEntityTypes: new Set(['person', 'company', 'account', 'transaction']),
        visibleLayers: new Set(),
        layerOpacity: {},
        zoom: 1,
        pan: { x: 0, y: 0 },
        enableViewportCulling: false,
      })
    );

    act(() => {
      result.current.setFilters({ minConfidence: 80 });
    });

    expect(result.current.filteredNodes.length).toBe(2); // Nodes 1 and 3 (90, 95)
    expect(result.current.filteredNodes.every(n =>
      n.entity && n.entity.confidence >= 80
    )).toBe(true);
  });

  // ============================================================================
  // DATE RANGE FILTER
  // ============================================================================

  test('filters by date from', () => {
    const { result } = renderHook(() =>
      useFilters({
        nodes: mockNodes,
        links: mockLinks,
        visibleEntityTypes: new Set(['person', 'company', 'account', 'transaction']),
        visibleLayers: new Set(),
        layerOpacity: {},
        zoom: 1,
        pan: { x: 0, y: 0 },
        enableViewportCulling: false,
      })
    );

    act(() => {
      result.current.setFilters({ dateFrom: '2024-02-01' });
    });

    // Should include nodes created on or after 2024-02-01 (nodes 3 and 4)
    expect(result.current.filteredNodes.length).toBe(3); // 3, 4, 5 (5 has no date)
  });

  test('filters by date to', () => {
    const { result } = renderHook(() =>
      useFilters({
        nodes: mockNodes,
        links: mockLinks,
        visibleEntityTypes: new Set(['person', 'company', 'account', 'transaction']),
        visibleLayers: new Set(),
        layerOpacity: {},
        zoom: 1,
        pan: { x: 0, y: 0 },
        enableViewportCulling: false,
      })
    );

    act(() => {
      result.current.setFilters({ dateTo: '2024-01-31' });
    });

    // Should include nodes created on or before 2024-01-31 (nodes 1 and 2)
    expect(result.current.filteredNodes.length).toBe(3); // 1, 2, 5 (5 has no date)
  });

  test('filters by date range', () => {
    const { result } = renderHook(() =>
      useFilters({
        nodes: mockNodes,
        links: mockLinks,
        visibleEntityTypes: new Set(['person', 'company', 'account', 'transaction']),
        visibleLayers: new Set(),
        layerOpacity: {},
        zoom: 1,
        pan: { x: 0, y: 0 },
        enableViewportCulling: false,
      })
    );

    act(() => {
      result.current.setFilters({
        dateFrom: '2024-01-10',
        dateTo: '2024-02-10',
      });
    });

    // Should include nodes 2 and 3
    expect(result.current.filteredNodes.length).toBe(3); // 2, 3, 5
  });

  // ============================================================================
  // METADATA FILTER
  // ============================================================================

  test('filters by hasMetadata', () => {
    const { result } = renderHook(() =>
      useFilters({
        nodes: mockNodes,
        links: mockLinks,
        visibleEntityTypes: new Set(['person', 'company', 'account', 'transaction']),
        visibleLayers: new Set(),
        layerOpacity: {},
        zoom: 1,
        pan: { x: 0, y: 0 },
        enableViewportCulling: false,
      })
    );

    act(() => {
      result.current.setFilters({ hasMetadata: true });
    });

    // Nodes 1, 2, 3, 5 have metadata; node 4 does not
    expect(result.current.filteredNodes.length).toBe(4);
    expect(result.current.filteredNodes.every(n =>
      n.metadata && Object.keys(n.metadata).length > 0
    )).toBe(true);
  });

  // ============================================================================
  // LAYER VISIBILITY FILTER
  // ============================================================================

  test('filters by visible layers', () => {
    const { result } = renderHook(() =>
      useFilters({
        nodes: mockNodes,
        links: mockLinks,
        visibleEntityTypes: new Set(['person', 'company', 'account', 'transaction']),
        visibleLayers: new Set(['0']),
        layerOpacity: {},
        zoom: 1,
        pan: { x: 0, y: 0 },
        enableViewportCulling: false,
      })
    );

    // Should only show layer 0 nodes (1 and 3) + nodes without layer (4)
    expect(result.current.filteredNodes.length).toBe(3);
  });

  test('hides all nodes when no layers visible with custom preset', () => {
    const { result } = renderHook(() =>
      useFilters({
        nodes: mockNodes,
        links: mockLinks,
        visibleEntityTypes: new Set(['person', 'company', 'account', 'transaction']),
        visibleLayers: new Set(),
        layerOpacity: {},
        layerPreset: 'custom',
        availableLayers: [0, 1, 2],
        zoom: 1,
        pan: { x: 0, y: 0 },
        enableViewportCulling: false,
      })
    );

    // When no layers are visible and preset is custom, should hide all nodes with layers
    expect(result.current.filteredNodes.length).toBe(1); // Only node 4 (no layer)
  });

  // ============================================================================
  // FILTERED LINKS
  // ============================================================================

  test('filters links based on filtered nodes', () => {
    const { result } = renderHook(() =>
      useFilters({
        nodes: mockNodes,
        links: mockLinks,
        visibleEntityTypes: new Set(['person', 'company', 'account', 'transaction']),
        visibleLayers: new Set(),
        layerOpacity: {},
        zoom: 1,
        pan: { x: 0, y: 0 },
        enableViewportCulling: false,
      })
    );

    act(() => {
      result.current.setFilters({ entityTypes: ['person'] });
    });

    // Only link l1 connects two person nodes (1 -> 2)
    expect(result.current.filteredLinks.length).toBe(1);
    expect(result.current.filteredLinks[0].id).toBe('l1');
  });

  test('injects layer opacity into link metadata', () => {
    const { result } = renderHook(() =>
      useFilters({
        nodes: mockNodes,
        links: mockLinks,
        visibleEntityTypes: new Set(['person', 'company', 'account', 'transaction']),
        visibleLayers: new Set(),
        layerOpacity: { 0: 0.5, 1: 0.8 },
        zoom: 1,
        pan: { x: 0, y: 0 },
        enableViewportCulling: false,
      })
    );

    // Link l1: 1 (layer 0) -> 2 (layer 1)
    const link1 = result.current.filteredLinks.find(l => l.id === 'l1');
    expect(link1?.metadata?.opacity).toBeDefined();
  });

  // ============================================================================
  // VIEWPORT CULLING
  // ============================================================================

  test('culls nodes outside viewport', () => {
    const { result } = renderHook(() =>
      useFilters({
        nodes: mockNodes,
        links: mockLinks,
        visibleEntityTypes: new Set(['person', 'company', 'account', 'transaction']),
        visibleLayers: new Set(),
        layerOpacity: {},
        zoom: 1,
        pan: { x: 0, y: 0 },
        svgRef: createMockSvgRef(),
        enableViewportCulling: true,
        viewportPadding: 100,
      })
    );

    // Node 5 is at (1500, 1500), outside viewport
    expect(result.current.visibleNodesInViewport.length).toBeLessThan(result.current.filteredNodes.length);
    expect(result.current.visibleNodesInViewport.every(n => n.id !== '5')).toBe(true);
  });

  test('includes all nodes when viewport culling disabled', () => {
    const { result } = renderHook(() =>
      useFilters({
        nodes: mockNodes,
        links: mockLinks,
        visibleEntityTypes: new Set(['person', 'company', 'account', 'transaction']),
        visibleLayers: new Set(),
        layerOpacity: {},
        zoom: 1,
        pan: { x: 0, y: 0 },
        enableViewportCulling: false,
      })
    );

    expect(result.current.visibleNodesInViewport.length).toBe(result.current.filteredNodes.length);
  });

  test('culls links based on visible nodes', () => {
    const { result } = renderHook(() =>
      useFilters({
        nodes: mockNodes,
        links: mockLinks,
        visibleEntityTypes: new Set(['person', 'company', 'account', 'transaction']),
        visibleLayers: new Set(),
        layerOpacity: {},
        zoom: 1,
        pan: { x: 0, y: 0 },
        svgRef: createMockSvgRef(),
        enableViewportCulling: true,
        viewportPadding: 100,
      })
    );

    // Links to node 5 should be culled
    expect(result.current.visibleLinksInViewport.every(l =>
      l.source !== '5' && l.target !== '5'
    )).toBe(true);
  });

  // ============================================================================
  // FILTER STATISTICS
  // ============================================================================

  test('calculates filter statistics correctly', () => {
    const { result } = renderHook(() =>
      useFilters({
        nodes: mockNodes,
        links: mockLinks,
        visibleEntityTypes: new Set(['person', 'company', 'account', 'transaction']),
        visibleLayers: new Set(),
        layerOpacity: {},
        zoom: 1,
        pan: { x: 0, y: 0 },
        svgRef: createMockSvgRef(),
        enableViewportCulling: true,
      })
    );

    expect(result.current.filterStats.totalNodes).toBe(5);
    expect(result.current.filterStats.totalLinks).toBe(4);
    expect(result.current.filterStats.filteredNodes).toBe(5);
    expect(result.current.filterStats.visibleNodes).toBeLessThanOrEqual(5);
  });

  test('updates statistics after filtering', () => {
    const { result } = renderHook(() =>
      useFilters({
        nodes: mockNodes,
        links: mockLinks,
        visibleEntityTypes: new Set(['person', 'company', 'account', 'transaction']),
        visibleLayers: new Set(),
        layerOpacity: {},
        zoom: 1,
        pan: { x: 0, y: 0 },
        enableViewportCulling: false,
      })
    );

    act(() => {
      result.current.setFilters({ entityTypes: ['person'] });
    });

    expect(result.current.filterStats.filteredNodes).toBe(2);
    expect(result.current.filterStats.filteredLinks).toBe(1);
  });

  test('calculates culled counts correctly', () => {
    const { result } = renderHook(() =>
      useFilters({
        nodes: mockNodes,
        links: mockLinks,
        visibleEntityTypes: new Set(['person', 'company', 'account', 'transaction']),
        visibleLayers: new Set(),
        layerOpacity: {},
        zoom: 1,
        pan: { x: 0, y: 0 },
        svgRef: createMockSvgRef(),
        enableViewportCulling: true,
      })
    );

    const culledNodes = result.current.filterStats.culledNodes;
    const culledLinks = result.current.filterStats.culledLinks;

    expect(culledNodes).toBe(
      result.current.filterStats.filteredNodes - result.current.filterStats.visibleNodes
    );
    expect(culledLinks).toBe(
      result.current.filterStats.filteredLinks - result.current.filterStats.visibleLinks
    );
  });

  // ============================================================================
  // FILTER HELPERS
  // ============================================================================

  test('detects active filters', () => {
    const { result } = renderHook(() =>
      useFilters({
        nodes: mockNodes,
        links: mockLinks,
        visibleEntityTypes: new Set(['person', 'company', 'account', 'transaction']),
        visibleLayers: new Set(),
        layerOpacity: {},
        zoom: 1,
        pan: { x: 0, y: 0 },
        enableViewportCulling: false,
      })
    );

    expect(result.current.hasActiveFilters).toBe(false);

    act(() => {
      result.current.setFilters({ entityTypes: ['person'] });
    });

    expect(result.current.hasActiveFilters).toBe(true);
  });

  test('resets all filters', () => {
    const { result } = renderHook(() =>
      useFilters({
        nodes: mockNodes,
        links: mockLinks,
        visibleEntityTypes: new Set(['person', 'company', 'account', 'transaction']),
        visibleLayers: new Set(),
        layerOpacity: {},
        zoom: 1,
        pan: { x: 0, y: 0 },
        enableViewportCulling: false,
      })
    );

    act(() => {
      result.current.setFilters({
        entityTypes: ['person'],
        riskLevels: ['high'],
        minConfidence: 80,
      });
    });

    expect(result.current.hasActiveFilters).toBe(true);

    act(() => {
      result.current.resetFilters();
    });

    expect(result.current.hasActiveFilters).toBe(false);
    expect(result.current.filters.entityTypes).toEqual([]);
    expect(result.current.filters.riskLevels).toEqual([]);
    expect(result.current.filters.minConfidence).toBe(0);
  });

  test('applies specific filter', () => {
    const { result } = renderHook(() =>
      useFilters({
        nodes: mockNodes,
        links: mockLinks,
        visibleEntityTypes: new Set(['person', 'company', 'account', 'transaction']),
        visibleLayers: new Set(),
        layerOpacity: {},
        zoom: 1,
        pan: { x: 0, y: 0 },
        enableViewportCulling: false,
      })
    );

    act(() => {
      result.current.applyFilter('minConfidence', 85);
    });

    expect(result.current.filters.minConfidence).toBe(85);
  });

  test('clears specific filter', () => {
    const { result } = renderHook(() =>
      useFilters({
        nodes: mockNodes,
        links: mockLinks,
        visibleEntityTypes: new Set(['person', 'company', 'account', 'transaction']),
        visibleLayers: new Set(),
        layerOpacity: {},
        zoom: 1,
        pan: { x: 0, y: 0 },
        enableViewportCulling: false,
      })
    );

    act(() => {
      result.current.setFilters({
        entityTypes: ['person'],
        minConfidence: 80,
      });
    });

    act(() => {
      result.current.clearFilter('minConfidence');
    });

    expect(result.current.filters.minConfidence).toBe(0);
    expect(result.current.filters.entityTypes).toEqual(['person']); // Other filters unchanged
  });
});

// ============================================================================
// UTILITY FUNCTION TESTS
// ============================================================================

describe('useFilters utility functions', () => {
  test('calculates filter effectiveness for high filtering', () => {
    const result = calculateFilterEffectiveness(100, 10);

    expect(result.percentageFiltered).toBe(90);
    expect(result.percentageVisible).toBe(10);
    expect(result.effectiveness).toBe('high');
  });

  test('calculates filter effectiveness for medium filtering', () => {
    const result = calculateFilterEffectiveness(100, 40);

    expect(result.percentageFiltered).toBe(60);
    expect(result.percentageVisible).toBe(40);
    expect(result.effectiveness).toBe('medium');
  });

  test('calculates filter effectiveness for low filtering', () => {
    const result = calculateFilterEffectiveness(100, 70);

    expect(result.percentageFiltered).toBe(30);
    expect(result.percentageVisible).toBe(70);
    expect(result.effectiveness).toBe('low');
  });

  test('calculates filter effectiveness for no filtering', () => {
    const result = calculateFilterEffectiveness(100, 100);

    expect(result.percentageFiltered).toBe(0);
    expect(result.percentageVisible).toBe(100);
    expect(result.effectiveness).toBe('none');
  });

  test('handles zero total count', () => {
    const result = calculateFilterEffectiveness(0, 0);

    expect(result.percentageFiltered).toBe(0);
    expect(result.percentageVisible).toBe(100);
    expect(result.effectiveness).toBe('none');
  });
});
