import React, { useEffect, useRef, useState } from 'react';
import cytoscape, { Core, NodeSingular, EdgeSingular, EventObject } from 'cytoscape';
import fcose from 'cytoscape-fcose';
import contextMenus from 'cytoscape-context-menus';
import 'cytoscape-context-menus/cytoscape-context-menus.css';
import { Entity, EntityRelationship } from '@/services/investigationService';

// Register extensions
cytoscape.use(fcose);
cytoscape.use(contextMenus);

interface CytoscapeGraphProps {
  entities: Entity[];
  relationships: EntityRelationship[];
  onNodeClick?: (entity: Entity) => void;
  onNodeRightClick?: (entity: Entity, actions: string[]) => void;
  onExecuteTransform?: (transformId: string, entityId: string) => void;
  onCreateNode?: (position: { x: number; y: number }) => void;
  onCreateLink?: (sourceId: string, targetId: string) => void;
  onDeleteNode?: (entityId: string) => void;
  onDeleteLink?: (linkId: string) => void;
  onUpdateLink?: (linkId: string, updates: { label: string }) => void;
  onNodeDrag?: (entityId: string, position: { x: number; y: number }) => void;
}

const CytoscapeGraph: React.FC<CytoscapeGraphProps> = ({
  entities,
  relationships,
  onNodeClick,
  onNodeRightClick,
  onExecuteTransform,
  onCreateNode,
  onCreateLink,
  onDeleteNode,
  onDeleteLink,
  onUpdateLink,
  onNodeDrag
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const cyRef = useRef<Core | null>(null);
  const [linkingMode, setLinkingMode] = useState(false);
  const [linkSource, setLinkSource] = useState<string | null>(null);

  // Entity type to emoji/icon mapping
  const getEntityIcon = (entityType: string): string => {
    const iconMap: Record<string, string> = {
      phone: '📱',
      email: '📧',
      account: '🏦',
      upi: '💳',
      card: '💳',
      person: '👤',
      device: '📲',
      tower: '📡',
      location: '📍',
      ip: '🌐',
      url: '🔗',
      username: '@',
      company: '🏢',
      vehicle: '🚗',
      address: '🏠',
      document: '📄'
    };
    return iconMap[entityType] || '●';
  };

  // Risk color mapping
  const getRiskColor = (riskLevel: string): string => {
    const colorMap: Record<string, string> = {
      critical: '#dc2626',
      high: '#f97316',
      medium: '#eab308',
      low: '#22c55e'
    };
    return colorMap[riskLevel] || '#6b7280';
  };

  useEffect(() => {
    if (!containerRef.current || !entities.length) return;

    // Prepare nodes
    const nodes = entities.map((entity) => ({
      data: {
        id: entity.id,
        label: entity.value,
        type: entity.entity_type,
        icon: getEntityIcon(entity.entity_type),
        risk: entity.risk_level,
        riskScore: entity.risk_score,
        confidence: entity.confidence,
        metadata: entity.metadata,
        entity: entity
      },
      position: entity.position_x && entity.position_y
        ? { x: entity.position_x, y: entity.position_y }
        : undefined
    }));

    // Prepare edges
    const edges = relationships.map((rel) => ({
      data: {
        id: rel.id,
        source: rel.source,
        target: rel.target,
        label: rel.relationship_type_display,
        type: rel.relationship_type,
        weight: rel.weight,
        confidence: rel.confidence,
        metadata: rel.metadata
      }
    }));

    // Initialize Cytoscape
    const cy = cytoscape({
      container: containerRef.current,
      elements: {
        nodes,
        edges
      },
      selectionType: 'single',
      boxSelectionEnabled: false,
      userZoomingEnabled: true,
      userPanningEnabled: true,
      style: [
        {
          selector: 'node',
          style: {
            'label': (ele: any) => `${ele.data('icon')} ${ele.data('label')}`,
            'text-valign': 'center',
            'text-halign': 'center',
            'font-size': '12px',
            'color': '#1f2937',
            'background-color': (ele: any) => getRiskColor(ele.data('risk')),
            'border-width': 2,
            'border-color': '#fff',
            'width': 60,
            'height': 60,
            'text-wrap': 'wrap',
            'text-max-width': '100px',
            'font-weight': 'bold' as any
          }
        },
        {
          selector: 'node:selected',
          style: {
            'border-color': '#3b82f6',
            'border-width': 4,
            'background-opacity': 1,
            'overlay-opacity': 0
          }
        },
        {
          selector: 'edge',
          style: {
            'width': (ele: any) => Math.max(1, ele.data('weight')),
            'line-color': '#94a3b8',
            'target-arrow-color': '#94a3b8',
            'target-arrow-shape': 'triangle',
            'curve-style': 'bezier',
            'label': (ele: any) => ele.data('label'),
            'font-size': '10px',
            'color': '#64748b',
            'text-rotation': 'autorotate',
            'text-margin-y': -10
          }
        },
        {
          selector: 'edge:selected',
          style: {
            'line-color': '#3b82f6',
            'target-arrow-color': '#3b82f6',
            'width': (ele: any) => Math.max(3, ele.data('weight') + 1)
          }
        }
      ],
      layout: {
        name: 'fcose',
        animate: true,
        animationDuration: 1000,
        randomize: false,
        nodeDimensionsIncludeLabels: true,
        idealEdgeLength: 150,
        nodeRepulsion: 4500,
        edgeElasticity: 0.45,
        nestingFactor: 0.1,
        gravity: 0.25,
        numIter: 2500,
        tile: true
      } as any,
      minZoom: 0.3,
      maxZoom: 3,
      wheelSensitivity: 0.1
    });

    cyRef.current = cy;

    // Completely disable the selection overlay circle
    cy.on('select', 'node', (event: any) => {
      const node = event.target;
      // Force overlay opacity to 0 to prevent double circle
      node.style('overlay-opacity', 0);
    });

    // Context menu for nodes
    (cy as any).contextMenus({
      menuItems: [
        {
          id: 'run-cdr',
          content: '📱 Run CDR Analysis',
          selector: 'node[type="phone"]',
          onClickFunction: (event: any) => {
            const node = event.target || event.cyTarget;
            if (onExecuteTransform) {
              onExecuteTransform('phone_to_cdr', node.data('id'));
            }
          }
        },
        {
          id: 'run-bsa',
          content: '🏦 Run Bank Statement Analysis',
          selector: 'node[type="account"]',
          onClickFunction: (event: any) => {
            const node = event.target || event.cyTarget;
            if (onExecuteTransform) {
              onExecuteTransform('bank_statement_analysis', node.data('id'));
            }
          }
        },
        {
          id: 'get-imei',
          content: '📲 Get IMEI Numbers',
          selector: 'node[type="phone"]',
          onClickFunction: (event: any) => {
            const node = event.target || event.cyTarget;
            if (onExecuteTransform) {
              onExecuteTransform('phone_to_imei', node.data('id'));
            }
          }
        },
        {
          id: 'create-link',
          content: '🔗 Create Link...',
          selector: 'node',
          onClickFunction: (event: any) => {
            const node = event.target || event.cyTarget;
            setLinkingMode(true);
            setLinkSource(node.data('id'));
            node.addClass('linking-source');
          }
        },
        {
          id: 'divider-1',
          content: '──────────',
          selector: 'node',
          disabled: true,
          onClickFunction: () => {} // Required by library even for disabled items
        },
        {
          id: 'search-cases',
          content: '🔍 Search Across Cases',
          selector: 'node',
          onClickFunction: (event: any) => {
            const node = event.target || event.cyTarget;
            console.log('Search across cases:', node.data('entity'));
          }
        },
        {
          id: 'view-details',
          content: '👁️ View Details',
          selector: 'node',
          onClickFunction: (event: any) => {
            const node = event.target || event.cyTarget;
            if (onNodeClick) {
              onNodeClick(node.data('entity'));
            }
          }
        },
        {
          id: 'delete-node',
          content: '🗑️ Delete Node',
          selector: 'node',
          onClickFunction: (event: any) => {
            const node = event.target || event.cyTarget;
            if (onDeleteNode && confirm(`Delete entity: ${node.data('label')}?`)) {
              onDeleteNode(node.data('id'));
            }
          }
        },
        // Edge (link) context menu items
        {
          id: 'edit-link',
          content: '✏️ Rename Link',
          selector: 'edge',
          onClickFunction: (event: any) => {
            const edge = event.target || event.cyTarget;
            const currentLabel = edge.data('label');
            const newLabel = prompt('Enter new relationship name:', currentLabel);
            if (newLabel && newLabel !== currentLabel && onUpdateLink) {
              onUpdateLink(edge.data('id'), { label: newLabel });
            }
          }
        },
        {
          id: 'delete-link',
          content: '🗑️ Delete Link',
          selector: 'edge',
          onClickFunction: (event: any) => {
            const edge = event.target || event.cyTarget;
            if (onDeleteLink && confirm(`Delete relationship: ${edge.data('label')}?`)) {
              onDeleteLink(edge.data('id'));
            }
          }
        }
      ],
      // Context menu for canvas (right-click empty space)
      evtType: 'cxttap',
      menuItemClasses: ['custom-context-menu-item'],
      contextMenuClasses: ['custom-context-menu']
    });

    // Canvas context menu (add node)
    cy.on('cxttap', (event: any) => {
      if (event.target === cy) {
        // Right-click on empty canvas
        const position = event.position;
        if (onCreateNode && confirm('Add new entity here?')) {
          onCreateNode(position);
        }
      }
    });

    // Node click
    cy.on('tap', 'node', (event: EventObject) => {
      const node = event.target as NodeSingular;
      
      if (linkingMode && linkSource) {
        // Complete the link
        const targetId = node.data('id');
        if (linkSource !== targetId && onCreateLink) {
          onCreateLink(linkSource, targetId);
        }
        cy.$('.linking-source').removeClass('linking-source');
        setLinkingMode(false);
        setLinkSource(null);
      } else {
        if (onNodeClick) {
          onNodeClick(node.data('entity'));
        }
      }
    });

    // Node drag end - save position
    cy.on('dragfree', 'node', (event: EventObject) => {
      const node = event.target as NodeSingular;
      const position = node.position();
      if (onNodeDrag) {
        onNodeDrag(node.data('id'), position);
      }
    });

    // Keyboard shortcuts
    document.addEventListener('keydown', (e: KeyboardEvent) => {
      if (e.key === 'Escape' && linkingMode) {
        cy.$('.linking-source').removeClass('linking-source');
        setLinkingMode(false);
        setLinkSource(null);
      }
    });

    return () => {
      cy.destroy();
    };
  }, [entities, relationships]);

  // Auto-arrange layout
  const autoArrange = () => {
    if (cyRef.current) {
      cyRef.current.layout({
        name: 'fcose',
        animate: true,
        animationDuration: 1000
      } as any).run();
    }
  };

  // Fit to view
  const fitView = () => {
    if (cyRef.current) {
      cyRef.current.fit(undefined, 50);
    }
  };

  return (
    <div className="relative w-full h-full">
      <div ref={containerRef} className="w-full h-full bg-gray-50 rounded-lg border border-gray-200" />
      
      {/* Control buttons */}
      <div className="absolute top-4 right-4 flex gap-2">
        <button
          onClick={autoArrange}
          className="px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 shadow-sm"
        >
          🔄 Auto-Arrange
        </button>
        <button
          onClick={fitView}
          className="px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 shadow-sm"
        >
          🎯 Fit View
        </button>
      </div>

      {/* Linking mode indicator */}
      {linkingMode && (
        <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 px-4 py-2 bg-slate-700 text-white rounded-lg shadow-lg">
          🔗 Click another node to create link (ESC to cancel)
        </div>
      )}
    </div>
  );
};

export default CytoscapeGraph;

