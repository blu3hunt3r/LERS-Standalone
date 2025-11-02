/**
 * TASK 4.2.2: Community Visualization - Colored backgrounds and labels
 */

import React from 'react';
import { Node } from '../types';
import { getCommunityColor } from '../utils/colorUtils';

interface CommunityVisualizationProps {
  communities: Map<number, string[]>;
  nodes: Node[];
  zoom: number;
  pan: { x: number; y: number };
}

export const CommunityVisualization: React.FC<CommunityVisualizationProps> = ({
  communities,
  nodes,
  zoom,
  pan,
}) => {
  const calculateCommunityBounds = (nodeIds: string[]) => {
    const communityNodes = nodes.filter(n => nodeIds.includes(n.id));
    if (communityNodes.length === 0) return null;

    const xs = communityNodes.map(n => n.x);
    const ys = communityNodes.map(n => n.y);

    const padding = 40;
    return {
      x: Math.min(...xs) - padding,
      y: Math.min(...ys) - padding,
      width: Math.max(...xs) - Math.min(...xs) + padding * 2,
      height: Math.max(...ys) - Math.min(...ys) + padding * 2,
    };
  };

  return (
    <g className="communities-layer">
      {Array.from(communities.entries()).map(([communityId, nodeIds]) => {
        const bounds = calculateCommunityBounds(nodeIds);
        if (!bounds || nodeIds.length < 2) return null; // Don't draw for single nodes

        const color = getCommunityColor(communityId);

        return (
          <g key={communityId}>
            {/* Community background */}
            <rect
              x={bounds.x}
              y={bounds.y}
              width={bounds.width}
              height={bounds.height}
              rx="20"
              fill={color}
              stroke={color.replace('0.1)', '0.3)')}
              strokeWidth="2"
              strokeDasharray="5,5"
            />

            {/* Community label */}
            <g transform={`translate(${bounds.x + 10}, ${bounds.y + 20})`}>
              <rect
                x="-5"
                y="-12"
                width="80"
                height="18"
                rx="9"
                fill="white"
                stroke={color.replace('0.1)', '0.5)')}
                strokeWidth="1"
              />
              <text
                fill="#374151"
                fontSize="11"
                fontWeight="600"
              >
                Group {communityId + 1}
              </text>
              <text
                y="10"
                fill="#6B7280"
                fontSize="9"
              >
                {nodeIds.length} entities
              </text>
            </g>
          </g>
        );
      })}
    </g>
  );
};

