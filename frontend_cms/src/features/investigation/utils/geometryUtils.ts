/**
 * Phase 5, Feature 2: Geometry Utilities
 *
 * Pure functions for geometric calculations and graph traversal.
 * Extracted from InvestigationWorkbenchTab.tsx (lines 398-467).
 */

import type { Node, Link } from '../types';

// ============================================================================
// GEOMETRIC CALCULATIONS
// ============================================================================

/**
 * Calculate dynamic attachment point on entity edge
 *
 * Given a center point, target point, and radius, calculates where
 * a line should attach to the circle's edge.
 *
 * @param centerX - X coordinate of circle center
 * @param centerY - Y coordinate of circle center
 * @param targetX - X coordinate of target point
 * @param targetY - Y coordinate of target point
 * @param radius - Circle radius
 * @returns Attachment point coordinates
 *
 * @example
 * ```typescript
 * const point = getAttachmentPoint(100, 100, 200, 150, 30);
 * // Returns point on circle edge pointing toward (200, 150)
 * ```
 */
export function getAttachmentPoint(
  centerX: number,
  centerY: number,
  targetX: number,
  targetY: number,
  radius: number
): { x: number; y: number } {
  const dx = targetX - centerX;
  const dy = targetY - centerY;
  const angle = Math.atan2(dy, dx);

  return {
    x: centerX + radius * Math.cos(angle),
    y: centerY + radius * Math.sin(angle),
  };
}

/**
 * Calculate distance between two points
 */
export function getDistance(
  x1: number,
  y1: number,
  x2: number,
  y2: number
): number {
  const dx = x2 - x1;
  const dy = y2 - y1;
  return Math.sqrt(dx * dx + dy * dy);
}

/**
 * Calculate midpoint between two points
 */
export function getMidpoint(
  x1: number,
  y1: number,
  x2: number,
  y2: number
): { x: number; y: number } {
  return {
    x: (x1 + x2) / 2,
    y: (y1 + y2) / 2,
  };
}

/**
 * Calculate angle between two points in radians
 */
export function getAngle(
  x1: number,
  y1: number,
  x2: number,
  y2: number
): number {
  return Math.atan2(y2 - y1, x2 - x1);
}

/**
 * Calculate angle in degrees (0-360)
 */
export function getAngleDegrees(
  x1: number,
  y1: number,
  x2: number,
  y2: number
): number {
  const radians = getAngle(x1, y1, x2, y2);
  let degrees = radians * (180 / Math.PI);
  if (degrees < 0) degrees += 360;
  return degrees;
}

/**
 * Check if a point is inside a circle
 */
export function isPointInCircle(
  pointX: number,
  pointY: number,
  circleX: number,
  circleY: number,
  radius: number
): boolean {
  const distance = getDistance(pointX, pointY, circleX, circleY);
  return distance <= radius;
}

/**
 * Check if a point is inside a rectangle
 */
export function isPointInRect(
  pointX: number,
  pointY: number,
  rectX: number,
  rectY: number,
  rectWidth: number,
  rectHeight: number
): boolean {
  return (
    pointX >= rectX &&
    pointX <= rectX + rectWidth &&
    pointY >= rectY &&
    pointY <= rectY + rectHeight
  );
}

/**
 * Calculate bounding box for a set of nodes
 */
export function getBoundingBox(nodes: Node[]): {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
  width: number;
  height: number;
  centerX: number;
  centerY: number;
} {
  if (nodes.length === 0) {
    return {
      minX: 0,
      minY: 0,
      maxX: 0,
      maxY: 0,
      width: 0,
      height: 0,
      centerX: 0,
      centerY: 0,
    };
  }

  const xs = nodes.map(n => n.x ?? 0);
  const ys = nodes.map(n => n.y ?? 0);

  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);

  const width = maxX - minX;
  const height = maxY - minY;

  return {
    minX,
    minY,
    maxX,
    maxY,
    width,
    height,
    centerX: minX + width / 2,
    centerY: minY + height / 2,
  };
}

// ============================================================================
// PATH & TRAVERSAL FUNCTIONS
// ============================================================================

/**
 * Highlight the transaction chain (both upstream and downstream) from a node
 *
 * Uses BFS to find all nodes and links in the transaction chain,
 * both where money came from and where it went to.
 *
 * @param startNodeId - Starting node ID
 * @param nodes - All graph nodes
 * @param links - All graph links
 * @returns Sets of highlighted node IDs and link IDs
 *
 * @example
 * ```typescript
 * const { nodeIds, linkIds } = highlightTransactionChain('node-123', nodes, links);
 * console.log(`Highlighted ${nodeIds.size} nodes and ${linkIds.size} links`);
 * ```
 */
export function highlightTransactionChain(
  startNodeId: string,
  nodes: Node[],
  links: Link[]
): {
  nodeIds: Set<string>;
  linkIds: Set<string>;
} {
  const highlightedNodeIds = new Set<string>([startNodeId]);
  const highlightedLinkIds = new Set<string>();

  // STEP 1: Find all DOWNSTREAM nodes (where money went TO)
  const downstreamQueue = [startNodeId];
  const downstreamVisited = new Set<string>([startNodeId]);

  while (downstreamQueue.length > 0) {
    const currentId = downstreamQueue.shift()!;

    // Find all links where current node is the source
    links.forEach(link => {
      if (link.source === currentId && !downstreamVisited.has(link.target)) {
        highlightedLinkIds.add(link.id);
        highlightedNodeIds.add(link.target);
        downstreamVisited.add(link.target);
        downstreamQueue.push(link.target);
      }
    });
  }

  // STEP 2: Find all UPSTREAM nodes (where money came FROM)
  const upstreamQueue = [startNodeId];
  const upstreamVisited = new Set<string>([startNodeId]);

  while (upstreamQueue.length > 0) {
    const currentId = upstreamQueue.shift()!;

    // Find all links where current node is the target
    links.forEach(link => {
      if (link.target === currentId && !upstreamVisited.has(link.source)) {
        highlightedLinkIds.add(link.id);
        highlightedNodeIds.add(link.source);
        upstreamVisited.add(link.source);
        upstreamQueue.push(link.source);
      }
    });
  }

  return {
    nodeIds: highlightedNodeIds,
    linkIds: highlightedLinkIds,
  };
}

/**
 * Get all downstream nodes (where money/data flows TO)
 *
 * @param startNodeId - Starting node ID
 * @param links - All graph links
 * @param maxDepth - Optional maximum depth (default: unlimited)
 * @returns Set of downstream node IDs
 */
export function getDownstreamNodes(
  startNodeId: string,
  links: Link[],
  maxDepth: number = Infinity
): Set<string> {
  const visited = new Set<string>([startNodeId]);
  const queue: Array<{ id: string; depth: number }> = [{ id: startNodeId, depth: 0 }];

  while (queue.length > 0) {
    const { id: currentId, depth } = queue.shift()!;

    if (depth >= maxDepth) continue;

    links.forEach(link => {
      if (link.source === currentId && !visited.has(link.target)) {
        visited.add(link.target);
        queue.push({ id: link.target, depth: depth + 1 });
      }
    });
  }

  visited.delete(startNodeId); // Don't include starting node
  return visited;
}

/**
 * Get all upstream nodes (where money/data flows FROM)
 *
 * @param startNodeId - Starting node ID
 * @param links - All graph links
 * @param maxDepth - Optional maximum depth (default: unlimited)
 * @returns Set of upstream node IDs
 */
export function getUpstreamNodes(
  startNodeId: string,
  links: Link[],
  maxDepth: number = Infinity
): Set<string> {
  const visited = new Set<string>([startNodeId]);
  const queue: Array<{ id: string; depth: number }> = [{ id: startNodeId, depth: 0 }];

  while (queue.length > 0) {
    const { id: currentId, depth } = queue.shift()!;

    if (depth >= maxDepth) continue;

    links.forEach(link => {
      if (link.target === currentId && !visited.has(link.source)) {
        visited.add(link.source);
        queue.push({ id: link.source, depth: depth + 1 });
      }
    });
  }

  visited.delete(startNodeId); // Don't include starting node
  return visited;
}

/**
 * Get immediate neighbors (both incoming and outgoing connections)
 *
 * @param nodeId - Node ID
 * @param links - All graph links
 * @returns Set of neighbor node IDs
 */
export function getNeighbors(nodeId: string, links: Link[]): Set<string> {
  const neighbors = new Set<string>();

  links.forEach(link => {
    if (link.source === nodeId) {
      neighbors.add(link.target);
    } else if (link.target === nodeId) {
      neighbors.add(link.source);
    }
  });

  return neighbors;
}

/**
 * Get degree (connection count) of a node
 *
 * @param nodeId - Node ID
 * @param links - All graph links
 * @returns Number of connections
 */
export function getDegree(nodeId: string, links: Link[]): number {
  return links.filter(link => link.source === nodeId || link.target === nodeId).length;
}

/**
 * Get in-degree (incoming connections)
 */
export function getInDegree(nodeId: string, links: Link[]): number {
  return links.filter(link => link.target === nodeId).length;
}

/**
 * Get out-degree (outgoing connections)
 */
export function getOutDegree(nodeId: string, links: Link[]): number {
  return links.filter(link => link.source === nodeId).length;
}

/**
 * Check if two nodes are connected (directly or indirectly)
 */
export function areNodesConnected(
  nodeId1: string,
  nodeId2: string,
  links: Link[]
): boolean {
  // BFS to find if nodeId2 is reachable from nodeId1
  const visited = new Set<string>();
  const queue = [nodeId1];

  while (queue.length > 0) {
    const currentId = queue.shift()!;
    if (currentId === nodeId2) return true;
    if (visited.has(currentId)) continue;

    visited.add(currentId);

    links.forEach(link => {
      if (link.source === currentId && !visited.has(link.target)) {
        queue.push(link.target);
      }
      // Also check reverse direction
      if (link.target === currentId && !visited.has(link.source)) {
        queue.push(link.source);
      }
    });
  }

  return false;
}

/**
 * Find nodes within a viewport/bounding box
 *
 * @param nodes - All nodes
 * @param viewport - Viewport bounds
 * @returns Nodes within the viewport
 */
export function getNodesInViewport(
  nodes: Node[],
  viewport: {
    x: number;
    y: number;
    width: number;
    height: number;
    zoom: number;
  }
): Node[] {
  // Transform viewport bounds to graph coordinates
  const viewportLeft = -viewport.x / viewport.zoom;
  const viewportTop = -viewport.y / viewport.zoom;
  const viewportRight = viewportLeft + viewport.width / viewport.zoom;
  const viewportBottom = viewportTop + viewport.height / viewport.zoom;

  // Add padding for node radius
  const padding = 100;

  return nodes.filter(node => {
    const x = node.x ?? 0;
    const y = node.y ?? 0;

    return (
      x >= viewportLeft - padding &&
      x <= viewportRight + padding &&
      y >= viewportTop - padding &&
      y <= viewportBottom + padding
    );
  });
}

/**
 * Find links connected to visible nodes
 *
 * @param links - All links
 * @param visibleNodeIds - Set of visible node IDs
 * @returns Links where both source and target are visible
 */
export function getLinksForVisibleNodes(
  links: Link[],
  visibleNodeIds: Set<string>
): Link[] {
  return links.filter(
    link => visibleNodeIds.has(link.source) && visibleNodeIds.has(link.target)
  );
}

// ============================================================================
// FINANCIAL ANALYSIS HELPERS
// ============================================================================

/**
 * Calculate total money flow through a node
 *
 * @param nodeId - Node ID
 * @param links - All graph links with optional amount field
 * @returns Object with incoming, outgoing, and total amounts
 */
export function getMoneyFlow(nodeId: string, links: Link[]): {
  incoming: number;
  outgoing: number;
  total: number;
} {
  let incoming = 0;
  let outgoing = 0;

  links.forEach(link => {
    const amount = link.amount || 0;
    if (link.target === nodeId) {
      incoming += amount;
    } else if (link.source === nodeId) {
      outgoing += amount;
    }
  });

  return {
    incoming,
    outgoing,
    total: incoming + outgoing,
  };
}

/**
 * Extract bank key from node metadata
 *
 * Used for bank clustering in layout algorithms.
 *
 * @param node - Node with optional bank metadata
 * @returns Bank identifier string
 */
export function getBankKey(node: Node): string {
  const bankName = node.metadata?.bank_name || node.metadata?.bank || node.metadata?.institution;
  const ifsc = node.metadata?.ifsc_code || node.metadata?.ifsc;

  if (bankName && ifsc) return `${bankName} (${ifsc})`;
  if (bankName) return bankName;
  if (ifsc) return `IFSC ${ifsc}`;
  return 'Unknown Bank';
}
