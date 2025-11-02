/**
 * ============================================================================
 * GRAPH HIERARCHY UTILITIES - Maltego-style entity expansion
 * ============================================================================
 * Functions for adding parents, children, neighbors, siblings, paths
 */

import { Node, Link } from '../types';
import { findShortestPath } from './graphAlgorithms';

/**
 * Get all parent entities of selected nodes
 * Parent = entity that has outgoing link TO the selected node
 */
export const getParents = (selectedNodeIds: string[], nodes: Node[], links: Link[]): string[] => {
  const parents = new Set<string>();
  
  selectedNodeIds.forEach(nodeId => {
    links.forEach(link => {
      // If link points TO this node, the source is a parent
      if (link.target === nodeId && !selectedNodeIds.includes(link.source)) {
        parents.add(link.source);
      }
    });
  });
  
  return Array.from(parents);
};

/**
 * Get all child entities of selected nodes
 * Child = entity that has incoming link FROM the selected node
 */
export const getChildren = (selectedNodeIds: string[], nodes: Node[], links: Link[]): string[] => {
  const children = new Set<string>();
  
  selectedNodeIds.forEach(nodeId => {
    links.forEach(link => {
      // If link originates FROM this node, the target is a child
      if (link.source === nodeId && !selectedNodeIds.includes(link.target)) {
        children.add(link.target);
      }
    });
  });
  
  return Array.from(children);
};

/**
 * Get all neighbors (1-hop connected entities)
 * Neighbor = any entity connected by a link (parent OR child)
 */
export const getNeighbors = (selectedNodeIds: string[], nodes: Node[], links: Link[]): string[] => {
  const neighbors = new Set<string>();
  
  selectedNodeIds.forEach(nodeId => {
    links.forEach(link => {
      if (link.source === nodeId && !selectedNodeIds.includes(link.target)) {
        neighbors.add(link.target);
      }
      if (link.target === nodeId && !selectedNodeIds.includes(link.source)) {
        neighbors.add(link.source);
      }
    });
  });
  
  return Array.from(neighbors);
};

/**
 * Get all sibling entities (share the same parent)
 * Sibling = entities that have a common parent entity
 */
export const getSiblings = (selectedNodeIds: string[], nodes: Node[], links: Link[]): string[] => {
  const siblings = new Set<string>();
  
  // First, find all parents of selected nodes
  const parents = getParents(selectedNodeIds, nodes, links);
  
  // Then, find all children of those parents (excluding selected nodes)
  parents.forEach(parentId => {
    links.forEach(link => {
      if (link.source === parentId && !selectedNodeIds.includes(link.target)) {
        siblings.add(link.target);
      }
    });
  });
  
  return Array.from(siblings);
};

/**
 * Get all leaf nodes (terminal nodes with no children)
 */
export const getLeaves = (nodes: Node[], links: Link[]): string[] => {
  const nodeIds = new Set(nodes.map(n => n.id));
  const nodesWithChildren = new Set<string>();
  
  links.forEach(link => {
    nodesWithChildren.add(link.source);
  });
  
  return nodes
    .filter(node => !nodesWithChildren.has(node.id))
    .map(node => node.id);
};

/**
 * Select all entities of a specific type
 */
export const getNodesByType = (nodes: Node[], entityType: string): string[] => {
  return nodes
    .filter(node => node.type === entityType)
    .map(node => node.id);
};

/**
 * Select all entities by multiple types
 */
export const getNodesByTypes = (nodes: Node[], entityTypes: string[]): string[] => {
  return nodes
    .filter(node => entityTypes.includes(node.type))
    .map(node => node.id);
};

/**
 * Select all entities within a risk level
 */
export const getNodesByRiskLevel = (nodes: Node[], riskLevel: string): string[] => {
  return nodes
    .filter(node => node.risk_level === riskLevel)
    .map(node => node.id);
};

/**
 * Find and add shortest path between two nodes
 */
export const addShortestPath = (
  sourceId: string,
  targetId: string,
  nodes: Node[],
  links: Link[]
): string[] => {
  const pathResult = findShortestPath(nodes, links, sourceId, targetId);
  return pathResult ? pathResult.nodes : [];
};

/**
 * Get all entities within N hops of selected nodes
 */
export const getEntitiesWithinHops = (
  selectedNodeIds: string[],
  nodes: Node[],
  links: Link[],
  maxHops: number
): string[] => {
  const visited = new Set<string>(selectedNodeIds);
  const queue: Array<{ id: string; depth: number }> = selectedNodeIds.map(id => ({ id, depth: 0 }));
  
  while (queue.length > 0) {
    const { id, depth } = queue.shift()!;
    
    if (depth >= maxHops) continue;
    
    links.forEach(link => {
      let nextId: string | null = null;
      
      if (link.source === id && !visited.has(link.target)) {
        nextId = link.target;
      } else if (link.target === id && !visited.has(link.source)) {
        nextId = link.source;
      }
      
      if (nextId) {
        visited.add(nextId);
        queue.push({ id: nextId, depth: depth + 1 });
      }
    });
  }
  
  return Array.from(visited);
};

/**
 * Get incoming entities (entities that link TO selected nodes)
 */
export const getIncomingEntities = (selectedNodeIds: string[], links: Link[]): string[] => {
  const incoming = new Set<string>();
  
  selectedNodeIds.forEach(nodeId => {
    links.forEach(link => {
      if (link.target === nodeId && !selectedNodeIds.includes(link.source)) {
        incoming.add(link.source);
      }
    });
  });
  
  return Array.from(incoming);
};

/**
 * Get outgoing entities (entities that selected nodes link TO)
 */
export const getOutgoingEntities = (selectedNodeIds: string[], links: Link[]): string[] => {
  const outgoing = new Set<string>();
  
  selectedNodeIds.forEach(nodeId => {
    links.forEach(link => {
      if (link.source === nodeId && !selectedNodeIds.includes(link.target)) {
        outgoing.add(link.target);
      }
    });
  });
  
  return Array.from(outgoing);
};

/**
 * Calculate centrality score for each node (used for Centrality layout)
 */
export const calculateCentrality = (nodes: Node[], links: Link[]): Map<string, number> => {
  const centrality = new Map<string, number>();
  
  // Initialize all nodes with 0
  nodes.forEach(node => centrality.set(node.id, 0));
  
  // Count connections (degree centrality)
  links.forEach(link => {
    centrality.set(link.source, (centrality.get(link.source) || 0) + 1);
    centrality.set(link.target, (centrality.get(link.target) || 0) + 1);
  });
  
  return centrality;
};

/**
 * Group nodes by entity type for Block layout
 */
export const groupNodesByType = (nodes: Node[]): Map<string, string[]> => {
  const groups = new Map<string, string[]>();
  
  nodes.forEach(node => {
    if (!groups.has(node.type)) {
      groups.set(node.type, []);
    }
    groups.get(node.type)!.push(node.id);
  });
  
  return groups;
};

