/**
 * Phase 5, Feature 2: Layout Algorithms Service
 *
 * Pure functions for graph layout calculations.
 * Extracted from InvestigationWorkbenchTab.tsx (lines 1194-1555).
 *
 * Provides 14 different layout algorithms for graph visualization:
 * - Implemented: force, radial, sankey, timeline, bankCluster, tree (6)
 * - Placeholders: circular, grid, hierarchical, block, centrality, orthogonal, horizontal, chakra (8)
 */

import type { Node, Link } from '../types';

// ============================================================================
// TYPES
// ============================================================================

export type LayoutType =
  | 'force'
  | 'hierarchical'
  | 'tree'
  | 'circular'
  | 'grid'
  | 'chakra'
  | 'horizontal'
  | 'block'
  | 'centrality'
  | 'orthogonal'
  | 'radial'
  | 'sankey'
  | 'timeline'
  | 'bankCluster';

export interface LayoutOptions {
  /** Container width in pixels */
  containerWidth: number;
  /** Container height in pixels */
  containerHeight: number;
  /** Graph nodes to layout */
  nodes: Node[];
  /** Graph links/edges */
  links: Link[];
  /** Optional victim node ID for tree layout */
  victimNodeId?: string;
}

export interface LayoutResult {
  /** Nodes with updated x, y positions */
  nodes: Node[];
  /** Optional layout metadata */
  metadata?: {
    /** Number of iterations for iterative layouts */
    iterations?: number;
    /** Whether layout converged */
    converged?: boolean;
    /** Suggested zoom level for this layout */
    suggestedZoom?: number;
    /** Suggested pan offset */
    suggestedPan?: { x: number; y: number };
    /** Any other layout-specific metadata */
    [key: string]: any;
  };
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Get the degree (connection count) of a node
 */
function getDegree(nodeId: string, links: Link[]): number {
  return links.filter(link => link.source === nodeId || link.target === nodeId).length;
}

/**
 * Extract bank identifier from node metadata
 */
function getBankKey(node: Node): string {
  const bankName = node.metadata?.bank_name || node.metadata?.bank || node.metadata?.institution;
  const ifsc = node.metadata?.ifsc_code || node.metadata?.ifsc;

  if (bankName && ifsc) return `${bankName} (${ifsc})`;
  if (bankName) return bankName;
  if (ifsc) return `IFSC ${ifsc}`;
  return 'Unknown Bank';
}

// ============================================================================
// LAYOUT IMPLEMENTATIONS
// ============================================================================

/**
 * Force-directed layout using physics simulation
 *
 * Uses attractive spring forces for connected nodes and repulsive forces
 * for all nodes to create a balanced layout.
 *
 * Good for: General-purpose graphs, showing clustering naturally
 */
function applyForceDirectedLayout(options: LayoutOptions): LayoutResult {
  const { containerWidth, containerHeight, nodes, links } = options;

  // Initialize positions randomly if not set
  let updatedNodes = nodes.map(node => ({
    ...node,
    x: node.x ?? Math.random() * containerWidth,
    y: node.y ?? Math.random() * containerHeight,
  }));

  // Force-directed algorithm parameters
  const iterations = 30;
  const springLength = 220;
  const springStrength = 0.12;
  const repulsionStrength = 4500;

  // Iterative force calculation
  for (let iter = 0; iter < iterations; iter++) {
    const forces: Record<string, { x: number; y: number }> = {};

    // Initialize forces
    updatedNodes.forEach(node => {
      forces[node.id] = { x: 0, y: 0 };
    });

    // Repulsive forces between all pairs
    for (let i = 0; i < updatedNodes.length; i++) {
      for (let j = i + 1; j < updatedNodes.length; j++) {
        const node1 = updatedNodes[i];
        const node2 = updatedNodes[j];
        const dx = node2.x - node1.x;
        const dy = node2.y - node1.y;
        const dist = Math.sqrt(dx * dx + dy * dy) || 1;
        const force = repulsionStrength / (dist * dist);

        forces[node1.id].x -= (dx / dist) * force;
        forces[node1.id].y -= (dy / dist) * force;
        forces[node2.id].x += (dx / dist) * force;
        forces[node2.id].y += (dy / dist) * force;
      }
    }

    // Attractive spring forces for connected nodes
    links.forEach(link => {
      const source = updatedNodes.find(n => n.id === link.source);
      const target = updatedNodes.find(n => n.id === link.target);
      if (!source || !target) return;

      const dx = target.x - source.x;
      const dy = target.y - source.y;
      const dist = Math.sqrt(dx * dx + dy * dy) || 1;
      const force = (dist - springLength) * springStrength;

      forces[source.id].x += (dx / dist) * force;
      forces[source.id].y += (dy / dist) * force;
      forces[target.id].x -= (dx / dist) * force;
      forces[target.id].y -= (dy / dist) * force;
    });

    // Apply forces
    updatedNodes = updatedNodes.map(node => ({
      ...node,
      x: node.x + forces[node.id].x,
      y: node.y + forces[node.id].y,
    }));
  }

  return {
    nodes: updatedNodes,
    metadata: {
      iterations,
      converged: true,
    },
  };
}

/**
 * Radial layout with nodes arranged in concentric rings by layer
 *
 * Good for: Hierarchical data, showing distance from center
 */
function applyRadialLayout(options: LayoutOptions): LayoutResult {
  const { containerWidth, containerHeight, nodes, links } = options;

  const center = {
    x: containerWidth / 2,
    y: containerHeight / 2,
  };

  // Group nodes by layer
  const layerGroups = new Map<number, Node[]>();
  nodes.forEach(node => {
    const layer = node.metadata?.layer ?? 0;
    if (!layerGroups.has(layer)) {
      layerGroups.set(layer, []);
    }
    layerGroups.get(layer)!.push(node);
  });

  const sortedLayers = Array.from(layerGroups.keys()).sort((a, b) => a - b);
  const baseRadius = 200;
  const radiusStep = 180;

  const updatedNodes: Node[] = [];

  sortedLayers.forEach((layer, layerIndex) => {
    const nodesInLayer = layerGroups.get(layer)!;
    const radius = baseRadius + layerIndex * radiusStep;

    // Sort by degree (connection count) for better visual balance
    const sortedByDegree = [...nodesInLayer].sort((a, b) =>
      getDegree(b.id, links) - getDegree(a.id, links)
    );

    sortedByDegree.forEach((node, index) => {
      const angle = (index / sortedByDegree.length) * 2 * Math.PI;
      updatedNodes.push({
        ...node,
        x: center.x + radius * Math.cos(angle),
        y: center.y + radius * Math.sin(angle),
      });
    });
  });

  return {
    nodes: updatedNodes,
    metadata: {
      layerCount: sortedLayers.length,
    },
  };
}

/**
 * Sankey layout for flow diagrams
 *
 * Nodes are arranged in columns by layer, with vertical position
 * determined by flow volume (transaction amounts).
 *
 * Good for: Money flow, transaction chains, supply chains
 */
function applySankeyLayout(options: LayoutOptions): LayoutResult {
  const { nodes, links } = options;

  // Group nodes by layer
  const groupedByLayer = new Map<number, Node[]>();
  nodes.forEach(node => {
    const layer = node.metadata?.layer ?? 0;
    if (!groupedByLayer.has(layer)) {
      groupedByLayer.set(layer, []);
    }
    groupedByLayer.get(layer)!.push(node);
  });

  const sortedLayers = Array.from(groupedByLayer.keys()).sort((a, b) => a - b);
  const layerSpacing = 260;
  const startX = 200;
  const startY = 200;

  // Calculate total flow for each layer
  const layerTotals = new Map<number, number>();
  sortedLayers.forEach(layer => {
    const total = groupedByLayer.get(layer)!.reduce((sum, node) => {
      const incoming = links
        .filter(l => l.target === node.id)
        .reduce((a, l) => a + (l.amount || 1), 0);
      const outgoing = links
        .filter(l => l.source === node.id)
        .reduce((a, l) => a + (l.amount || 1), 0);
      return sum + Math.max(incoming, outgoing, 1);
    }, 0);
    layerTotals.set(layer, total || groupedByLayer.get(layer)!.length);
  });

  // Calculate vertical offsets for centering
  const layerOffsets = new Map<number, number>();
  sortedLayers.forEach(layer => {
    const totalHeight = layerTotals.get(layer) || 1;
    layerOffsets.set(layer, startY - totalHeight / 2);
  });

  // Position nodes
  const nodePositions = new Map<string, { x: number; y: number }>();
  sortedLayers.forEach((layer, layerIndex) => {
    const nodesInLayer = groupedByLayer.get(layer)!;
    const baseX = startX + layerIndex * layerSpacing;
    let currentY = layerOffsets.get(layer)!;

    nodesInLayer.forEach(node => {
      const incoming = links
        .filter(l => l.target === node.id)
        .reduce((a, l) => a + (l.amount || 1), 0);
      const outgoing = links
        .filter(l => l.source === node.id)
        .reduce((a, l) => a + (l.amount || 1), 0);
      const nodeWeight = Math.max(incoming, outgoing, 1) * 4;

      nodePositions.set(node.id, {
        x: baseX,
        y: currentY + nodeWeight / 2,
      });

      currentY += nodeWeight + 40;
    });
  });

  const updatedNodes = nodes.map(node => {
    const pos = nodePositions.get(node.id) || {
      x: Math.random() * 1000,
      y: Math.random() * 800,
    };
    return { ...node, x: pos.x, y: pos.y };
  });

  return {
    nodes: updatedNodes,
    metadata: {
      layerCount: sortedLayers.length,
    },
  };
}

/**
 * Timeline layout for chronological data
 *
 * Nodes are arranged horizontally by date/timestamp, with vertical
 * position determined by layer.
 *
 * Good for: Transaction history, event sequences, temporal data
 */
function applyTimelineLayout(options: LayoutOptions): LayoutResult {
  const { nodes } = options;

  // Extract dates from nodes
  const nodesWithDates = nodes.map(node => {
    const txDate = node.metadata?.transaction_date ||
                   node.metadata?.date ||
                   node.metadata?.timestamp;
    const parsed = txDate ? new Date(txDate) : null;
    return { node, date: parsed?.getTime() ?? null };
  });

  // Sort by date
  const sortedByDate = nodesWithDates.sort((a, b) => {
    if (a.date === null && b.date === null) return 0;
    if (a.date === null) return 1;
    if (b.date === null) return -1;
    return a.date - b.date;
  });

  // Layout parameters
  const baseX = 180;
  const xStep = 220;
  const layerOffset = 220;
  const bandHeight = 60;
  const layerBands = new Map<number, number>();

  const updatedNodes = sortedByDate.map(({ node }, index) => {
    const layer = node.metadata?.layer ?? 0;
    const bandIndex = layerBands.get(layer) ?? 0;
    layerBands.set(layer, bandIndex + 1);

    return {
      ...node,
      x: baseX + index * xStep,
      y: 200 + layer * layerOffset + (bandIndex % 3) * bandHeight,
    };
  });

  return {
    nodes: updatedNodes,
    metadata: {
      sortedByDate: true,
    },
  };
}

/**
 * Bank cluster layout
 *
 * Groups nodes by bank affiliation into separate clusters.
 *
 * Good for: Financial investigations, showing bank relationships
 */
function applyBankClusterLayout(options: LayoutOptions): LayoutResult {
  const { nodes } = options;

  // Group by bank
  const clusters = new Map<string, Node[]>();
  nodes.forEach(node => {
    const key = getBankKey(node);
    if (!clusters.has(key)) clusters.set(key, []);
    clusters.get(key)!.push(node);
  });

  const clusterKeys = Array.from(clusters.keys());
  const clusterSpacing = 480;
  const baseX = 240;
  const updatedNodes: Node[] = [];

  clusterKeys.forEach((key, clusterIndex) => {
    const clusterNodes = clusters.get(key)!;
    const columns = Math.ceil(Math.sqrt(clusterNodes.length));
    const nodeSpacing = 160;

    clusterNodes.forEach((node, index) => {
      const column = index % columns;
      const row = Math.floor(index / columns);

      updatedNodes.push({
        ...node,
        x: baseX + clusterIndex * clusterSpacing + column * nodeSpacing,
        y: 220 + row * nodeSpacing,
        metadata: {
          ...node.metadata,
          bankCluster: key,
        },
      });
    });
  });

  return {
    nodes: updatedNodes,
    metadata: {
      clusterCount: clusterKeys.length,
      clusters: Array.from(clusters.keys()),
    },
  };
}

/**
 * Tree layout with hierarchical layers
 *
 * Arranges nodes in horizontal layers with optimized spacing.
 * Automatically centers and scales the graph to fit container.
 *
 * Good for: Hierarchical data, org charts, dependency trees, 1930 PDF imports
 */
function applyTreeLayout(options: LayoutOptions): LayoutResult {
  const { containerWidth, containerHeight, nodes } = options;

  if (nodes.length === 0) {
    return { nodes };
  }

  // Group nodes by layer
  const layerGroups = new Map<number, Node[]>();
  nodes.forEach(node => {
    const rawLayer = node.metadata?.layer;
    const layer = typeof rawLayer === 'number' && Number.isFinite(rawLayer) ? rawLayer : 1;
    if (!layerGroups.has(layer)) {
      layerGroups.set(layer, []);
    }
    layerGroups.get(layer)!.push(node);
  });

  const sortedLayers = Array.from(layerGroups.keys()).sort((a, b) => a - b);
  const baseY = 120;

  // Massive vertical spacing for readability (600px minimum)
  const verticalSpacing = Math.max(
    600,
    Math.min(800, (containerHeight - baseY) / Math.max(sortedLayers.length, 1))
  );
  const centerX = containerWidth / 2;

  const positionedNodes = new Map<string, { x: number; y: number }>();

  sortedLayers.forEach((layer, layerIndex) => {
    const nodesInLayer = layerGroups.get(layer)!;

    // Sort by importance (transaction amount)
    const sortedByImportance = nodesInLayer
      .slice()
      .sort((a, b) => {
        const amountA = Number(
          a.metadata?.transaction_amount ??
          a.metadata?.amount ??
          a.metadata?.value ??
          0
        );
        const amountB = Number(
          b.metadata?.transaction_amount ??
          b.metadata?.amount ??
          b.metadata?.value ??
          0
        );

        if (amountA === amountB) {
          return (a.label || a.id).localeCompare(b.label || b.id);
        }
        return amountB - amountA;
      });

    // Increased horizontal spacing (300px minimum)
    const spacing = Math.max(
      300,
      Math.min(500, containerWidth / Math.max(sortedByImportance.length, 2))
    );
    const layerY = baseY + layerIndex * verticalSpacing;

    sortedByImportance.forEach((node, index) => {
      const horizontalOffset = (index - (sortedByImportance.length - 1) / 2) * spacing;
      positionedNodes.set(node.id, {
        x: centerX + horizontalOffset,
        y: layerY,
      });
    });
  });

  // Apply positions
  const updatedNodes = nodes.map(node => {
    const pos = positionedNodes.get(node.id);
    if (!pos) return node;
    return {
      ...node,
      x: pos.x,
      y: pos.y,
    };
  });

  // Calculate graph bounds
  const xs = updatedNodes.map(n => n.x ?? 0);
  const ys = updatedNodes.map(n => n.y ?? 0);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  const graphWidth = Math.max(1, maxX - minX);
  const graphHeight = Math.max(1, maxY - minY);

  // Calculate suggested pan to center graph
  const centeredPan = {
    x: containerWidth / 2 - (minX + graphWidth / 2),
    y: containerHeight / 2 - (minY + graphHeight / 2),
  };

  // Calculate suggested zoom to fit graph
  const widthScale = containerWidth / (graphWidth + 400);
  const heightScale = containerHeight / (graphHeight + 400);
  const targetZoom = Math.max(0.45, Math.min(1.1, widthScale, heightScale));

  return {
    nodes: updatedNodes,
    metadata: {
      layerCount: sortedLayers.length,
      suggestedZoom: Number.isFinite(targetZoom) && targetZoom > 0 ? targetZoom : undefined,
      suggestedPan: Number.isFinite(centeredPan.x) && Number.isFinite(centeredPan.y)
        ? centeredPan
        : undefined,
    },
  };
}

// ============================================================================
// PLACEHOLDER LAYOUTS (Not Yet Implemented)
// ============================================================================

/**
 * Circular layout (placeholder)
 * TODO: Implement circular arrangement
 */
function applyCircularLayout(options: LayoutOptions): LayoutResult {
  console.warn('Circular layout not yet implemented');
  return { nodes: options.nodes };
}

/**
 * Grid layout (placeholder)
 * TODO: Implement grid arrangement
 */
function applyGridLayout(options: LayoutOptions): LayoutResult {
  console.warn('Grid layout not yet implemented');
  return { nodes: options.nodes };
}

/**
 * Hierarchical layout (placeholder)
 * TODO: Implement hierarchical arrangement
 */
function applyHierarchicalLayout(options: LayoutOptions): LayoutResult {
  console.warn('Hierarchical layout not yet implemented');
  return { nodes: options.nodes };
}

/**
 * Block layout (placeholder)
 * TODO: Implement block arrangement
 */
function applyBlockLayout(options: LayoutOptions): LayoutResult {
  console.warn('Block layout not yet implemented');
  return { nodes: options.nodes };
}

/**
 * Centrality layout (placeholder)
 * TODO: Implement centrality-based arrangement
 */
function applyCentralityLayout(options: LayoutOptions): LayoutResult {
  console.warn('Centrality layout not yet implemented');
  return { nodes: options.nodes };
}

/**
 * Orthogonal layout (placeholder)
 * TODO: Implement orthogonal arrangement
 */
function applyOrthogonalLayout(options: LayoutOptions): LayoutResult {
  console.warn('Orthogonal layout not yet implemented');
  return { nodes: options.nodes };
}

/**
 * Horizontal layout (placeholder)
 * TODO: Implement horizontal arrangement
 */
function applyHorizontalLayout(options: LayoutOptions): LayoutResult {
  console.warn('Horizontal layout not yet implemented');
  return { nodes: options.nodes };
}

/**
 * Chakra layout (placeholder)
 * TODO: Implement chakra arrangement
 */
function applyChakraLayout(options: LayoutOptions): LayoutResult {
  console.warn('Chakra layout not yet implemented');
  return { nodes: options.nodes };
}

// ============================================================================
// PUBLIC API
// ============================================================================

/**
 * Apply a layout algorithm to a graph
 *
 * @param layoutType - The layout algorithm to use
 * @param options - Layout options including nodes, links, and container dimensions
 * @returns Layout result with updated node positions and optional metadata
 *
 * @example
 * ```typescript
 * const result = applyLayout('force', {
 *   containerWidth: 1200,
 *   containerHeight: 800,
 *   nodes: myNodes,
 *   links: myLinks,
 * });
 *
 * // Use result.nodes for rendering
 * // Check result.metadata for suggested zoom/pan
 * if (result.metadata?.suggestedZoom) {
 *   setZoom(result.metadata.suggestedZoom);
 * }
 * ```
 */
export function applyLayout(
  layoutType: LayoutType,
  options: LayoutOptions
): LayoutResult {
  switch (layoutType) {
    case 'force':
      return applyForceDirectedLayout(options);

    case 'radial':
      return applyRadialLayout(options);

    case 'sankey':
      return applySankeyLayout(options);

    case 'timeline':
      return applyTimelineLayout(options);

    case 'bankCluster':
      return applyBankClusterLayout(options);

    case 'tree':
      return applyTreeLayout(options);

    // Placeholder layouts
    case 'circular':
      return applyCircularLayout(options);

    case 'grid':
      return applyGridLayout(options);

    case 'hierarchical':
      return applyHierarchicalLayout(options);

    case 'block':
      return applyBlockLayout(options);

    case 'centrality':
      return applyCentralityLayout(options);

    case 'orthogonal':
      return applyOrthogonalLayout(options);

    case 'horizontal':
      return applyHorizontalLayout(options);

    case 'chakra':
      return applyChakraLayout(options);

    default:
      console.warn(`Unknown layout type: ${layoutType}, falling back to force-directed`);
      return applyForceDirectedLayout(options);
  }
}

/**
 * Get list of all available layout types
 */
export function getAvailableLayouts(): LayoutType[] {
  return [
    'force',
    'radial',
    'sankey',
    'timeline',
    'bankCluster',
    'tree',
    'circular',
    'grid',
    'hierarchical',
    'block',
    'centrality',
    'orthogonal',
    'horizontal',
    'chakra',
  ];
}

/**
 * Get list of fully implemented layout types
 */
export function getImplementedLayouts(): LayoutType[] {
  return [
    'force',
    'radial',
    'sankey',
    'timeline',
    'bankCluster',
    'tree',
  ];
}

/**
 * Check if a layout is fully implemented
 */
export function isLayoutImplemented(layoutType: LayoutType): boolean {
  return getImplementedLayouts().includes(layoutType);
}
