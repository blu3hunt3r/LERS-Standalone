/**
 * TASK 3.1.3: Mini-Map Navigator - Overview map with viewport control
 */

import React, { useRef } from 'react';
import { Node, Link, Viewport } from '../types';

interface MiniMapProps {
  nodes: Node[];
  links: Link[];
  viewport: Viewport;
  width?: number;
  height?: number;
  onViewportChange?: (x: number, y: number) => void;
}

export const MiniMap: React.FC<MiniMapProps> = ({
  nodes,
  links,
  viewport,
  width = 200,
  height = 150,
  onViewportChange,
}) => {
  const svgRef = useRef<SVGSVGElement>(null);

  // Calculate graph bounds
  const bounds = React.useMemo(() => {
    if (nodes.length === 0) return { minX: 0, maxX: 100, minY: 0, maxY: 100 };
    
    const xs = nodes.map(n => n.x);
    const ys = nodes.map(n => n.y);
    return {
      minX: Math.min(...xs) - 50,
      maxX: Math.max(...xs) + 50,
      minY: Math.min(...ys) - 50,
      maxY: Math.max(...ys) + 50,
    };
  }, [nodes]);

  // Calculate scale to fit graph in minimap
  const scale = Math.min(
    width / (bounds.maxX - bounds.minX),
    height / (bounds.maxY - bounds.minY)
  ) * 0.9;

  // Transform coordinate to minimap space
  const transform = (x: number, y: number) => ({
    x: (x - bounds.minX) * scale + (width * 0.05),
    y: (y - bounds.minY) * scale + (height * 0.05),
  });

  // Viewport rectangle in graph coordinates
  const viewportWidth = window.innerWidth / viewport.zoom;
  const viewportHeight = window.innerHeight / viewport.zoom;
  const viewportX = -viewport.x / viewport.zoom;
  const viewportY = -viewport.y / viewport.zoom;

  const viewportRect = {
    x: (viewportX - bounds.minX) * scale + (width * 0.05),
    y: (viewportY - bounds.minY) * scale + (height * 0.05),
    width: viewportWidth * scale,
    height: viewportHeight * scale,
  };

  const handleClick = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!onViewportChange) return;
    
    const rect = svgRef.current?.getBoundingClientRect();
    if (!rect) return;

    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;

    // Convert minimap coordinates back to graph coordinates
    const graphX = (clickX - width * 0.05) / scale + bounds.minX;
    const graphY = (clickY - height * 0.05) / scale + bounds.minY;

    // Center viewport on clicked position
    onViewportChange(
      -(graphX * viewport.zoom) + window.innerWidth / 2,
      -(graphY * viewport.zoom) + window.innerHeight / 2
    );
  };

  return (
    <div className="absolute bottom-6 left-6 bg-white rounded-lg shadow-lg border border-gray-200 overflow-hidden">
      <svg
        ref={svgRef}
        width={width}
        height={height}
        className="cursor-pointer"
        onClick={handleClick}
      >
        {/* Background */}
        <rect width={width} height={height} fill="#F9FAFB" />

        {/* Links */}
        {links.map(link => {
          const source = nodes.find(n => n.id === link.source);
          const target = nodes.find(n => n.id === link.target);
          if (!source || !target) return null;
          
          const s = transform(source.x, source.y);
          const t = transform(target.x, target.y);
          
          return (
            <line
              key={link.id}
              x1={s.x}
              y1={s.y}
              x2={t.x}
              y2={t.y}
              stroke="#D1D5DB"
              strokeWidth="1"
            />
          );
        })}

        {/* Nodes */}
        {nodes.map(node => {
          const pos = transform(node.x, node.y);
          return (
            <circle
              key={node.id}
              cx={pos.x}
              cy={pos.y}
              r={2}
              fill="#6B7280"
            />
          );
        })}

        {/* Viewport rectangle */}
        <rect
          x={viewportRect.x}
          y={viewportRect.y}
          width={viewportRect.width}
          height={viewportRect.height}
          fill="rgba(59, 130, 246, 0.1)"
          stroke="#3B82F6"
          strokeWidth="2"
          rx="2"
        />
      </svg>

      {/* Label */}
      <div className="px-2 py-1 bg-white border-t border-gray-200">
        <span className="text-xs text-gray-500">Overview</span>
      </div>
    </div>
  );
};

