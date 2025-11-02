/**
 * TASK 4.1.2: Focus Mode - 1-hop neighbor filtering with dim effect
 */

import { Node, Link } from '../types';

/**
 * Get 1-hop neighbors of a node (nodes directly connected)
 */
export const getOneHopNeighbors = (
  nodeId: string,
  links: Link[]
): Set<string> => {
  const neighbors = new Set<string>([nodeId]); // Include the focused node itself
  
  links.forEach(link => {
    if (link.source === nodeId) {
      neighbors.add(link.target);
    }
    if (link.target === nodeId) {
      neighbors.add(link.source);
    }
  });
  
  return neighbors;
};

/**
 * Calculate opacity for nodes based on focus mode
 */
export const getFocusOpacity = (
  nodeId: string,
  focusedNodeId: string | null,
  links: Link[]
): number => {
  if (!focusedNodeId) return 1; // No focus mode active
  
  const neighbors = getOneHopNeighbors(focusedNodeId, links);
  return neighbors.has(nodeId) ? 1 : 0.15; // Dim non-neighbors to 15%
};

/**
 * Get filtered links for focus mode (only links between visible nodes)
 */
export const getFocusedLinks = (
  focusedNodeId: string | null,
  links: Link[]
): Link[] => {
  if (!focusedNodeId) return links;
  
  const neighbors = getOneHopNeighbors(focusedNodeId, links);
  
  return links.filter(link =>
    neighbors.has(link.source) && neighbors.has(link.target)
  );
};

