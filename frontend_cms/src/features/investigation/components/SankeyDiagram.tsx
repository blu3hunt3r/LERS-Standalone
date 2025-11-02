/**
 * TASK 3.2.2: Sankey Diagram Component - D3.js flow visualization
 */

import React, { useEffect, useRef } from 'react';

interface SankeyDiagramProps {
  data: {
    nodes: { node: number; name: string; value: number }[];
    links: { source: number; target: number; value: number }[];
  };
  width?: number;
  height?: number;
}

export const SankeyDiagram: React.FC<SankeyDiagramProps> = ({
  data,
  width = 800,
  height = 600,
}) => {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!svgRef.current || !data.nodes.length) return;

    // In production, use D3.js sankey library
    // import * as d3 from 'd3';
    // import { sankey, sankeyLinkHorizontal } from 'd3-sankey';

    // For now, render simple placeholder
    const svg = svgRef.current;
    svg.innerHTML = ''; // Clear previous

    // Simple placeholder visualization
    const nodeHeight = 40;
    const nodeGap = 20;
    const layerWidth = width / 3;

    data.nodes.forEach((node, idx) => {
      const x = (node.node % 3) * layerWidth + 50;
      const y = Math.floor(node.node / 3) * (nodeHeight + nodeGap) + 50;

      // Draw node rectangle
      const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
      rect.setAttribute('x', x.toString());
      rect.setAttribute('y', y.toString());
      rect.setAttribute('width', '100');
      rect.setAttribute('height', nodeHeight.toString());
      rect.setAttribute('fill', '#3B82F6');
      rect.setAttribute('rx', '4');
      svg.appendChild(rect);

      // Draw node label
      const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      text.setAttribute('x', (x + 50).toString());
      text.setAttribute('y', (y + nodeHeight / 2).toString());
      text.setAttribute('text-anchor', 'middle');
      text.setAttribute('dominant-baseline', 'middle');
      text.setAttribute('fill', 'white');
      text.setAttribute('font-size', '12');
      text.textContent = node.name;
      svg.appendChild(text);
    });

    // Draw links (simple lines)
    data.links.forEach(link => {
      const sourceNode = data.nodes[link.source];
      const targetNode = data.nodes[link.target];
      
      const x1 = (sourceNode.node % 3) * layerWidth + 150;
      const y1 = Math.floor(sourceNode.node / 3) * (nodeHeight + nodeGap) + 50 + nodeHeight / 2;
      const x2 = (targetNode.node % 3) * layerWidth + 50;
      const y2 = Math.floor(targetNode.node / 3) * (nodeHeight + nodeGap) + 50 + nodeHeight / 2;

      const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      const d = `M ${x1},${y1} L ${x2},${y2}`;
      path.setAttribute('d', d);
      path.setAttribute('stroke', '#CBD5E1');
      path.setAttribute('stroke-width', Math.max(2, Math.log(link.value)).toString());
      path.setAttribute('fill', 'none');
      path.setAttribute('opacity', '0.5');
      svg.appendChild(path);
    });

  }, [data, width, height]);

  return (
    <div className="w-full overflow-auto">
      <svg
        ref={svgRef}
        width={width}
        height={height}
        className="border border-gray-200 rounded"
      />
      <p className="text-xs text-slate-500 mt-2 text-center">
        Money flow visualization (use D3-Sankey for production)
      </p>
    </div>
  );
};

