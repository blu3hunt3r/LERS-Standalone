/**
 * ============================================================================
 * GRAPH ALGORITHMS - Core algorithms for investigation analysis
 * ============================================================================
 * Implements: BFS, DFS, Dijkstra, Cycle Detection, Layer Calculation
 */

import { Node, Link, PathResult, CycleResult } from '../types';

// ============================================================================
// TASK 1.2.1: LAYER CALCULATION (BFS Algorithm)
// ============================================================================

/**
 * Calculate layers using Breadth-First Search from victim/root node
 * Layer 0 = Victim, Layer 1 = Direct connections, Layer 2+ = Indirect
 */
export const calculateLayers = (
  nodes: Node[],
  links: Link[],
  rootNodeId: string
): Map<string, number> => {
  const layerMap = new Map<string, number>();
  const visited = new Set<string>();
  const queue: Array<{ id: string; layer: number }> = [{ id: rootNodeId, layer: 0 }];

  // Build adjacency list for faster lookups
  const adjacency = new Map<string, string[]>();
  links.forEach(link => {
    if (!adjacency.has(link.source)) adjacency.set(link.source, []);
    if (!adjacency.has(link.target)) adjacency.set(link.target, []);
    adjacency.get(link.source)!.push(link.target);
    adjacency.get(link.target)!.push(link.source); // Undirected for layer calculation
  });

  while (queue.length > 0) {
    const { id, layer } = queue.shift()!;
    
    if (visited.has(id)) continue;
    visited.add(id);
    layerMap.set(id, layer);

    // Add neighbors to next layer
    const neighbors = adjacency.get(id) || [];
    neighbors.forEach(neighborId => {
      if (!visited.has(neighborId)) {
        queue.push({ id: neighborId, layer: layer + 1 });
      }
    });
  }

  // Assign max layer to unconnected nodes
  const maxLayer = Math.max(...Array.from(layerMap.values()), 0);
  nodes.forEach(node => {
    if (!layerMap.has(node.id)) {
      layerMap.set(node.id, maxLayer + 1);
    }
  });

  return layerMap;
};

// ============================================================================
// TASK 1.4.1: SHORTEST PATH (Dijkstra's Algorithm)
// ============================================================================

/**
 * Find shortest path between two nodes using Dijkstra's algorithm
 */
export const findShortestPath = (
  nodes: Node[],
  links: Link[],
  sourceId: string,
  targetId: string
): PathResult | null => {
  const distances = new Map<string, number>();
  const previous = new Map<string, string | null>();
  const unvisited = new Set(nodes.map(n => n.id));

  // Build adjacency list with weights
  const adjacency = new Map<string, Array<{ id: string; weight: number }>>();
  links.forEach(link => {
    const weight = 1; // Can be modified to use link.amount for weighted paths
    if (!adjacency.has(link.source)) adjacency.set(link.source, []);
    if (!adjacency.has(link.target)) adjacency.set(link.target, []);
    adjacency.get(link.source)!.push({ id: link.target, weight });
    adjacency.get(link.target)!.push({ id: link.source, weight }); // Undirected
  });

  // Initialize distances
  nodes.forEach(n => distances.set(n.id, Infinity));
  distances.set(sourceId, 0);

  while (unvisited.size > 0) {
    // Find node with minimum distance
    let current: string | null = null;
    let minDist = Infinity;
    unvisited.forEach(id => {
      const dist = distances.get(id)!;
      if (dist < minDist) {
        minDist = dist;
        current = id;
      }
    });

    if (!current || current === targetId) break;
    if (minDist === Infinity) break; // Disconnected graph

    unvisited.delete(current);

    // Update neighbors
    const neighbors = adjacency.get(current) || [];
    neighbors.forEach(({ id: neighborId, weight }) => {
      if (unvisited.has(neighborId)) {
        const alt = distances.get(current!)! + weight;
        if (alt < distances.get(neighborId)!) {
          distances.set(neighborId, alt);
          previous.set(neighborId, current);
        }
      }
    });
  }

  // Reconstruct path
  if (!previous.has(targetId) && targetId !== sourceId) {
    return null; // No path found
  }

  const path: string[] = [];
  let curr: string | null = targetId;
  while (curr) {
    path.unshift(curr);
    curr = previous.get(curr) || null;
  }

  // Calculate total amount along path
  let totalAmount = 0;
  for (let i = 0; i < path.length - 1; i++) {
    const link = links.find(l =>
      (l.source === path[i] && l.target === path[i + 1]) ||
      (l.target === path[i] && l.source === path[i + 1])
    );
    if (link?.amount) totalAmount += link.amount;
  }

  return {
    nodes: path,
    links: [], // TODO: populate with actual link IDs
    length: path.length - 1,
    totalAmount,
  };
};

// ============================================================================
// TASK 1.4.2: CYCLE DETECTION (DFS Algorithm)
// ============================================================================

/**
 * Detect all cycles in the graph using DFS
 */
export const detectCycles = (
  nodes: Node[],
  links: Link[]
): CycleResult[] => {
  const visited = new Set<string>();
  const recStack = new Set<string>();
  const cycles: CycleResult[] = [];

  // Build adjacency list (directed graph for financial flows)
  const adjacency = new Map<string, string[]>();
  links.forEach(link => {
    if (!adjacency.has(link.source)) adjacency.set(link.source, []);
    adjacency.get(link.source)!.push(link.target);
  });

  const dfs = (nodeId: string, path: string[]): void => {
    visited.add(nodeId);
    recStack.add(nodeId);
    path.push(nodeId);

    const neighbors = adjacency.get(nodeId) || [];
    neighbors.forEach(neighborId => {
      if (!visited.has(neighborId)) {
        dfs(neighborId, [...path]);
      } else if (recStack.has(neighborId)) {
        // Cycle detected
        const cycleStart = path.indexOf(neighborId);
        const cycleNodes = path.slice(cycleStart);
        
        // Calculate total amount in cycle
        let totalAmount = 0;
        for (let i = 0; i < cycleNodes.length; i++) {
          const nextIdx = (i + 1) % cycleNodes.length;
          const link = links.find(l =>
            l.source === cycleNodes[i] && l.target === cycleNodes[nextIdx]
          );
          if (link?.amount) totalAmount += link.amount;
        }

        cycles.push({
          nodes: cycleNodes,
          length: cycleNodes.length,
          totalAmount,
        });
      }
    });

    recStack.delete(nodeId);
  };

  nodes.forEach(node => {
    if (!visited.has(node.id)) {
      dfs(node.id, []);
    }
  });

  return cycles;
};

// ============================================================================
// TASK 1.4.3: MONEY FLOW TRACING (Multi-hop BFS)
// ============================================================================

/**
 * Trace money flow from source node up to N hops
 */
export const traceMoneyFlow = (
  nodes: Node[],
  links: Link[],
  sourceId: string,
  maxHops: number = 3,
  minAmount: number = 0
): PathResult[] => {
  const paths: PathResult[] = [];
  const visited = new Set<string>();

  // Build adjacency list with financial links only
  const adjacency = new Map<string, Array<{ id: string; amount: number; linkId: string }>>();
  links
    .filter(link => link.type === 'TRANSFERRED' && (link.amount || 0) >= minAmount)
    .forEach(link => {
      if (!adjacency.has(link.source)) adjacency.set(link.source, []);
      adjacency.get(link.source)!.push({
        id: link.target,
        amount: link.amount || 0,
        linkId: link.id,
      });
    });

  const dfs = (currentId: string, path: string[], totalAmount: number, hops: number): void => {
    if (hops > maxHops) return;

    const neighbors = adjacency.get(currentId) || [];
    
    if (neighbors.length === 0 && path.length > 1) {
      // End of trail - record path
      paths.push({
        nodes: path,
        links: [],
        length: path.length - 1,
        totalAmount,
      });
      return;
    }

    neighbors.forEach(({ id: nextId, amount }) => {
      if (!visited.has(nextId) || hops < maxHops) {
        visited.add(nextId);
        dfs(nextId, [...path, nextId], totalAmount + amount, hops + 1);
        visited.delete(nextId);
      }
    });
  };

  dfs(sourceId, [sourceId], 0, 0);
  return paths;
};

// ============================================================================
// TASK 4.2.1: COMMUNITY DETECTION (Simplified Louvain Algorithm)
// ============================================================================

/**
 * Detect communities/clusters in the graph
 * Simplified version - full Louvain is complex
 */
export const detectCommunities = (
  nodes: Node[],
  links: Link[]
): Map<number, string[]> => {
  const communities = new Map<number, string[]>();
  const nodeToCommunity = new Map<string, number>();
  
  // Build adjacency list
  const adjacency = new Map<string, Set<string>>();
  links.forEach(link => {
    if (!adjacency.has(link.source)) adjacency.set(link.source, new Set());
    if (!adjacency.has(link.target)) adjacency.set(link.target, new Set());
    adjacency.get(link.source)!.add(link.target);
    adjacency.get(link.target)!.add(link.source);
  });

  // Simple community detection: connected components
  let communityId = 0;
  const visited = new Set<string>();

  const bfs = (startId: string): string[] => {
    const community: string[] = [];
    const queue = [startId];
    
    while (queue.length > 0) {
      const nodeId = queue.shift()!;
      if (visited.has(nodeId)) continue;
      
      visited.add(nodeId);
      community.push(nodeId);
      nodeToCommunity.set(nodeId, communityId);
      
      const neighbors = adjacency.get(nodeId) || new Set();
      neighbors.forEach(neighborId => {
        if (!visited.has(neighborId)) {
          queue.push(neighborId);
        }
      });
    }
    
    return community;
  };

  nodes.forEach(node => {
    if (!visited.has(node.id)) {
      const community = bfs(node.id);
      communities.set(communityId, community);
      communityId++;
    }
  });

  return communities;
};

// ============================================================================
// GRAPH STATISTICS CALCULATION
// ============================================================================

export const calculateGraphStatistics = (
  nodes: Node[],
  links: Link[]
) => {
  const totalMoney = links
    .filter(l => l.type === 'TRANSFERRED' && l.amount)
    .reduce((sum, l) => sum + (l.amount || 0), 0);

  // Calculate density
  const maxPossibleEdges = (nodes.length * (nodes.length - 1)) / 2;
  const density = maxPossibleEdges > 0 ? (links.length / maxPossibleEdges) * 100 : 0;

  // Find connected components
  const communities = detectCommunities(nodes, links);
  const largestComponent = Math.max(...Array.from(communities.values()).map(c => c.length), 0);
  const isolatedEntities = nodes.length - largestComponent;

  // Calculate average path length (sample-based for performance)
  let totalPathLength = 0;
  const sampleSize = Math.min(100, nodes.length * nodes.length);
  for (let i = 0; i < sampleSize; i++) {
    const source = nodes[Math.floor(Math.random() * nodes.length)];
    const target = nodes[Math.floor(Math.random() * nodes.length)];
    const path = findShortestPath(nodes, links, source.id, target.id);
    if (path) totalPathLength += path.length;
  }
  const avgPathLength = sampleSize > 0 ? totalPathLength / sampleSize : 0;

  // Date range
  const dates = [
    ...nodes.map(n => n.entity.created_at ? new Date(n.entity.created_at) : null),
    ...links.map(l => l.date ? new Date(l.date) : null),
  ].filter(Boolean) as Date[];

  const minDate = dates.length > 0 ? new Date(Math.min(...dates.map(d => d.getTime()))) : null;
  const maxDate = dates.length > 0 ? new Date(Math.max(...dates.map(d => d.getTime()))) : null;
  const daySpan = minDate && maxDate
    ? Math.ceil((maxDate.getTime() - minDate.getTime()) / (1000 * 60 * 60 * 24))
    : 0;

  return {
    entityCount: nodes.length,
    relationshipCount: links.length,
    totalMoney,
    avgPathLength: Number(avgPathLength.toFixed(1)),
    density: Number(density.toFixed(1)),
    components: communities.size,
    largestComponent,
    isolatedEntities,
    dateRange: {
      start: minDate,
      end: maxDate,
      days: daySpan,
    },
  };
};

