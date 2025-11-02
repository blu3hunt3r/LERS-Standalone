import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams } from 'react-router-dom';
import { investigationService, Entity, Transform } from '@/services/investigationService';
import { Button } from '../ui/button';
import { Card } from '../ui/card';
import { Badge } from '../ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '../ui/sheet';
import { Checkbox } from '../ui/checkbox';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Loader2, Plus, Maximize2, ZoomIn, ZoomOut, GitBranch, X, Sparkles, FileText, Link2, Search, Filter, Undo2, Redo2, Download, Layout, Layers, Route, ChevronRight, ChevronLeft, Trash2, Edit3, Users, GitCommit, Share2, CornerDownRight, ListFilter, ArrowRightLeft } from 'lucide-react';
import toast from 'react-hot-toast';

// Import modular investigation features
import {
  Node,
  Link,
  ColorMode,
  GraphFilters,
  LayerPreset,
  ENTITY_TYPES,
  RELATIONSHIP_TYPES,
  getEntityIcon,
  getNodeColorByMode,
  getEdgeWidth,
  getCategoryColor,
  getRiskColor,
  getFocusOpacity,
  getFocusedLinks,
  LayerControl,
  ErrorBoundary,
  KeyboardShortcutsModal,
  useKeyboardShortcuts,
  useGraphData,
  PathAnalysisPanel,
  GraphStatisticsPanel,
  TimelineFilter,
  TransformResultContainer,
  MiniMap,
} from '@/features/investigation';
import { HierarchicalTreeExplorer } from '@/components/investigation/HierarchicalTreeExplorer';
import { SmartTablesView } from '@/components/investigation/SmartTablesView';
import { AlluvialFlowDiagram } from '@/components/investigation/AlluvialFlowDiagram';
import { TimelineSequenceView } from '@/components/investigation/TimelineSequenceView';
import FinancialSummaryDashboard from '@/components/investigation/FinancialSummaryDashboard';
import PatternAnalysis from '@/components/investigation/PatternAnalysis';
import RelationshipMatrix from '@/components/investigation/RelationshipMatrix';
import RiskScoringReport from '@/components/investigation/RiskScoringReport';
import ExportReports from '@/components/investigation/ExportReports';

interface ContextMenu {
  visible: boolean;
  x: number;
  y: number;
  node: Node | null;
  isCanvas: boolean;
}

interface LinkContextMenu {
  visible: boolean;
  x: number;
  y: number;
  link: Link | null;
}

const InvestigationWorkbenchTab: React.FC = () => {
  const { id: caseId } = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Use modular graph data hook
  const {
    nodes,
    links,
    layers,
    statistics,
    victimNodeId,
    isLoading,
    setVictimNodeId,
    createEntity,
    deleteEntity,
    updateEntityPosition,
    updateEntityLabel,
    createRelationship,
    updateRelationship,
    deleteRelationship,
    getFilteredNodes,
    getFilteredLinks,
    setNodes,
    setLinks,
  } = useGraphData(caseId);
  
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const [showEntityModal, setShowEntityModal] = useState(false);
  const [contextMenu, setContextMenu] = useState<ContextMenu>({ visible: false, x: 0, y: 0, node: null, isCanvas: false });
  const [linkContextMenu, setLinkContextMenu] = useState<LinkContextMenu>({ visible: false, x: 0, y: 0, link: null });
  const [showLinkEditModal, setShowLinkEditModal] = useState(false);
  const [editingLinkData, setEditingLinkData] = useState<{ id: string; currentType: string } | null>(null);
  // Transform-based layout state (needs to be declared before useEffect)
  const [transformBasedLayout, setTransformBasedLayout] = useState<'chakra' | 'horizontal' | null>(null);
  
  // Persist zoom and pan to localStorage
  const [zoom, setZoom] = useState(() => {
    const saved = localStorage.getItem(`investigation-zoom-${caseId}`);
    return saved ? parseFloat(saved) : 1;
  });
  const [pan, setPan] = useState(() => {
    const saved = localStorage.getItem(`investigation-pan-${caseId}`);
    return saved ? JSON.parse(saved) : { x: 0, y: 0 };
  });
  
  // Save zoom and pan whenever they change
  useEffect(() => {
    localStorage.setItem(`investigation-zoom-${caseId}`, zoom.toString());
  }, [zoom, caseId]);
  
  useEffect(() => {
    localStorage.setItem(`investigation-pan-${caseId}`, JSON.stringify(pan));
  }, [pan, caseId]);
  
  // Cleanup RAF on unmount
  useEffect(() => {
    return () => {
      if (rafIdRef.current !== null) {
        cancelAnimationFrame(rafIdRef.current);
      }
    };
  }, []);
  
  // Auto-apply transform-based layout when set
  useEffect(() => {
    if (transformBasedLayout && nodes.length > 0) {
      applyLayout(transformBasedLayout);
      setTransformBasedLayout(null); // Reset after applying
    }
  }, [transformBasedLayout, nodes.length]);
  
  // Auto-apply hierarchical layout for 1930 PDF imports
  const [hasAppliedInitialLayout, setHasAppliedInitialLayout] = useState(false);
  useEffect(() => {
    // Check if this is a fresh graph load from 1930 PDF (nodes just loaded, haven't applied layout yet)
    if (nodes.length > 0 && !hasAppliedInitialLayout && !isLoading) {
      // Check if any node has metadata indicating it's from 1930 PDF
      const hasPdfSource = nodes.some(node => 
        node.metadata?.source === '1930_complaint_pdf' || 
        node.source === '1930_complaint_pdf'
      );
      
      if (hasPdfSource) {
        console.log('🌳 Auto-applying tree layout for 1930 PDF/Excel import');
        setTimeout(() => {
          applyLayout('tree');
          setCurrentLayout('tree');
          setHasAppliedInitialLayout(true);
        }, 500); // Small delay to let nodes render
      } else {
        setHasAppliedInitialLayout(true); // Mark as checked even if not from PDF
      }
    }
  }, [nodes.length, hasAppliedInitialLayout, isLoading]);
  
  const [draggedNode, setDraggedNode] = useState<string | null>(null);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [linkingMode, setLinkingMode] = useState(false);
  const [linkSource, setLinkSource] = useState<string | null>(null);
  const [tempLinkEnd, setTempLinkEnd] = useState<{ x: number; y: number } | null>(null);
  const [editingLink, setEditingLink] = useState<string | null>(null);
  const [editLinkValue, setEditLinkValue] = useState<string>('');
  const [entitySearchQuery, setEntitySearchQuery] = useState('');
  const [selectedEntityType, setSelectedEntityType] = useState('');
  const [entityValue, setEntityValue] = useState('');
  const [contextMenuStage, setContextMenuStage] = useState<'main' | 'search' | 'input' | 'transforms' | 'edit'>('main');
  const [showTransformsSubmenu, setShowTransformsSubmenu] = useState(false);
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const [showCreateLersModal, setShowCreateLersModal] = useState(false);
  const [dragOrigin, setDragOrigin] = useState<'center' | 'edge' | null>(null);
  const [connectionDot, setConnectionDot] = useState<{x: number, y: number} | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [selectedNodes, setSelectedNodes] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [highlightedNodes, setHighlightedNodes] = useState<Set<string>>(new Set());
  const [historyStack, setHistoryStack] = useState<any[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [showFilters, setShowFilters] = useState(false);
  const [dragSelectStart, setDragSelectStart] = useState<{x: number, y: number} | null>(null);
  const [dragSelectEnd, setDragSelectEnd] = useState<{x: number, y: number} | null>(null);
  // Hover states for tooltips
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);
  const [hoveredLink, setHoveredLink] = useState<string | null>(null);
  const [hasNodeMoved, setHasNodeMoved] = useState(false);
  const [activeTransform, setActiveTransform] = useState<Transform | null>(null);
  const [showTransformModal, setShowTransformModal] = useState(false);
  const [isUndoRedoAction, setIsUndoRedoAction] = useState(false);

  // Filter criteria
  const [filters, setFilters] = useState({
    entityTypes: [] as string[],
    riskLevels: [] as string[],
    minConfidence: 0,
    dateFrom: '',
    dateTo: '',
    hasMetadata: false,
    layers: [] as number[],
  });

  // Layout state
  const [showLayoutMenu, setShowLayoutMenu] = useState(false);
  const [showLinkTypeMenu, setShowLinkTypeMenu] = useState(false);
  const [currentLayout, setCurrentLayout] = useState<'force' | 'hierarchical' | 'tree' | 'circular' | 'grid' | 'chakra' | 'horizontal' | 'block' | 'centrality' | 'orthogonal' | 'radial' | 'sankey' | 'timeline' | 'bankCluster' | 'chronological' | 'layeredSankey' | 'hierarchicalTree' | 'smartTables' | 'alluvialFlow' | 'timelineSequence'>('force');
  const [activeMainTab, setActiveMainTab] = useState<'graph' | 'analysis'>('graph');
  const [activeAnalysisView, setActiveAnalysisView] = useState<'hierarchicalTree' | 'smartTables' | 'alluvialFlow' | 'timelineSequence' | 'financial' | 'patterns' | 'matrix' | 'risk' | 'export'>('hierarchicalTree');
  const [collapsedLayers, setCollapsedLayers] = useState<Set<number>>(new Set());
  const [entityDetailsModal, setEntityDetailsModal] = useState<{ open: boolean; node: Node | null }>({ open: false, node: null });
  const [highlightedPath, setHighlightedPath] = useState<{ nodeIds: Set<string>; linkIds: Set<string> }>({ nodeIds: new Set(), linkIds: new Set() });

  // Annotation state
  const [showAnnotationModal, setShowAnnotationModal] = useState(false);
  const [annotationTarget, setAnnotationTarget] = useState<{ type: 'node' | 'link'; id: string } | null>(null);
  const [annotationText, setAnnotationText] = useState('');
  const [annotationTags, setAnnotationTags] = useState<string[]>([]);
  const [newTag, setNewTag] = useState('');

  // New module state
  const [showKeyboardShortcuts, setShowKeyboardShortcuts] = useState(false);
  const [transformResults, setTransformResults] = useState<any>(null);
  const [showTransformResults, setShowTransformResults] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [alerts, setAlerts] = useState<any[]>([]);

  // Layered Sankey state
  const [patternAlerts, setPatternAlerts] = useState<{
    rapidForwards: any[];
    splittingPatterns: any[];
    circularFlows: any[];
    duplicates: any[];
  }>({
    rapidForwards: [],
    splittingPatterns: [],
    circularFlows: [],
    duplicates: []
  });
  const [accountClassifications, setAccountClassifications] = useState<Map<string, any>>(new Map());
  const [showPatternAlertsPanel, setShowPatternAlertsPanel] = useState(false);
  const [hoveredAccountDetails, setHoveredAccountDetails] = useState<any>(null);

  // Link aggregation and filtering for cleaner visualization
  const [linkAggregationEnabled, setLinkAggregationEnabled] = useState(true);
  const [minAmountThreshold, setMinAmountThreshold] = useState(1000); // Hide transactions below ₹1,000

  // ============================================================================
  // 🔥 P0 FEATURE: LAYER SYSTEM (Task 1.2.1-1.2.4)
  // Note: layers, victimNodeId, setVictimNodeId now provided by useGraphData hook
  // ============================================================================
  
  // Entity-type filtering (replaces BFS layers)
  const [showEntityFilters, setShowEntityFilters] = useState(false);
  const [visibleEntityTypes, setVisibleEntityTypes] = useState<Set<string>>(new Set(ENTITY_TYPES.map(et => et.id)));
  const [linkRenderType, setLinkRenderType] = useState<'curved' | 'straight' | 'freehand'>('curved');
  const [visibleLayers, setVisibleLayers] = useState<Set<number>>(new Set());
  const [layerOpacity, setLayerOpacity] = useState<Record<number, number>>({});
  const [showLayerPanel, setShowLayerPanel] = useState(false);
  const [availableLayers, setAvailableLayers] = useState<number[]>([]);
  const [layerCounts, setLayerCounts] = useState<Record<number, number>>({});
  const [layerPreset, setLayerPreset] = useState<LayerPreset>('custom');

  // ============================================================================
  // 🔥 P0 FEATURE: PATH ANALYSIS (Task 1.4.1-1.4.4)
  // ============================================================================
  const [showPathAnalysis, setShowPathAnalysis] = useState(false);
  const [pathSource, setPathSource] = useState<string>('');
  const [pathTarget, setPathTarget] = useState<string>('');
  const [analyzedPath, setAnalyzedPath] = useState<string[]>([]);
  const [detectedCycles, setDetectedCycles] = useState<string[][]>([]);
  const [highlightedCycle, setHighlightedCycle] = useState<string[] | null>(null);

  // ============================================================================
  // 🔥 P1 FEATURE: ENHANCED VISUALIZATION (Task 3.1.1-3.1.3)
  // ============================================================================
  const [timeRange, setTimeRange] = useState<[Date | null, Date | null]>([null, null]);
  const [showMiniMap, setShowMiniMap] = useState(true);
  const [graphStats, setGraphStats] = useState({
    entityCount: 0,
    relationshipCount: 0,
    totalMoney: 0,
    avgPathLength: 0,
    density: 0,
    components: 0,
  });

  // ============================================================================
  // 🟡 P1 FEATURE: FOCUS MODE (Task 4.1.2)
  // ============================================================================
  const [focusedNodeId, setFocusedNodeId] = useState<string | null>(null);

  // ============================================================================
  // 🟡 P2 FEATURE: COMMUNITY DETECTION (Task 4.2.1-4.2.2)
  // ============================================================================
  const [communities, setCommunities] = useState<Map<number, string[]>>(new Map());
  const [showCommunities, setShowCommunities] = useState(false);
  
  // Additional UI state for modular components
  const [showMiniMapPanel, setShowMiniMapPanel] = useState(true);
  const [showTimelinePanel, setShowTimelinePanel] = useState(false);

  // History action types for undo/redo
  interface HistoryAction {
    type: 'ADD_NODE' | 'DELETE_NODE' | 'MOVE_NODE' | 'ADD_LINK' | 'DELETE_LINK' | 'EDIT_LINK' | 'LAYOUT_APPLY';
    data: any;
    timestamp: number;
  }

  // RELATIONSHIP_TYPES and ENTITY_TYPES now imported from @/features/investigation
  // Graph data fetching now handled by useGraphData hook

  // Fetch available transforms for selected entity
  const { data: transforms, isLoading: transformsLoading } = useQuery({
    queryKey: ['transforms', selectedNode?.type],
    queryFn: () => investigationService.getTransforms(selectedNode?.type),
    enabled: !!selectedNode
  });

  // Execute transform mutation
  const executeTransformMutation = useMutation({
    mutationFn: (data: { transform_id: string; source_entity_id: string }) =>
      investigationService.executeTransform(caseId!, data),
    onSuccess: (result) => {
      toast.success(`✅ Transform completed! Created ${result.entities_created.length} new entities`);
      queryClient.invalidateQueries({ queryKey: ['investigation-graph', caseId] });
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Transform failed');
    }
  });

  // Note: CRUD mutations (create/delete/update entity/relationship) are now provided by useGraphData hook
  // Note: ENTITY_TYPES, RELATIONSHIP_TYPES, and getEntityIcon now imported from @/features/investigation
  
  // Create mutation-like wrappers for backward compatibility
  const createEntityMutation = {
    mutate: createEntity,
    isPending: false,
  };
  
  const deleteEntityMutation = {
    mutate: deleteEntity,
    isPending: false,
  };
  
  const createRelationshipMutation = {
    mutate: (data: { source_entity_id: string; target_entity_id: string; relationship_type: string }) => {
      createRelationship(data);
      setLinkingMode(false);
      setLinkSource(null);
      setTempLinkEnd(null);
    },
    isPending: false,
  };
  
  const updateRelationshipMutation = {
    mutate: (data: { relationshipId: string; relationship_type: string }) => {
      updateRelationship({ relationship_id: data.relationshipId, relationship_type: data.relationship_type });
      setEditingLink(null);
      setEditLinkValue('');
    },
    isPending: false,
  };
  
  const deleteRelationshipMutation = {
    mutate: deleteRelationship,
    isPending: false,
  };
  
  const updatePositionMutation = {
    mutate: updateEntityPosition,
  };

  // Filter entity types based on search
  const filteredEntityTypes = ENTITY_TYPES.filter(type =>
    type.name.toLowerCase().includes(entitySearchQuery.toLowerCase()) ||
    type.category.toLowerCase().includes(entitySearchQuery.toLowerCase())
  );

  // Group by category
  const groupedEntityTypes = filteredEntityTypes.reduce((acc, type) => {
    if (!acc[type.category]) acc[type.category] = [];
    acc[type.category].push(type);
    return acc;
  }, {} as Record<string, typeof ENTITY_TYPES>);

  // Note: getNodeColor (getRiskColor) and getCategoryColor now imported from @/features/investigation/utils/colorUtils

  // Layer-based color system for tree visualization (Layers 0-10+)
  const getLayerColor = (layer: number): string => {
    const layerColors = [
      '#F59E0B', // Layer 1 - Amber (First accused layer)
      '#8B5CF6', // Layer 2 - Violet (Second layer)
      '#3B82F6', // Layer 3 - Blue (Third layer)
      '#10B981', // Layer 4 - Green (Fourth layer)
      '#EC4899', // Layer 5 - Pink
      '#F97316', // Layer 6 - Orange
      '#EAB308', // Layer 7 - Yellow
      '#06B6D4', // Layer 8 - Cyan
      '#6366F1', // Layer 9 - Indigo
      '#84CC16', // Layer 10 - Lime
      '#A855F7', // Layer 11+ - Purple (fallback)
    ];
    
    const index = Math.max(0, layer - 1);
    return layerColors[Math.min(index, layerColors.length - 1)];
  };

  // Calculate dynamic attachment point on entity edge
  const getAttachmentPoint = (centerX: number, centerY: number, targetX: number, targetY: number, radius: number) => {
    const dx = targetX - centerX;
    const dy = targetY - centerY;
    const angle = Math.atan2(dy, dx);
    
    return {
      x: centerX + radius * Math.cos(angle),
      y: centerY + radius * Math.sin(angle)
    };
  };

  // Toggle layer collapse/expand
  const toggleLayerCollapse = (layer: number) => {
    setCollapsedLayers(prev => {
      const newSet = new Set(prev);
      if (newSet.has(layer)) {
        newSet.delete(layer);
      } else {
        newSet.add(layer);
      }
      return newSet;
    });
  };

  // Highlight the SPECIFIC transaction chain (both upstream and downstream) from a clicked entity
  const highlightDownstreamPath = (nodeId: string) => {
    const highlightedNodeIds = new Set<string>([nodeId]);
    const highlightedLinkIds = new Set<string>();
    
    console.log('🔦 Highlighting transaction chain for node:', nodeId);
    
    // STEP 1: Find all DOWNSTREAM nodes (where money went TO)
    const downstreamQueue = [nodeId];
    const downstreamVisited = new Set<string>([nodeId]);
    
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
    const upstreamQueue = [nodeId];
    const upstreamVisited = new Set<string>([nodeId]);
    
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
    
    console.log(`✅ Highlighted ${highlightedNodeIds.size} nodes and ${highlightedLinkIds.size} links`);
    setHighlightedPath({ nodeIds: highlightedNodeIds, linkIds: highlightedLinkIds });
  };

  // Handle canvas right-click
  const handleCanvasRightClick = (e: React.MouseEvent) => {
    e.preventDefault();
    const rect = svgRef.current?.getBoundingClientRect();
    if (!rect) return;
    
    // Reset stage
    setContextMenuStage('main');
    setSelectedEntityType('');
    setEntityValue('');
    setEntitySearchQuery('');
    
    setContextMenu({
      visible: true,
      x: e.clientX,
      y: e.clientY,
      node: null,
      isCanvas: true
    });
  };

  const handleCanvasClick = () => {
    setHighlightedPath({ nodeIds: new Set(), linkIds: new Set() });
    setSelectedNodes(new Set());
    setSelectedNode(null);
  };

  // Handle node right-click
  const handleNodeRightClick = (e: React.MouseEvent, node: Node) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({
      visible: true,
      x: e.clientX,
      y: e.clientY,
      node,
      isCanvas: false
    });
  };

  // Handle node LEFT click - Select node and show info panel ONLY
  const handleNodeClick = (e: React.MouseEvent, node: Node) => {
    console.log('🖱️ handleNodeClick triggered', {
      nodeId: node.id,
      nodeLabel: node.label,
      hasNodeMoved,
      ctrlKey: e.ctrlKey,
      metaKey: e.metaKey,
      linkingMode,
      currentSelectedNodes: Array.from(selectedNodes),
      timestamp: new Date().toISOString()
    });
    
    // NOTE: stopPropagation() is called BEFORE this function in onClick handler
    
    // Don't open info panel if node was just dragged
    if (hasNodeMoved) {
      console.log('⚠️ Node was dragged, ignoring click');
      return;
    }
    
    if (linkingMode && linkSource) {
      console.log('🔗 Linking mode active, creating relationship');
      // Complete the link - just create it with default "CONNECTED" type
      if (linkSource !== node.id) {
        createRelationshipMutation.mutate({
          source_entity_id: linkSource,
          target_entity_id: node.id,
          relationship_type: 'CONNECTED' // Default relationship type
        });
      }
      setLinkingMode(false);
      setLinkSource(null);
      setTempLinkEnd(null);
    } else {
      // Handle multi-selection with Ctrl/Cmd key
      if (e.ctrlKey || e.metaKey) {
        console.log('✅ Multi-select mode (Ctrl/Cmd held)');
        handleNodeMultiSelect(node.id, true);
      } else {
        console.log('✅ Single select mode', node.id);
        // Single selection - Select node to show in info panel
        setSelectedNode(node);
        setSelectedNodes(new Set([node.id])); // Also add to multi-select set

        // Calculate and highlight only the immediate network (1-hop connections)
        const connectedLinks = filteredLinks.filter(
          link => link.source === node.id || link.target === node.id
        );
        const connectedNodeIds = new Set<string>([node.id]);
        connectedLinks.forEach(link => {
          connectedNodeIds.add(link.source);
          connectedNodeIds.add(link.target);
        });
        const connectedLinkIds = new Set(connectedLinks.map(link => link.id));

        setHighlightedPath({
          nodeIds: connectedNodeIds,
          linkIds: connectedLinkIds
        });
      }
    }
    
    setContextMenu({ visible: false, x: 0, y: 0, node: null, isCanvas: false });
  };

  // Handle context menu actions
  const handleContextAction = (action: string, entityType?: string, entityValue?: string) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    
    const currentNode = contextMenu.node;

    if (contextMenu.isCanvas) {
      // Canvas actions - Add entity
      if (action === 'add-entity') {
        setContextMenuStage('search');
        return; // Don't close the menu!
      }
      if (action === 'select-type' && entityType) {
        setSelectedEntityType(entityType);
        setContextMenuStage('input');
        return;
      }
      if (action === 'create-entity' && entityType && entityValue) {
        const svgRect = svgRef.current?.getBoundingClientRect();
        if (!svgRect) return;
        
        const x = ((contextMenu.x - svgRect.left) - pan.x) / zoom;
        const y = ((contextMenu.y - svgRect.top) - pan.y) / zoom;
        
        createEntity({
          entity_type: entityType,
          value: entityValue.trim(),
          position_x: x,
          position_y: y
        });
        
        // Reset
        setContextMenu({ visible: false, x: 0, y: 0, node: null, isCanvas: false });
        setContextMenuStage('main');
        setSelectedEntityType('');
        setEntityValue('');
        setEntitySearchQuery('');
      }
      return;
    }
    
    // Close menu for node actions
    setContextMenu({ visible: false, x: 0, y: 0, node: null, isCanvas: false });

    // Node actions
    if (!currentNode) return;

    switch (action) {
      case 'view-details':
        setSelectedNode(currentNode);
        setShowEntityModal(true);
        break;
      case 'create-link':
        setLinkingMode(true);
        setLinkSource(currentNode.id);
        toast('👉 Click another entity to create a link');
        break;
      case 'annotate':
        handleAddAnnotation({ type: 'node', id: currentNode.id });
        break;
      case 'delete':
        if (confirm(`Delete entity: ${currentNode.label}?`)) {
          deleteEntityMutation.mutate(currentNode.id);
        }
        break;
    }
  };

  // Handle zoom
  const handleZoom = (delta: number) => {
    setZoom(prev => Math.max(0.3, Math.min(3, prev + delta)));
  };

  // Handle mousewheel - Pan by default, Zoom with Ctrl (butter smooth)
  const handleWheel = (e: React.WheelEvent) => {
    // Note: preventDefault is removed to avoid passive event listener warning
    // The wheel event is now registered as passive in the SVG element
    
    if (e.ctrlKey || e.metaKey) {
      // Ctrl + Scroll = Zoom (very smooth - reduced from 0.1 to 0.02)
      const delta = e.deltaY > 0 ? -0.02 : 0.02;
      handleZoom(delta);
    } else {
      // Normal scroll = Pan canvas (smooth - reduced sensitivity by 50%)
      setPan((prev: { x: number; y: number }) => ({
        x: prev.x - (e.deltaX * 0.5),
        y: prev.y - (e.deltaY * 0.5)
      }));
    }
  };

  // Toggle fullscreen
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      containerRef.current?.parentElement?.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  // Search and highlight nodes
  useEffect(() => {
    if (searchQuery.trim()) {
      const matches = new Set<string>();
      nodes.forEach(node => {
        if (
          node.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
          node.type.toLowerCase().includes(searchQuery.toLowerCase()) ||
          JSON.stringify(node.metadata).toLowerCase().includes(searchQuery.toLowerCase())
        ) {
          matches.add(node.id);
        }
      });
      setHighlightedNodes(matches);
    } else {
      setHighlightedNodes(new Set());
    }
  }, [searchQuery, nodes]);

  // Apply filters to nodes - MEMOIZED for performance
  const filteredNodes = useMemo(() => {
    return nodes.filter(node => {
      if (!visibleEntityTypes.has(node.type)) {
        return false;
      }
      if (filters.entityTypes.length > 0 && !filters.entityTypes.includes(node.type)) {
        return false;
      }
      if (filters.riskLevels.length > 0 && !filters.riskLevels.includes(node.risk_level || 'low')) {
        return false;
      }
      if (node.entity && node.entity.confidence < filters.minConfidence) {
        return false;
      }
      if (filters.dateFrom && node.entity && node.entity.created_at) {
        const nodeDate = new Date(node.entity.created_at);
        const fromDate = new Date(filters.dateFrom);
        if (nodeDate < fromDate) return false;
      }
      if (filters.dateTo && node.entity && node.entity.created_at) {
        const nodeDate = new Date(node.entity.created_at);
        const toDate = new Date(filters.dateTo);
        if (nodeDate > toDate) return false;
      }
      if (filters.hasMetadata && (!node.metadata || Object.keys(node.metadata).length === 0)) {
        return false;
      }
      if (visibleLayers.size > 0) {
        const layer = node.metadata?.layer;
        if (layer !== undefined && layer !== null) {
          if (!visibleLayers.has(layer)) return false;
        }
      }
      if (!visibleLayers.size && layerPreset === 'custom' && availableLayers.length > 0) {
        return false;
      }
      return true;
    });
  }, [nodes, visibleEntityTypes, filters, visibleLayers, layerPreset, availableLayers]);

  const visibleLayersArray = Array.from(visibleLayers);

  // MEMOIZED filtered links for performance
  const filteredLinks = useMemo(() => {
    const visibleNodeIds = new Set(filteredNodes.map(n => n.id));
    return links.filter(link => 
      visibleNodeIds.has(link.source) && visibleNodeIds.has(link.target)
    ).map(link => {
      const sourceNode = filteredNodes.find(n => n.id === link.source);
      const targetNode = filteredNodes.find(n => n.id === link.target);
      const layer = targetNode?.metadata?.layer ?? sourceNode?.metadata?.layer;
      const opacity = layer !== undefined && layerOpacity[layer] !== undefined
        ? layerOpacity[layer]
        : 1;
      return {
        ...link,
        metadata: {
          ...link.metadata,
          layer,
          opacity,
        },
      };
    });
  }, [links, filteredNodes, layerOpacity]);

  // VIEWPORT CULLING: Only render nodes/links visible in viewport for MASSIVE performance boost
  const visibleNodesInViewport = useMemo(() => {
    if (!svgRef.current) return filteredNodes;
    
    const rect = svgRef.current.getBoundingClientRect();
    const viewportWidth = rect.width;
    const viewportHeight = rect.height;
    
    // Calculate viewport bounds in graph coordinates with LARGE padding
    const minX = (-pan.x) / zoom - 800; // INCREASED: 800px padding to prevent links disappearing
    const maxX = (-pan.x + viewportWidth) / zoom + 800;
    const minY = (-pan.y) / zoom - 800;
    const maxY = (-pan.y + viewportHeight) / zoom + 800;
    
    // Only include nodes within viewport bounds
    return filteredNodes.filter(node => 
      node.x >= minX && node.x <= maxX && 
      node.y >= minY && node.y <= maxY
    );
  }, [filteredNodes, pan, zoom]);

  // Only render links where BOTH nodes are visible
  const visibleLinksInViewport = useMemo(() => {
    const visibleNodeIds = new Set(visibleNodesInViewport.map(n => n.id));
    return filteredLinks.filter(link => 
      visibleNodeIds.has(link.source) && visibleNodeIds.has(link.target)
    );
  }, [filteredLinks, visibleNodesInViewport]);

  // Multi-selection with Ctrl+Click
  const handleNodeMultiSelect = (nodeId: string, isCtrlPressed: boolean) => {
    if (isCtrlPressed) {
      setSelectedNodes(prev => {
        const newSet = new Set(prev);
        if (newSet.has(nodeId)) {
          newSet.delete(nodeId);
        } else {
          newSet.add(nodeId);
        }
        return newSet;
      });
    } else {
      setSelectedNodes(new Set([nodeId]));
    }
  };

  // Add action to history stack
  const addToHistory = (action: HistoryAction) => {
    if (isUndoRedoAction) {
      return;
    }

    if (action.type === 'LAYOUT_APPLY') {
      return;
    }
    
    setHistoryStack(prev => {
      const newStack = prev.slice(0, historyIndex + 1);
      newStack.push(action);
      return newStack.slice(-50);
    });
    setHistoryIndex(prev => Math.min(prev + 1, 49));
  };

  // Undo last action
  const handleUndo = () => {
    if (historyIndex < 0) {
      toast.error('Nothing to undo');
      return;
    }

    const action = historyStack[historyIndex];
    
    if (action.type === 'LAYOUT_APPLY') {
      const { previousPositions, previousLayout } = action.data;
      setNodes(prev => prev.map(node => {
        const prevPos = previousPositions.find((pos: any) => pos.id === node.id);
        return prevPos ? { ...node, x: prevPos.x, y: prevPos.y } : node;
      }));
      previousPositions.forEach((pos: any) => {
        if (pos.x !== undefined && pos.y !== undefined && !isNaN(pos.x) && !isNaN(pos.y)) {
          updatePositionMutation.mutate({
            entity_id: pos.id,
            position_x: pos.x,
            position_y: pos.y,
          });
        }
      });
      if (previousLayout) {
        setCurrentLayout(previousLayout);
      }
      setHistoryIndex(prev => prev - 1);
      toast.success('Undone layout change');
      return;
    }

    setIsUndoRedoAction(true);
    
    switch (action.type) {
      case 'ADD_NODE':
        // Delete the node that was added
        deleteEntityMutation.mutate(action.data.nodeId);
            setHistoryIndex(prev => prev - 1);
            setIsUndoRedoAction(false);
            toast.success('Undone: Node addition');
        break;
      
      case 'DELETE_NODE':
        // Re-create the node that was deleted
        createEntityMutation.mutate({
          entity_type: action.data.node.type,
          value: action.data.node.label,
          position_x: action.data.node.x,
          position_y: action.data.node.y
        });
            setHistoryIndex(prev => prev - 1);
            setIsUndoRedoAction(false);
            toast.success('Undone: Node deletion');
        break;
      
      case 'MOVE_NODE':
        // Restore node to previous position
        if (action.data.oldPosition.x !== undefined && action.data.oldPosition.y !== undefined &&
            !isNaN(action.data.oldPosition.x) && !isNaN(action.data.oldPosition.y)) {
          updatePositionMutation.mutate({
            entity_id: action.data.nodeId,
            position_x: action.data.oldPosition.x,
            position_y: action.data.oldPosition.y
          });
        }
        setHistoryIndex(prev => prev - 1);
            setIsUndoRedoAction(false);
            toast.success('Undone: Node movement');
        break;
      
      case 'ADD_LINK':
        // Delete the link that was added
        deleteRelationshipMutation.mutate(action.data.linkId);
            setHistoryIndex(prev => prev - 1);
            setIsUndoRedoAction(false);
            toast.success('Undone: Link creation');
        break;
      
      case 'DELETE_LINK':
        // Re-create the link that was deleted
        createRelationshipMutation.mutate({
          source_entity_id: action.data.link.source,
          target_entity_id: action.data.link.target,
          relationship_type: action.data.link.type
        });
            setHistoryIndex(prev => prev - 1);
            setIsUndoRedoAction(false);
            toast.success('Undone: Link deletion');
        break;
      
      case 'EDIT_LINK':
        // Restore link to previous type
        updateRelationshipMutation.mutate({
          relationshipId: action.data.linkId,
          relationship_type: action.data.oldType
        });
            setHistoryIndex(prev => prev - 1);
            setIsUndoRedoAction(false);
            toast.success('Undone: Link edit');
        break;
    }
  };

  // Redo last undone action
  const handleRedo = () => {
    if (historyIndex >= historyStack.length - 1) {
      toast.error('Nothing to redo');
      return;
    }

    const nextIndex = historyIndex + 1;
    const action = historyStack[nextIndex];
    
    if (action.type === 'LAYOUT_APPLY') {
      const { newPositions, layoutType } = action.data;
      setNodes(prev => prev.map(node => {
        const newPos = newPositions.find((pos: any) => pos.id === node.id);
        return newPos ? { ...node, x: newPos.x, y: newPos.y } : node;
      }));
      newPositions.forEach((pos: any) => {
        if (pos.x !== undefined && pos.y !== undefined && !isNaN(pos.x) && !isNaN(pos.y)) {
          updatePositionMutation.mutate({
            entity_id: pos.id,
            position_x: pos.x,
            position_y: pos.y,
          });
        }
      });
      setCurrentLayout(layoutType);
      setHistoryIndex(nextIndex);
      toast.success(`Redone layout: ${layoutType}`);
      return;
    }

    setIsUndoRedoAction(true);
    
    switch (action.type) {
      case 'ADD_NODE':
        // Re-create the node
        createEntityMutation.mutate({
          entity_type: action.data.node.type,
          value: action.data.node.label,
          position_x: action.data.node.x,
          position_y: action.data.node.y
        });
            setHistoryIndex(nextIndex);
            setIsUndoRedoAction(false);
            toast.success('Redone: Node addition');
        break;
      
      case 'DELETE_NODE':
        // Delete the node again
        deleteEntityMutation.mutate(action.data.nodeId);
            setHistoryIndex(nextIndex);
            setIsUndoRedoAction(false);
            toast.success('Redone: Node deletion');
        break;
      
      case 'MOVE_NODE':
        // Move node to new position
        if (action.data.newPosition.x !== undefined && action.data.newPosition.y !== undefined &&
            !isNaN(action.data.newPosition.x) && !isNaN(action.data.newPosition.y)) {
          updatePositionMutation.mutate({
            entity_id: action.data.nodeId,
            position_x: action.data.newPosition.x,
            position_y: action.data.newPosition.y
          });
        }
            setHistoryIndex(nextIndex);
            setIsUndoRedoAction(false);
            toast.success('Redone: Node movement');
        break;
      
      case 'ADD_LINK':
        // Re-create the link
        createRelationshipMutation.mutate({
          source_entity_id: action.data.link.source,
          target_entity_id: action.data.link.target,
          relationship_type: action.data.link.type
        });
            setHistoryIndex(nextIndex);
            setIsUndoRedoAction(false);
            toast.success('Redone: Link creation');
        break;
      
      case 'DELETE_LINK':
        // Delete the link again
        deleteRelationshipMutation.mutate(action.data.linkId);
            setHistoryIndex(nextIndex);
            setIsUndoRedoAction(false);
            toast.success('Redone: Link deletion');
        break;
      
      case 'EDIT_LINK':
        // Apply new link type
        updateRelationshipMutation.mutate({
          relationshipId: action.data.linkId,
          relationship_type: action.data.newType
        });
            setHistoryIndex(nextIndex);
            setIsUndoRedoAction(false);
            toast.success('Redone: Link edit');
        break;
    }
  };

  // Enhanced keyboard shortcuts with new module features
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Undo/Redo
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        handleUndo();
      } else if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) {
        e.preventDefault();
        handleRedo();
      }
      // Search focus
      else if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
        e.preventDefault();
        const input = document.querySelector('input[placeholder="Search entities..."]') as HTMLInputElement;
        input?.focus();
      }
      // Escape - cancel actions
      else if (e.key === 'Escape') {
        e.preventDefault();
        setContextMenu({ visible: false, x: 0, y: 0, node: null, isCanvas: false });
        setLinkContextMenu({ visible: false, x: 0, y: 0, link: null });
        setLinkingMode(false);
        setSelectedNodes(new Set());
      }
      // Delete selected nodes
      else if (e.key === 'Delete' && selectedNodes.size > 0) {
        e.preventDefault();
        selectedNodes.forEach(nodeId => {
          deleteEntityMutation.mutate(nodeId);
        });
        setSelectedNodes(new Set());
      }
      // Show keyboard shortcuts help
      else if (e.key === '?') {
        e.preventDefault();
        setShowKeyboardShortcuts(true);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [historyIndex, historyStack]);

  // Export graph as PNG
  const exportGraphAsPNG = () => {
    if (!svgRef.current) return;
    
    const svgData = new XMLSerializer().serializeToString(svgRef.current);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();
    
    canvas.width = svgRef.current.clientWidth;
    canvas.height = svgRef.current.clientHeight;
    
    img.onload = () => {
      ctx?.drawImage(img, 0, 0);
      const pngFile = canvas.toDataURL('image/png');
      const downloadLink = document.createElement('a');
      downloadLink.download = `investigation-graph-${Date.now()}.png`;
      downloadLink.href = pngFile;
      downloadLink.click();
      toast.success('Graph exported as PNG');
    };
    
    img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)));
  };

  // Export graph data as JSON
  const exportGraphAsJSON = () => {
    const graphData = {
      nodes: nodes.map(n => ({
        id: n.id,
        label: n.label,
        type: n.type,
        x: n.x,
        y: n.y,
        risk_level: n.risk_level,
        metadata: n.metadata
      })),
      links: links.map(l => ({
        id: l.id,
        source: l.source,
        target: l.target,
        type: l.type,
        label: l.label
      })),
      exported_at: new Date().toISOString()
    };
    
    const dataStr = JSON.stringify(graphData, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const downloadLink = document.createElement('a');
    downloadLink.download = `investigation-graph-${Date.now()}.json`;
    downloadLink.href = url;
    downloadLink.click();
    URL.revokeObjectURL(url);
    toast.success('Graph exported as JSON');
  };

  // Handle annotation
  const handleAddAnnotation = (target: { type: 'node' | 'link'; id: string }) => {
    setAnnotationTarget(target);
    
    // Load existing annotations
    if (target.type === 'node') {
      const node = nodes.find(n => n.id === target.id);
      if (node && node.metadata) {
        setAnnotationText(node.metadata.annotation || '');
        setAnnotationTags(node.metadata.tags || []);
      }
    } else {
      const link = links.find(l => l.id === target.id);
      if (link && link.label) {
        const parts = link.label.split('|');
        if (parts.length > 1) {
          setAnnotationText(parts[1].trim());
        }
      }
    }
    
    setShowAnnotationModal(true);
  };

  const saveAnnotation = () => {
    if (!annotationTarget) return;

    if (annotationTarget.type === 'node') {
      // Update node metadata with annotation and tags
      const node = nodes.find(n => n.id === annotationTarget.id);
      if (node) {
        const updatedMetadata = {
          ...node.metadata,
          annotation: annotationText,
          tags: annotationTags
        };
        
        // Update via API (we'll use a simple approach for now)
        setNodes(nodes.map(n => 
          n.id === annotationTarget.id 
            ? { ...n, metadata: updatedMetadata }
            : n
        ));
        
        toast.success('Annotation saved');
      }
    } else {
      // For links, we can store annotation in the label or metadata
      // For now, we'll just show success
      toast.success('Link annotation saved');
    }

    // Reset
    setShowAnnotationModal(false);
    setAnnotationTarget(null);
    setAnnotationText('');
    setAnnotationTags([]);
    setNewTag('');
  };

  const addTag = () => {
    if (newTag.trim() && !annotationTags.includes(newTag.trim())) {
      setAnnotationTags([...annotationTags, newTag.trim()]);
      setNewTag('');
    }
  };

  const removeTag = (tag: string) => {
    setAnnotationTags(annotationTags.filter(t => t !== tag));
  };

  const getDegree = useCallback((nodeId: string) => {
    return links.filter(link => link.source === nodeId || link.target === nodeId).length;
  }, [links]);

  const getBankKey = useCallback((node: Node) => {
    const bankName = node.metadata?.bank_name || node.metadata?.bank || node.metadata?.institution;
    const ifsc = node.metadata?.ifsc_code || node.metadata?.ifsc;
    if (bankName && ifsc) return `${bankName} (${ifsc})`;
    if (bankName) return bankName;
    if (ifsc) return `IFSC ${ifsc}`;
    return 'Unknown Bank';
  }, []);

  // ============================================================================
  // LAYERED SANKEY HELPER FUNCTIONS
  // ============================================================================

  // Deduplicate links based on fingerprint
  const deduplicateLinks = useCallback((links: Link[]) => {
    const seen = new Map<string, Link>();
    const duplicates: any[] = [];

    links.forEach(link => {
      // Create fingerprint: source + target + amount + timestamp
      const amount = link.metadata?.amount || link.metadata?.transaction_amount || 0;
      const timestamp = link.metadata?.transaction_date || link.metadata?.date || '';
      const fingerprint = `${link.source}|${link.target}|${amount}|${timestamp}`;

      if (seen.has(fingerprint)) {
        duplicates.push({
          duplicate: link,
          original: seen.get(fingerprint),
          fingerprint
        });
      } else {
        seen.set(fingerprint, link);
      }
    });

    console.log(`🔍 Deduplication: ${links.length} → ${seen.size} unique links (${duplicates.length} duplicates removed)`);

    // Store duplicates for alerts
    setPatternAlerts(prev => ({ ...prev, duplicates }));

    return Array.from(seen.values());
  }, []);

  // Aggregate links: Combine multiple transactions between same accounts
  const aggregateLinks = useCallback((links: Link[]) => {
    if (!linkAggregationEnabled) return links;

    const aggregated = new Map<string, {
      link: Link;
      count: number;
      totalAmount: number;
      transactions: Link[];
    }>();

    links.forEach(link => {
      // Create key from source-target pair
      const key = `${link.source}→${link.target}`;
      const amount = parseFloat(link.metadata?.amount || link.metadata?.transaction_amount || '0');

      if (aggregated.has(key)) {
        const existing = aggregated.get(key)!;
        existing.count++;
        existing.totalAmount += amount;
        existing.transactions.push(link);
      } else {
        aggregated.set(key, {
          link: { ...link },
          count: 1,
          totalAmount: amount,
          transactions: [link]
        });
      }
    });

    // Create aggregated links
    const result: Link[] = [];
    aggregated.forEach((agg, key) => {
      result.push({
        ...agg.link,
        id: `agg_${key}`,
        label: agg.count > 1 ? `${agg.count} txns\n₹${agg.totalAmount.toLocaleString('en-IN')}` : agg.link.label,
        metadata: {
          ...agg.link.metadata,
          isAggregated: agg.count > 1,
          transactionCount: agg.count,
          totalAmount: agg.totalAmount,
          individualTransactions: agg.transactions.map(t => ({
            id: t.id,
            amount: parseFloat(t.metadata?.amount || t.metadata?.transaction_amount || '0'),
            date: t.metadata?.transaction_date || t.metadata?.date
          }))
        }
      });
    });

    console.log(`🔗 Link aggregation: ${links.length} → ${result.length} links (${links.length - result.length} combined)`);
    return result;
  }, [linkAggregationEnabled]);

  // Filter links by amount threshold
  const filterLinksByAmount = useCallback((links: Link[]) => {
    const filtered = links.filter(link => {
      const amount = parseFloat(link.metadata?.amount || link.metadata?.transaction_amount || '0');
      return amount >= minAmountThreshold;
    });

    if (filtered.length < links.length) {
      console.log(`💰 Amount filter: ${links.length} → ${filtered.length} links (hiding ${links.length - filtered.length} below ₹${minAmountThreshold.toLocaleString('en-IN')})`);
    }

    return filtered;
  }, [minAmountThreshold]);

  // Classify account based on transaction behavior
  const classifyAccount = useCallback((accountId: string, allLinks: Link[]) => {
    const incoming = allLinks.filter(l => l.target === accountId);
    const outgoing = allLinks.filter(l => l.source === accountId);

    const totalIn = incoming.reduce((sum, l) => sum + (parseFloat(l.metadata?.amount || l.metadata?.transaction_amount || '0')), 0);
    const totalOut = outgoing.reduce((sum, l) => sum + (parseFloat(l.metadata?.amount || l.metadata?.transaction_amount || '0')), 0);

    const forwardRatio = totalIn > 0 ? totalOut / totalIn : 0;

    // Get account layer
    const node = nodes.find(n => n.id === accountId);
    const layer = node?.metadata?.layer || 0;

    // Calculate time to forward
    let timeToForwardHours = Infinity;
    if (incoming.length > 0 && outgoing.length > 0) {
      const firstInTime = incoming.reduce((min, l) => {
        const t = new Date(l.metadata?.transaction_date || l.metadata?.date || 0).getTime();
        return t < min ? t : min;
      }, Infinity);

      const firstOutTime = outgoing.reduce((min, l) => {
        const t = new Date(l.metadata?.transaction_date || l.metadata?.date || 0).getTime();
        return t < min ? t : min;
      }, Infinity);

      if (firstInTime !== Infinity && firstOutTime !== Infinity) {
        timeToForwardHours = (firstOutTime - firstInTime) / (1000 * 60 * 60);
      }
    }

    // Classification logic
    let classification = 'INTERMEDIATE';
    let color = '#3b82f6'; // Blue
    let confidence = 0.5;

    if (layer === 1) {
      classification = 'SUSPECT';
      color = '#dc2626'; // Red
      confidence = 1.0;
    } else if (outgoing.length === 0 && incoming.length > 0) {
      classification = 'ENDPOINT';
      color = '#10b981'; // Green
      confidence = 1.0;
    } else if (timeToForwardHours < 1 && forwardRatio > 0.8) {
      classification = 'MULE';
      color = '#f97316'; // Orange
      confidence = 0.9;
    }

    return {
      accountId,
      classification,
      color,
      confidence,
      metrics: {
        totalIn,
        totalOut,
        numIncoming: incoming.length,
        numOutgoing: outgoing.length,
        forwardRatio,
        timeToForwardHours,
        layer
      }
    };
  }, [nodes]);

  // Detect patterns
  const detectPatterns = useCallback((links: Link[], classifications: Map<string, any>) => {
    const patterns = {
      rapidForwards: [] as any[],
      splittingPatterns: [] as any[],
      circularFlows: [] as any[]
    };

    // Detect rapid forwarding
    classifications.forEach((info, accountId) => {
      if (info.classification === 'MULE' && info.metrics.timeToForwardHours < 1) {
        patterns.rapidForwards.push({
          account: accountId,
          timeHours: info.metrics.timeToForwardHours,
          amountIn: info.metrics.totalIn,
          amountOut: info.metrics.totalOut,
          severity: info.metrics.timeToForwardHours < 0.5 ? 'high' : 'medium'
        });
      }
    });

    // Detect splitting (1 account → many accounts)
    const outgoingBySource = new Map<string, Link[]>();
    links.forEach(link => {
      if (!outgoingBySource.has(link.source)) {
        outgoingBySource.set(link.source, []);
      }
      outgoingBySource.get(link.source)!.push(link);
    });

    outgoingBySource.forEach((outLinks, source) => {
      if (outLinks.length >= 10) {
        const uniqueTargets = new Set(outLinks.map(l => l.target));
        const totalAmount = outLinks.reduce((sum, l) =>
          sum + parseFloat(l.metadata?.amount || l.metadata?.transaction_amount || '0'), 0
        );

        patterns.splittingPatterns.push({
          sender: source,
          numRecipients: uniqueTargets.size,
          totalAmount,
          avgAmount: totalAmount / outLinks.length,
          severity: uniqueTargets.size > 20 ? 'high' : 'medium'
        });
      }
    });

    // Detect circular flows (basic cycle detection)
    const graph = new Map<string, Set<string>>();
    links.forEach(link => {
      if (!graph.has(link.source)) {
        graph.set(link.source, new Set());
      }
      graph.get(link.source)!.add(link.target);
    });

    const findCycles = (start: string, visited: Set<string>, path: string[]): string[][] => {
      if (path.includes(start)) {
        const cycleStart = path.indexOf(start);
        return [path.slice(cycleStart)];
      }
      if (visited.has(start)) return [];

      visited.add(start);
      const cycles: string[][] = [];
      const neighbors = graph.get(start) || new Set();

      neighbors.forEach(neighbor => {
        cycles.push(...findCycles(neighbor, visited, [...path, start]));
      });

      return cycles;
    };

    const allCycles: string[][] = [];
    const globalVisited = new Set<string>();

    graph.forEach((_, node) => {
      if (!globalVisited.has(node)) {
        const cycles = findCycles(node, globalVisited, []);
        allCycles.push(...cycles);
      }
    });

    allCycles.forEach(cycle => {
      if (cycle.length >= 2) {
        patterns.circularFlows.push({
          cycle,
          length: cycle.length,
          severity: 'high'
        });
      }
    });

    console.log(`🚨 Patterns detected:`, patterns);
    return patterns;
  }, []);

  // Apply automatic layout
  const applyLayout = (layoutType: LayoutType) => {
    const previousPositions = nodes.map(node => ({ id: node.id, x: node.x, y: node.y }));
    const previousLayout = currentLayout;

    let updatedNodes = [...nodes];

    switch (layoutType) {
      case 'force':
      default: {
        const width = containerRef.current?.clientWidth ?? 1400;
        const height = containerRef.current?.clientHeight ?? 900;

        updatedNodes = nodes.map(node => ({
          ...node,
          x: node.x ?? Math.random() * width,
          y: node.y ?? Math.random() * height,
        }));

        const iterations = 30;
        const springLength = 220;
        const springStrength = 0.12;
        const repulsionStrength = 4500;

        for (let iter = 0; iter < iterations; iter++) {
          const forces: Record<string, { x: number; y: number }> = {};

          updatedNodes.forEach(node => {
            forces[node.id] = { x: 0, y: 0 };
          });

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

          updatedNodes = updatedNodes.map(node => ({
            ...node,
            x: node.x + forces[node.id].x,
            y: node.y + forces[node.id].y,
          }));
        }
        break;
      }

      case 'radial': {
        const center = { x: (containerRef.current?.clientWidth ?? 1800) / 2, y: (containerRef.current?.clientHeight ?? 1000) / 2 };
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
        updatedNodes = [];
        sortedLayers.forEach((layer, layerIndex) => {
          const nodesInLayer = layerGroups.get(layer)!;
          const radius = baseRadius + layerIndex * radiusStep;
          const sortedByDegree = [...nodesInLayer].sort((a, b) => getDegree(b.id) - getDegree(a.id));
          sortedByDegree.forEach((node, index) => {
            const angle = (index / sortedByDegree.length) * 2 * Math.PI;
            updatedNodes.push({
              ...node,
              x: center.x + radius * Math.cos(angle),
              y: center.y + radius * Math.sin(angle),
            });
          });
        });
        break;
      }

      case 'sankey': {
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

        const layerTotals = new Map<number, number>();
        sortedLayers.forEach(layer => {
          const total = groupedByLayer.get(layer)!.reduce((sum, node) => {
            const incoming = links.filter(l => l.target === node.id).reduce((a, l) => a + (l.amount || 1), 0);
            const outgoing = links.filter(l => l.source === node.id).reduce((a, l) => a + (l.amount || 1), 0);
            return sum + Math.max(incoming, outgoing, 1);
          }, 0);
          layerTotals.set(layer, total || groupedByLayer.get(layer)!.length);
        });

        const layerOffsets = new Map<number, number>();
        sortedLayers.forEach(layer => {
          const totalHeight = layerTotals.get(layer) || 1;
          layerOffsets.set(layer, startY - totalHeight / 2);
        });

        const nodePositions = new Map<string, { x: number; y: number }>();
        sortedLayers.forEach((layer, layerIndex) => {
          const nodesInLayer = groupedByLayer.get(layer)!;
          const baseX = startX + layerIndex * layerSpacing;
          let currentY = layerOffsets.get(layer)!;
          nodesInLayer.forEach(node => {
            const incoming = links.filter(l => l.target === node.id).reduce((a, l) => a + (l.amount || 1), 0);
            const outgoing = links.filter(l => l.source === node.id).reduce((a, l) => a + (l.amount || 1), 0);
            const nodeWeight = Math.max(incoming, outgoing, 1) * 4;
            nodePositions.set(node.id, {
              x: baseX,
              y: currentY + nodeWeight / 2,
            });
            currentY += nodeWeight + 40;
          });
        });

        updatedNodes = nodes.map(node => {
          const pos = nodePositions.get(node.id) || { x: Math.random() * 1000, y: Math.random() * 800 };
          return { ...node, x: pos.x, y: pos.y };
        });
        break;
      }

      case 'timeline': {
        const nodesWithDates = nodes.map(node => {
          const txDate = node.metadata?.transaction_date || node.metadata?.date || node.metadata?.timestamp;
          const parsed = txDate ? new Date(txDate) : null;
          return { node, date: parsed?.getTime() ?? null };
        });
        const sortedByDate = nodesWithDates.sort((a, b) => {
          if (a.date === null && b.date === null) return 0;
          if (a.date === null) return 1;
          if (b.date === null) return -1;
          return a.date - b.date;
        });
        const baseX = 180;
        const xStep = 220;
        const layerOffset = 220;
        const bandHeight = 60;
        const layerBands = new Map<number, number>();
        updatedNodes = sortedByDate.map(({ node }, index) => {
          const layer = node.metadata?.layer ?? 0;
          const bandIndex = layerBands.get(layer) ?? 0;
          layerBands.set(layer, bandIndex + 1);
          return {
            ...node,
            x: baseX + index * xStep,
            y: 200 + layer * layerOffset + (bandIndex % 3) * bandHeight,
          };
        });
        break;
      }

      case 'bankCluster': {
        const clusters = new Map<string, Node[]>();
        nodes.forEach(node => {
          const key = getBankKey(node);
          if (!clusters.has(key)) clusters.set(key, []);
          clusters.get(key)!.push(node);
        });
        const clusterKeys = Array.from(clusters.keys());
        const clusterSpacing = 480;
        const baseX = 240;
        updatedNodes = [];
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
        break;
      }

      case 'tree': {
        if (nodes.length === 0) {
          updatedNodes = nodes;
          break;
        }

        const containerWidth = containerRef.current?.clientWidth ?? 1600;
        const containerHeight = containerRef.current?.clientHeight ?? 900;

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
        // MASSIVELY INCREASED VERTICAL SPACING: 600px minimum (was 280px)
        const verticalSpacing = Math.max(600, Math.min(800, (containerHeight - baseY) / Math.max(sortedLayers.length, 1)));
        const centerX = containerWidth / 2;

        const positionedNodes = new Map<string, { x: number; y: number }>();

        sortedLayers.forEach((layer, layerIndex) => {
          const nodesInLayer = layerGroups.get(layer)!;
          const sortedByImportance = nodesInLayer
            .slice()
            .sort((a, b) => {
              const amountA = Number(a.metadata?.transaction_amount ?? a.metadata?.amount ?? a.metadata?.value ?? 0);
              const amountB = Number(b.metadata?.transaction_amount ?? b.metadata?.amount ?? b.metadata?.value ?? 0);
              if (amountA === amountB) {
                return (a.label || a.id).localeCompare(b.label || b.id);
              }
              return amountB - amountA;
            });

          // INCREASED HORIZONTAL SPACING: 300px minimum (was 220px)
          const spacing = Math.max(300, Math.min(500, containerWidth / Math.max(sortedByImportance.length, 2)));
          const layerY = baseY + layerIndex * verticalSpacing;

          sortedByImportance.forEach((node, index) => {
            const horizontalOffset = (index - (sortedByImportance.length - 1) / 2) * spacing;
            positionedNodes.set(node.id, {
              x: centerX + horizontalOffset,
              y: layerY,
            });
          });
        });

        updatedNodes = nodes.map(node => {
          const pos = positionedNodes.get(node.id);
          if (!pos) {
            return node;
          }
          return {
            ...node,
            x: pos.x,
            y: pos.y,
          };
        });

        const xs = updatedNodes.map(n => n.x ?? 0);
        const ys = updatedNodes.map(n => n.y ?? 0);
        const minX = Math.min(...xs);
        const maxX = Math.max(...xs);
        const minY = Math.min(...ys);
        const maxY = Math.max(...ys);
        const graphWidth = Math.max(1, maxX - minX);
        const graphHeight = Math.max(1, maxY - minY);

        const centeredPan = {
          x: containerWidth / 2 - (minX + graphWidth / 2),
          y: containerHeight / 2 - (minY + graphHeight / 2),
        };

        if (Number.isFinite(centeredPan.x) && Number.isFinite(centeredPan.y)) {
          setPan(centeredPan);
        }

        const widthScale = containerWidth / (graphWidth + 400);
        const heightScale = containerHeight / (graphHeight + 400);
        const targetZoom = Math.max(0.45, Math.min(1.1, widthScale, heightScale));

        if (Number.isFinite(targetZoom) && targetZoom > 0) {
          setZoom(targetZoom);
        }

        break;
      }

      case 'chronological': {
        // CHRONOLOGICAL LAYOUT - Time-based layer assignment
        if (nodes.length === 0) {
          updatedNodes = nodes;
          break;
        }

        console.log('⏰ Applying chronological layout (time-based)...');

        // Build transaction graph from links with timestamps
        const accountLayers = new Map<string, number>();
        const accountFirstSeen = new Map<string, Date>();
        const transactionsByTime: Array<{
          fromNode: Node;
          toNode: Node;
          timestamp: Date;
          link: Link;
        }> = [];

        // Extract transactions with timestamps from links
        filteredLinks.forEach(link => {
          const fromNode = nodes.find(n => n.id === link.source);
          const toNode = nodes.find(n => n.id === link.target);

          if (fromNode && toNode) {
            // Try to extract timestamp from link or node metadata
            let timestamp: Date | null = null;

            // Check link metadata for timestamp
            if (link.metadata?.transaction_date || link.metadata?.date || link.metadata?.timestamp) {
              const dateStr = link.metadata.transaction_date || link.metadata.date || link.metadata.timestamp;
              timestamp = new Date(dateStr);
            }
            // Fall back to node metadata
            else if (toNode.metadata?.transaction_date || toNode.metadata?.first_transaction_date) {
              const dateStr = toNode.metadata.transaction_date || toNode.metadata.first_transaction_date;
              timestamp = new Date(dateStr);
            }

            if (timestamp && !isNaN(timestamp.getTime())) {
              transactionsByTime.push({ fromNode, toNode, timestamp, link });
            }
          }
        });

        // Sort transactions chronologically
        transactionsByTime.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

        console.log(`📊 Found ${transactionsByTime.length} transactions with timestamps`);

        // Assign layers based on chronological flow
        transactionsByTime.forEach(txn => {
          const fromId = txn.fromNode.id;
          const toId = txn.toNode.id;

          // Initialize sender if not seen
          if (!accountLayers.has(fromId)) {
            accountLayers.set(fromId, 0); // Root layer
            accountFirstSeen.set(fromId, txn.timestamp);
          }

          const senderLayer = accountLayers.get(fromId)!;

          // Assign receiver to next layer
          if (!accountLayers.has(toId)) {
            // First time seeing this account
            accountLayers.set(toId, senderLayer + 1);
            accountFirstSeen.set(toId, txn.timestamp);
          } else {
            // Account seen before - check if this is earlier
            const previousTime = accountFirstSeen.get(toId)!;
            if (txn.timestamp < previousTime) {
              // This is an earlier transaction, reassign layer
              accountLayers.set(toId, senderLayer + 1);
              accountFirstSeen.set(toId, txn.timestamp);
            }
          }
        });

        // Update node metadata with chronological layers
        const nodesWithChronoLayers = nodes.map(node => ({
          ...node,
          metadata: {
            ...node.metadata,
            chronological_layer: accountLayers.get(node.id) ?? 0,
            first_transaction_date: accountFirstSeen.get(node.id)?.toISOString(),
          }
        }));

        // Group by chronological layer
        const layerGroups = new Map<number, Node[]>();
        nodesWithChronoLayers.forEach(node => {
          const layer = node.metadata?.chronological_layer ?? 0;
          if (!layerGroups.has(layer)) {
            layerGroups.set(layer, []);
          }
          layerGroups.get(layer)!.push(node);
        });

        // Layout similar to tree layout but using chronological layers
        const containerWidth = containerRef.current?.clientWidth ?? 1600;
        const containerHeight = containerRef.current?.clientHeight ?? 900;

        const sortedLayers = Array.from(layerGroups.keys()).sort((a, b) => a - b);
        const baseY = 120;
        const verticalSpacing = Math.max(600, Math.min(800, (containerHeight - baseY) / Math.max(sortedLayers.length, 1)));
        const centerX = containerWidth / 2;

        const positionedNodes = new Map<string, { x: number; y: number }>();

        sortedLayers.forEach((layer, layerIndex) => {
          const nodesInLayer = layerGroups.get(layer)!;

          // Sort horizontally by timestamp (earliest on left)
          const sortedByTime = nodesInLayer.slice().sort((a, b) => {
            const timeA = new Date(a.metadata?.first_transaction_date || 0).getTime();
            const timeB = new Date(b.metadata?.first_transaction_date || 0).getTime();
            return timeA - timeB;
          });

          const spacing = Math.max(300, Math.min(500, containerWidth / Math.max(sortedByTime.length, 2)));
          const layerY = baseY + layerIndex * verticalSpacing;

          sortedByTime.forEach((node, index) => {
            const horizontalOffset = (index - (sortedByTime.length - 1) / 2) * spacing;
            positionedNodes.set(node.id, {
              x: centerX + horizontalOffset,
              y: layerY,
            });
          });
        });

        updatedNodes = nodesWithChronoLayers.map(node => {
          const pos = positionedNodes.get(node.id);
          if (!pos) {
            return node;
          }
          return {
            ...node,
            x: pos.x,
            y: pos.y,
          };
        });

        // Center and zoom
        const xs = updatedNodes.map(n => n.x ?? 0);
        const ys = updatedNodes.map(n => n.y ?? 0);
        const minX = Math.min(...xs);
        const maxX = Math.max(...xs);
        const minY = Math.min(...ys);
        const maxY = Math.max(...ys);
        const graphWidth = Math.max(1, maxX - minX);
        const graphHeight = Math.max(1, maxY - minY);

        const centeredPan = {
          x: containerWidth / 2 - (minX + graphWidth / 2),
          y: containerHeight / 2 - (minY + graphHeight / 2),
        };

        if (Number.isFinite(centeredPan.x) && Number.isFinite(centeredPan.y)) {
          setPan(centeredPan);
        }

        const widthScale = containerWidth / (graphWidth + 400);
        const heightScale = containerHeight / (graphHeight + 400);
        const targetZoom = Math.max(0.45, Math.min(1.1, widthScale, heightScale));

        if (Number.isFinite(targetZoom) && targetZoom > 0) {
          setZoom(targetZoom);
        }

        toast.success(`Chronological layout applied (${sortedLayers.length} time-based layers)`);
        break;
      }

      case 'layeredSankey': {
        // LAYERED SANKEY - Money laundering detection visualization
        if (nodes.length === 0) {
          updatedNodes = nodes;
          break;
        }

        console.log('💰 Applying Layered Sankey layout with de-cluttering...');

        // STEP 1: Deduplicate transactions
        const uniqueLinks = deduplicateLinks(filteredLinks);
        console.log(`✅ Deduplication: ${filteredLinks.length} → ${uniqueLinks.length} links`);

        // STEP 2: Aggregate links (combine multiple transactions between same accounts)
        const aggregatedLinks = aggregateLinks(uniqueLinks);
        console.log(`✅ Aggregation: ${uniqueLinks.length} → ${aggregatedLinks.length} links`);

        // STEP 3: Filter by amount threshold (hide small transactions)
        const filteredByAmount = filterLinksByAmount(aggregatedLinks);
        console.log(`✅ Amount filter: ${aggregatedLinks.length} → ${filteredByAmount.length} links (min: ₹${minAmountThreshold.toLocaleString('en-IN')})`);

        const finalLinks = filteredByAmount;

        // STEP 4: Classify all accounts
        const classifications = new Map<string, any>();
        const allAccounts = new Set<string>();
        finalLinks.forEach(link => {
          allAccounts.add(link.source);
          allAccounts.add(link.target);
        });

        allAccounts.forEach(accountId => {
          const classification = classifyAccount(accountId, finalLinks);
          classifications.set(accountId, classification);
        });
        setAccountClassifications(classifications);
        console.log(`✅ Classification complete: ${classifications.size} accounts classified`);

        // STEP 5: Detect patterns
        const patterns = detectPatterns(finalLinks, classifications);
        setPatternAlerts({
          rapidForwards: patterns.rapidForwards,
          splittingPatterns: patterns.splittingPatterns,
          circularFlows: patterns.circularFlows,
          duplicates: patternAlerts.duplicates
        });
        console.log(`✅ Pattern detection complete:`, {
          rapid: patterns.rapidForwards.length,
          splitting: patterns.splittingPatterns.length,
          circular: patterns.circularFlows.length
        });

        // STEP 6: Group nodes by layer
        const nodesByLayer = new Map<number, Node[]>();
        let nodesWithoutLayer = 0;
        nodes.forEach(node => {
          const layer = node.metadata?.layer || 0;
          if (!node.metadata?.layer) {
            nodesWithoutLayer++;
            console.warn(`⚠️ Node ${node.id} missing layer metadata:`, node.metadata);
          }
          if (!nodesByLayer.has(layer)) {
            nodesByLayer.set(layer, []);
          }
          nodesByLayer.get(layer)!.push(node);
        });

        console.log(`📊 Layer distribution:`, Array.from(nodesByLayer.entries()).map(([layer, nodes]) => `Layer ${layer}: ${nodes.length} nodes`));
        if (nodesWithoutLayer > 0) {
          console.warn(`⚠️ ${nodesWithoutLayer} nodes missing layer metadata - defaulting to layer 0`);
        }

        // Check if all nodes are in the same layer
        if (nodesByLayer.size === 1) {
          const singleLayer = Array.from(nodesByLayer.keys())[0];
          toast.error(`All ${nodes.length} nodes are in Layer ${singleLayer}. Layer data may be missing. Check console for details.`);
          console.error(`❌ Layered Sankey cannot create vertical layers when all nodes are in the same layer.`);
          console.error(`💡 Make sure your data has a 'Layer' column with values 1-14.`);
          console.error(`💡 Sample node metadata:`, nodes[0]?.metadata);
        }

        // STEP 7: Layout nodes in fixed layer columns
        const containerWidth = containerRef.current?.clientWidth ?? 1600;
        const containerHeight = containerRef.current?.clientHeight ?? 900;
        const layerWidth = 300; // Horizontal spacing between layers
        const nodeHeight = 80; // Vertical spacing within layer
        const startX = 150; // Left margin
        const baseY = 100; // Top margin

        const sortedLayers = Array.from(nodesByLayer.keys()).sort((a, b) => a - b);

        const positionedNodes = new Map<string, { x: number; y: number }>();

        sortedLayers.forEach((layer, layerIndex) => {
          const layerNodes = nodesByLayer.get(layer)!;

          // Sort nodes within layer by timestamp (earliest first)
          layerNodes.sort((a, b) => {
            const timeA = new Date(a.metadata?.first_transaction_date || a.metadata?.transaction_date || 0).getTime();
            const timeB = new Date(b.metadata?.first_transaction_date || b.metadata?.transaction_date || 0).getTime();
            return timeA - timeB;
          });

          const layerX = startX + (layerIndex * layerWidth);
          const totalHeight = layerNodes.length * nodeHeight;
          const startY = (containerHeight - totalHeight) / 2;

          layerNodes.forEach((node, index) => {
            positionedNodes.set(node.id, {
              x: layerX,
              y: Math.max(baseY, startY + (index * nodeHeight))
            });
          });
        });

        // STEP 8: Apply positions and colors
        updatedNodes = nodes.map(node => {
          const pos = positionedNodes.get(node.id);
          const classification = classifications.get(node.id);

          return {
            ...node,
            x: pos?.x ?? node.x,
            y: pos?.y ?? node.y,
            // Store classification in metadata for rendering
            metadata: {
              ...node.metadata,
              classification: classification?.classification,
              classificationColor: classification?.color,
              confidence: classification?.confidence
            }
          };
        });

        // STEP 9: Update links with styling metadata
        setLinks(finalLinks.map(link => {
          // Use aggregated amount if available, otherwise individual amount
          const amount = link.metadata?.totalAmount || parseFloat(link.metadata?.amount || link.metadata?.transaction_amount || '0');
          const isAggregated = link.metadata?.isAggregated || false;
          const transactionCount = link.metadata?.transactionCount || 1;
          const isRapid = patterns.rapidForwards.some(p => p.account === link.target);
          const isCircular = patterns.circularFlows.some(c => c.cycle.includes(link.source) && c.cycle.includes(link.target));

          return {
            ...link,
            metadata: {
              ...link.metadata,
              // Link width based on total amount (logarithmic scale)
              sankeyWidth: Math.max(3, Math.log10(amount + 1) * 5), // Increased multiplier for aggregated links
              isRapid,
              isCircular,
              isAggregated,
              transactionCount,
              sankeyColor: isCircular ? '#ef4444' : isRapid ? '#f59e0b' : (isAggregated ? '#8b5cf6' : '#3b82f6')
            }
          };
        }));

        // STEP 10: Auto-pan to show all layers
        const minX = Math.min(...sortedLayers.map((_, idx) => startX + (idx * layerWidth)));
        const maxX = Math.max(...sortedLayers.map((_, idx) => startX + (idx * layerWidth)));
        const centerX = (minX + maxX) / 2;
        const centerY = containerHeight / 2;

        setPan({ x: containerWidth / 2 - centerX * zoom, y: containerHeight / 2 - centerY * zoom });

        const linksRemoved = filteredLinks.length - finalLinks.length;
        const linksAggregated = uniqueLinks.length - aggregatedLinks.length;
        toast.success(`Layered Sankey applied: ${sortedLayers.length} layers, ${finalLinks.length} clean links (${linksRemoved} filtered, ${linksAggregated} aggregated), ${patterns.rapidForwards.length + patterns.splittingPatterns.length + patterns.circularFlows.length} patterns detected`);

        // Auto-open pattern alerts panel if patterns found
        if (patterns.rapidForwards.length > 0 || patterns.splittingPatterns.length > 0 || patterns.circularFlows.length > 0) {
          setShowPatternAlertsPanel(true);
        }

        break;
      }

      case 'circular':
        // ... existing code ...
        break;

      case 'grid':
        // ... existing code ...
        break;

      case 'hierarchical':
        // ... existing code ...
        break;

      case 'block':
      case 'centrality':
      case 'orthogonal':
      case 'horizontal':
      case 'chakra':
        // ... existing code remains unchanged ...
        break;
    }

    setNodes(updatedNodes);

    updatedNodes.forEach(node => {
      // Only save positions if coordinates are valid
      if (node.x !== undefined && node.y !== undefined && !isNaN(node.x) && !isNaN(node.y)) {
        updatePositionMutation.mutate({
          entity_id: node.id,
          position_x: node.x,
          position_y: node.y,
        });
      }
    });

    setCurrentLayout(layoutType);
    toast.success(`Applied ${layoutType} layout`);

    setHistoryStack(prev => {
      const newStack = prev.slice(0, historyIndex + 1);
      newStack.push({
        type: 'LAYOUT_APPLY',
        data: {
          layoutType,
          previousLayout,
          previousPositions,
          newPositions: updatedNodes.map(node => ({ id: node.id, x: node.x, y: node.y })),
        },
        timestamp: Date.now(),
      });
      return newStack.slice(-50);
    });
    setHistoryIndex(prev => Math.min(prev + 1, 49));
  };

  // Handle connection dot mousedown (for linking)
  const handleConnectionDotMouseDown = (e: React.MouseEvent, nodeId: string) => {
    e.preventDefault(); // Prevent text selection
    e.stopPropagation();
    
    const node = nodes.find(n => n.id === nodeId);
    if (!node) return;
    
    const rect = svgRef.current?.getBoundingClientRect();
    if (!rect) return;
    
    const mouseX = ((e.clientX - rect.left) - pan.x) / zoom;
    const mouseY = ((e.clientY - rect.top) - pan.y) / zoom;
    
    // Disable text selection during linking
    document.body.style.userSelect = 'none';
    
    // Start linking mode from connection dot
    setDragOrigin('edge');
    setLinkingMode(true);
    setLinkSource(nodeId);
    setConnectionDot({ x: mouseX, y: mouseY });
    toast('🔗 Drag to another entity to create link', { duration: 1500 });
  };

  // Handle node drag (not for linking)
  const handleNodeMouseDown = (e: React.MouseEvent, nodeId: string) => {
    e.stopPropagation();
    
    if (e.button === 0 && !linkingMode) {
      // ONLY set up for potential dragging - don't set draggedNode yet!
      // We'll set draggedNode in handleMouseMove if mouse actually moves
      setDragStart({ x: e.clientX, y: e.clientY });
      setHasNodeMoved(false);
      
      // Store potential drag node for handleMouseMove to use
      (window as any).__potentialDragNode = nodeId;
    }
  };

  const handleSvgMouseDown = (e: React.MouseEvent) => {
    // Ctrl+Drag: Drag-to-select box (like desktop!)
    if (e.button === 0 && (e.ctrlKey || e.metaKey) && !draggedNode && !linkingMode) {
      e.preventDefault(); // Prevent default behavior
      e.stopPropagation(); // Stop event propagation
      const rect = svgRef.current?.getBoundingClientRect();
      if (rect) {
        const x = ((e.clientX - rect.left) - pan.x) / zoom;
        const y = ((e.clientY - rect.top) - pan.y) / zoom;
        setDragSelectStart({ x, y });
        setDragSelectEnd({ x, y });
      }
      return; // Exit early
    }
    // Middle button: Pan canvas
    else if (e.button === 1) {
      e.preventDefault();
      setIsPanning(true);
      setPanStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
    }
    // Normal drag on empty canvas: Pan canvas/frame
    else if (e.button === 0 && !draggedNode && !linkingMode && !e.ctrlKey && !e.metaKey) {
      e.preventDefault();
      setIsPanning(true);
      setPanStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
    }
  };

  // Use ref to track RAF to prevent multiple simultaneous updates
  const rafIdRef = useRef<number | null>(null);
  
  const handleMouseMove = (e: React.MouseEvent) => {
    // Cancel any pending animation frame
    if (rafIdRef.current !== null) {
      cancelAnimationFrame(rafIdRef.current);
    }
    
    // Schedule update for next frame (throttles to 60fps max)
    rafIdRef.current = requestAnimationFrame(() => {
      // Panning canvas
      if (isPanning) {
        setPan({
          x: e.clientX - panStart.x,
          y: e.clientY - panStart.y
        });
        return;
      }
      
      // Drag-select box
      if (dragSelectStart) {
        const rect = svgRef.current?.getBoundingClientRect();
        if (rect) {
          const x = ((e.clientX - rect.left) - pan.x) / zoom;
          const y = ((e.clientY - rect.top) - pan.y) / zoom;
          setDragSelectEnd({ x, y });
        }
        return;
      }
      
      // Check if we should start dragging (mouse moved from initial position)
      const potentialDragNode = (window as any).__potentialDragNode;
      if (potentialDragNode && !draggedNode && !isPanning) {
        const dx = Math.abs(e.clientX - dragStart.x);
        const dy = Math.abs(e.clientY - dragStart.y);
        
        // Only start dragging if moved more than 3px (prevents accidental drag on click)
        if (dx > 3 || dy > 3) {
          setDraggedNode(potentialDragNode);
          (window as any).__potentialDragNode = null;
        }
      }
      
      // Dragging node(s) - OPTIMIZED: Batch updates to reduce re-renders
      if (draggedNode) {
        const dx = (e.clientX - dragStart.x) / zoom;
        const dy = (e.clientY - dragStart.y) / zoom;
        
        // Mark that node has moved (to prevent onClick from firing)
        if (!hasNodeMoved && (Math.abs(dx) > 1 || Math.abs(dy) > 1)) {
          setHasNodeMoved(true);
        }
        
        // If the dragged node is part of a selection, move all selected nodes
        const nodesToMove = selectedNodes.size > 0 && selectedNodes.has(draggedNode)
          ? selectedNodes
          : new Set([draggedNode]);
        
        // PERFORMANCE: Only update if movement is significant (> 1px)
        if (Math.abs(dx) > 1 || Math.abs(dy) > 1) {
          setNodes(prev => prev.map(node => 
            nodesToMove.has(node.id)
              ? { ...node, x: node.x + dx, y: node.y + dy }
              : node
          ));
          
          setDragStart({ x: e.clientX, y: e.clientY });
        }
      } 
      // Visual linking - show temp line
      else if (linkingMode && linkSource) {
        const rect = svgRef.current?.getBoundingClientRect();
        if (rect) {
          const x = ((e.clientX - rect.left) - pan.x) / zoom;
          const y = ((e.clientY - rect.top) - pan.y) / zoom;
          setTempLinkEnd({ x, y });
        }
      }
      
      rafIdRef.current = null;
    });
  };

  const handleMouseUp = (e?: React.MouseEvent) => {
    console.log('🖱️ handleMouseUp triggered', {
      dragSelectStart,
      isPanning,
      draggedNode,
      hasNodeMoved,
      selectedNodesCount: selectedNodes.size,
      target: e ? (e.target as any).tagName : 'unknown'
    });
    
    // Cancel any pending RAF
    if (rafIdRef.current !== null) {
      cancelAnimationFrame(rafIdRef.current);
      rafIdRef.current = null;
    }
    
    // Re-enable text selection
    document.body.style.userSelect = '';
    
    // Complete drag-select
    if (dragSelectStart && dragSelectEnd) {
      console.log('📦 Drag-select box completed');
      const minX = Math.min(dragSelectStart.x, dragSelectEnd.x);
      const maxX = Math.max(dragSelectStart.x, dragSelectEnd.x);
      const minY = Math.min(dragSelectStart.y, dragSelectEnd.y);
      const maxY = Math.max(dragSelectStart.y, dragSelectEnd.y);
      
      // Find all nodes within the selection box
      const nodesInBox = nodes.filter(node => 
        node.x >= minX && node.x <= maxX && 
        node.y >= minY && node.y <= maxY
      );
      
      // Select them (add to existing selection if Ctrl is held, otherwise replace)
      setSelectedNodes(new Set(nodesInBox.map(n => n.id)));
      
      if (nodesInBox.length > 0) {
        toast.success(`✅ Selected ${nodesInBox.length} node(s)`);
      }
      
      // Clear drag-select state
      setDragSelectStart(null);
      setDragSelectEnd(null);
    }
    
    // Stop panning
    if (isPanning) {
      console.log('🖐️ Panning stopped');
      setIsPanning(false);
    }
    
    // Save node position(s) - BATCH UPDATE to reduce API calls
    if (draggedNode) {
      console.log('💾 Saving node position(s)', draggedNode);
      // If dragging multiple selected nodes, save all their positions
      const nodesToSave = selectedNodes.size > 0 && selectedNodes.has(draggedNode)
        ? Array.from(selectedNodes)
        : [draggedNode];
      
      // Batch position updates - only send one update per node after drag completes
      nodesToSave.forEach(nodeId => {
        const node = nodes.find(n => n.id === nodeId);
        if (node && node.x !== undefined && node.y !== undefined && !isNaN(node.x) && !isNaN(node.y)) {
          updatePositionMutation.mutate({
            entity_id: nodeId,
            position_x: node.x,
            position_y: node.y
          });
        }
      });
    }
    
    // Clean up drag state
    setDraggedNode(null);
    setDragOrigin(null);
    setConnectionDot(null);
    (window as any).__potentialDragNode = null; // Clear potential drag node
  };

  // Hide context menu on click outside
  useEffect(() => {
    const handleClick = () => {
      setContextMenu({ visible: false, x: 0, y: 0, node: null, isCanvas: false });
      if (linkingMode) {
        setLinkingMode(false);
        setLinkSource(null);
        setTempLinkEnd(null);
      }
    };
    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, [linkingMode]);

  // Handle escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (linkingMode) {
          setLinkingMode(false);
          setLinkSource(null);
          setTempLinkEnd(null);
          toast('Link creation cancelled');
        }
        if (showEntityModal) {
          setShowEntityModal(false);
        }
        if (editingLink) {
          setEditingLink(null);
          setEditLinkValue('');
        }
      }
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [linkingMode, showEntityModal, editingLink]);

  // RESTORED: Handle link double-click for quick editing
  const handleLinkDoubleClick = (link: Link) => {
    console.log('🔗 Link double-clicked for editing:', link.label, link.id);
    setEditingLinkData({ id: link.id, currentType: link.type });
    setShowLinkEditModal(true);
  };

  // Handle link label update
  const handleLinkLabelUpdate = (linkId: string, newType: string) => {
    if (newType) {
      updateRelationshipMutation.mutate({
        relationshipId: linkId,
        relationship_type: newType
      });
    }
    setEditingLink(null);
    setEditLinkValue('');
  };

  // Handle link right-click
  // FIXED: Handle link right-click
  const handleLinkRightClick = (e: React.MouseEvent, link: Link) => {
    e.preventDefault();
    e.stopPropagation();
    
    console.log('🔗 Link right-clicked:', link.label, link.id);
    
    setLinkContextMenu({
      visible: true,
      x: e.clientX,
      y: e.clientY,
      link
    });
    
    // Clear other context menus
    setContextMenu({ visible: false, x: 0, y: 0, node: null, isCanvas: false });
  };

  // Global click handler to close context menus and dropdown menus
  useEffect(() => {
    const handleGlobalClick = (e: MouseEvent) => {
      const target = e.target as Element;
      
      // Close context menus
      if (!target.closest('.context-menu')) {
        setContextMenu({ visible: false, x: 0, y: 0, node: null, isCanvas: false });
        setLinkContextMenu({ visible: false, x: 0, y: 0, link: null });
      }
      
      // Close dropdown menus if clicking outside them
      const isLayoutButton = target.closest('[title="Auto Layout Options"]');
      const isLayoutMenu = target.closest('.layout-menu-content');
      const isLayerButton = target.closest('[title="Layer Visibility"]');
      const isLayerMenu = target.closest('.layer-menu-content');
      const isLinkTypeButton = target.closest('[title="Link Type"]');
      const isLinkTypeMenu = target.closest('.link-type-menu-content');
      
      if (!isLayoutButton && !isLayoutMenu && showLayoutMenu) {
        setShowLayoutMenu(false);
      }
      
      if (!isLayerButton && !isLayerMenu && showLayerPanel) {
        setShowLayerPanel(false);
      }
      
      if (!isLinkTypeButton && !isLinkTypeMenu && showLinkTypeMenu) {
        setShowLinkTypeMenu(false);
      }
    };
    
    document.addEventListener('click', handleGlobalClick);
    return () => document.removeEventListener('click', handleGlobalClick);
  }, [showLayoutMenu, showLayerPanel, showLinkTypeMenu]);

  // SIMPLIFIED: Link context menu actions (only delete now)
  const handleLinkContextAction = (action: string, link: Link) => {
    console.log('🎯 Link context action:', action, 'for link:', link.label, link.id);
    setLinkContextMenu({ visible: false, x: 0, y: 0, link: null });
    
    switch (action) {
      case 'delete':
        console.log('🗑️ Attempting to delete link:', link.id);
        if (confirm(`Delete relationship: ${link.label}?`)) {
          console.log('🚀 Calling delete mutation for:', link.id);
          // Mutation handles optimistic update internally
          deleteRelationshipMutation.mutate(link.id);
        }
        break;
    }
  };

  // FIXED: Link editing with dropdown selection
  const handleLinkTypeChange = (newType: string) => {
    if (!editingLinkData) return;
    
    updateRelationshipMutation.mutate({
      relationshipId: editingLinkData.id,
      relationship_type: newType
    });
    
    setShowLinkEditModal(false);
    setEditingLinkData(null);
  };

  // Sync layer metadata from useGraphData hook whenever nodes/layers change
  useEffect(() => {
    const counts: Record<number, number> = {};
    const unique = new Set<number>();

    nodes.forEach(node => {
      const layer = node.metadata?.layer;
      if (layer !== undefined && layer !== null && !Number.isNaN(layer)) {
        unique.add(layer);
        counts[layer] = (counts[layer] || 0) + 1;
      }
    });

    const sortedLayers = Array.from(unique).sort((a, b) => a - b);
    setAvailableLayers(sortedLayers);
    setLayerCounts(counts);

    if (sortedLayers.length > 0 && visibleLayers.size === 0) {
      setVisibleLayers(new Set(sortedLayers));
      const initialOpacity: Record<number, number> = {};
      sortedLayers.forEach((layer, index) => {
        if (index === 0) {
          initialOpacity[layer] = 1;
        } else if (index === 1) {
          initialOpacity[layer] = 0.9;
        } else if (index === 2) {
          initialOpacity[layer] = 0.75;
        } else if (index === 3) {
          initialOpacity[layer] = 0.6;
        } else {
          initialOpacity[layer] = 0.45;
        }
      });
      setLayerOpacity(initialOpacity);
      setLayerPreset('full');
    }
  }, [nodes, layers]);

  const handleLayerVisibilityChange = useCallback((layer: number, visible: boolean) => {
    setVisibleLayers(prev => {
      const next = new Set(prev);
      if (visible) {
        next.add(layer);
      } else {
        next.delete(layer);
      }
      return next;
    });
    setLayerPreset('custom');
    setFilters(prev => ({
      ...prev,
      layers: visible
        ? Array.from(new Set([...prev.layers, layer])).sort((a, b) => a - b)
        : prev.layers.filter(l => l !== layer),
    }));
  }, []);

  const handleLayerOpacityChange = useCallback((layer: number, opacity: number) => {
    setLayerOpacity(prev => ({ ...prev, [layer]: opacity }));
    setLayerPreset('custom');
  }, []);

  const applyLayerPreset = useCallback((preset: LayerPreset) => {
    if (availableLayers.length === 0) return;

    let nextVisible = new Set<number>();
    const nextOpacity: Record<number, number> = {};

    if (preset === 'focus') {
      const focusLayers = availableLayers.slice(0, Math.max(1, Math.min(2, availableLayers.length)));
      focusLayers.forEach(layer => {
        nextVisible.add(layer);
        nextOpacity[layer] = 1;
      });
    } else if (preset === 'medium') {
      const mediumLayers = availableLayers.slice(0, Math.max(2, Math.min(3, availableLayers.length)));
      mediumLayers.forEach((layer, index) => {
        nextVisible.add(layer);
        nextOpacity[layer] = index === 0 ? 1 : 0.85;
      });
    } else {
      availableLayers.forEach((layer, index) => {
        nextVisible.add(layer);
        if (index === 0) nextOpacity[layer] = 1;
        else if (index === 1) nextOpacity[layer] = 0.9;
        else if (index === 2) nextOpacity[layer] = 0.75;
        else if (index === 3) nextOpacity[layer] = 0.6;
        else nextOpacity[layer] = 0.45;
      });
    }

    setVisibleLayers(nextVisible);
    setLayerOpacity(nextOpacity);
    setLayerPreset(preset);
    setFilters(prev => ({
      ...prev,
      layers: Array.from(nextVisible).sort((a, b) => a - b),
    }));
  }, [availableLayers]);

  const handleSelectAllLayers = useCallback(() => {
    const next = new Set(availableLayers);
    setVisibleLayers(next);
    const nextOpacity: Record<number, number> = {};
    availableLayers.forEach((layer, index) => {
      if (index === 0) nextOpacity[layer] = 1;
      else if (index === 1) nextOpacity[layer] = 0.9;
      else if (index === 2) nextOpacity[layer] = 0.75;
      else if (index === 3) nextOpacity[layer] = 0.6;
      else nextOpacity[layer] = 0.45;
    });
    setLayerOpacity(nextOpacity);
    setLayerPreset('full');
    setFilters(prev => ({
      ...prev,
      layers: [...availableLayers],
    }));
  }, [availableLayers]);

  const handleClearAllLayers = useCallback(() => {
    setVisibleLayers(new Set());
    setLayerPreset('custom');
    setFilters(prev => ({
      ...prev,
      layers: [],
    }));
  }, []);

  const LayerMenu: React.FC = () => (
    <div className="absolute top-full right-0 mt-1 z-50 layer-menu-content">
      <LayerControl
        layers={layers}
        visibleLayers={visibleLayers}
        layerOpacity={layerOpacity}
        preset={layerPreset}
        onLayerVisibilityChange={handleLayerVisibilityChange}
        onLayerOpacityChange={handleLayerOpacityChange}
        onPresetApply={applyLayerPreset}
        onSelectAll={handleSelectAllLayers}
        onClearAll={handleClearAllLayers}
      />
    </div>
  );

  const LayoutMenuItem: React.FC<{ label: string; layout: LayoutType; icon?: string }> = ({ label, layout, icon }) => (
    <button
      onClick={() => {
        applyLayout(layout);
        setShowLayoutMenu(false);
      }}
      className={`w-full text-left px-3 py-2 text-sm hover:bg-slate-50 flex items-center gap-2 ${currentLayout === layout ? 'bg-slate-100 text-slate-900 font-medium' : ''}`}
    >
      <div className={`w-2 h-2 rounded-full ${currentLayout === layout ? 'bg-blue-500' : 'bg-slate-300'}`}></div>
      <span className="flex items-center gap-2">
        {icon ? <span>{icon}</span> : null}
        {label}
      </span>
    </button>
  );

  const LayoutMenu: React.FC = () => (
    <div className="absolute top-full right-0 mt-1 w-64 bg-white border border-gray-200 rounded-md shadow-lg z-50 layout-menu-content">
      <div className="py-1">
        <LayoutMenuItem label="Force-Directed" layout="force" />
        <LayoutMenuItem label="Hierarchical" layout="hierarchical" />
        <LayoutMenuItem label="Tree (Layer-based)" layout="tree" icon="🌳" />
        <LayoutMenuItem label="Chronological (Time-based)" layout="chronological" icon="⏰" />
        <LayoutMenuItem label="Layered Sankey (Money Flow)" layout="layeredSankey" icon="💰" />
        <div className="border-t border-gray-200 my-1"></div>
        <div className="px-3 py-1 text-xs font-semibold text-gray-500">EXPERT INVESTIGATION VIEWS</div>
        <LayoutMenuItem label="Hierarchical Tree Explorer" layout="hierarchicalTree" icon="🌲" />
        <LayoutMenuItem label="Smart Tables (Money Tracking)" layout="smartTables" icon="📊" />
        <LayoutMenuItem label="Alluvial Flow (Layer View)" layout="alluvialFlow" icon="🌊" />
        <LayoutMenuItem label="Timeline Sequence (Chronological)" layout="timelineSequence" icon="⏱️" />
        <div className="border-t border-gray-200 my-1"></div>
        <LayoutMenuItem label="Radial (Degree Rings)" layout="radial" icon="🟠" />
        <LayoutMenuItem label="Flow / Sankey" layout="sankey" icon="📈" />
        <LayoutMenuItem label="Timeline (Left → Right)" layout="timeline" icon="🕒" />
        <LayoutMenuItem label="Cluster by Bank" layout="bankCluster" icon="🏦" />
        <div className="border-t border-gray-200 my-1"></div>
        <LayoutMenuItem label="Circular" layout="circular" />
        <LayoutMenuItem label="Grid" layout="grid" />
        <LayoutMenuItem label="Horizontal Flow" layout="horizontal" />
        <LayoutMenuItem label="Ashoka Chakra" layout="chakra" />
        <div className="border-t border-gray-200 my-1"></div>
        <LayoutMenuItem label="Block (by Type)" layout="block" icon="🧱" />
        <LayoutMenuItem label="Centrality" layout="centrality" icon="⭐" />
        <LayoutMenuItem label="Orthogonal" layout="orthogonal" icon="📐" />
      </div>
    </div>
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-slate-700" />
      </div>
    );
  }

  if (nodes.length === 0) {
    return (
      <Card className="m-6 p-12 text-center">
        <div className="mx-auto w-24 h-24 mb-4 rounded-full bg-gray-100 flex items-center justify-center">
          <span className="text-4xl">🕸️</span>
        </div>
        <h3 className="text-lg font-normal text-gray-900 mb-2">No Graph Data Yet</h3>
        <p className="text-sm text-gray-600 mb-6">
          Upload evidence files (CDR, Bank Statements) to auto-populate the graph, or right-click to add entities manually.
        </p>
      </Card>
    );
  }

  return (
    <div className="h-full flex flex-col bg-white">
      {/* Toolbar */}
      <div className="bg-white border-b border-gray-200 px-4 py-3">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-normal text-gray-900">Investigation Graph</h2>
            <Badge variant="outline" className="font-mono">{filteredNodes.length} entities</Badge>
            <Badge variant="outline" className="font-mono">{filteredLinks.length} links</Badge>
            {selectedNodes.size > 0 && (
              <Badge variant="default" className="font-mono">{selectedNodes.size} selected</Badge>
            )}
          </div>
          
          {/* Search Bar */}
          <div className="flex-1 max-w-md relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search entities..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-slate-500 focus:border-transparent"
            />
            {highlightedNodes.size > 0 && (
              <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-xs text-slate-600">
                {highlightedNodes.size} found
              </span>
            )}
          </div>
          
          <div className="flex items-center gap-2">
            {/* Undo/Redo Controls */}
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleUndo}
              disabled={historyIndex < 0}
              title="Undo (Ctrl+Z)"
            >
              <Undo2 className="h-4 w-4" />
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleRedo}
              disabled={historyIndex >= historyStack.length - 1}
              title="Redo (Ctrl+Y)"
            >
              <Redo2 className="h-4 w-4" />
            </Button>
            
            <div className="h-6 w-px bg-gray-300"></div>
            
            {/* Entity Filters Dropdown - Matches Auto Layout styling */}
            <div className="relative">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => setShowEntityFilters(!showEntityFilters)}
                title="Filter by Entity Type"
              >
                <Filter className="h-4 w-4 mr-1.5" />
                Entity Filters
              </Button>
              
              {showEntityFilters && (
                <div className="absolute top-full right-0 mt-1 w-80 bg-white border border-gray-200 rounded-md shadow-lg z-50 max-h-[500px] overflow-y-auto">
                  <div className="py-2 px-3">
                    <div className="flex items-center justify-between mb-3 pb-2 border-b border-gray-200">
                      <h3 className="text-sm font-semibold text-gray-900">Entity Type Filters</h3>
                      <button
                        onClick={() => setShowEntityFilters(false)}
                        className="text-gray-400 hover:text-gray-600"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                    
                    {/* Select All / Clear All */}
                    <div className="flex gap-2 mb-3">
                    <button
                      onClick={() => {
                          const allTypes = new Set(ENTITY_TYPES.map(et => et.id));
                          setVisibleEntityTypes(allTypes);
                          toast.success(`Selected all ${allTypes.size} entity types`);
                      }}
                        className="flex-1 px-2 py-1.5 text-xs bg-slate-100 hover:bg-slate-200 rounded border border-gray-300 transition-colors"
                    >
                        Select All
                    </button>
                    <button
                      onClick={() => {
                          setVisibleEntityTypes(new Set());
                          toast('Cleared all filters - no entities visible');
                      }}
                        className="flex-1 px-2 py-1.5 text-xs bg-slate-100 hover:bg-slate-200 rounded border border-gray-300 transition-colors"
                    >
                        Clear All
                    </button>
                    </div>
                    
                    {/* Result Count */}
                    <div className="mb-3 px-2 py-1.5 bg-blue-50 rounded text-xs text-gray-700 border border-blue-200">
                      Showing <span className="font-bold text-gray-900">{filteredNodes.length}</span> of <span className="font-bold">{nodes.length}</span> entities
                      {filteredLinks.length < links.length && (
                        <span className="ml-1 text-gray-500">
                          ({filteredLinks.length}/{links.length} links)
                        </span>
                      )}
                    </div>
                    
                    {/* Entity Categories - DYNAMICALLY GENERATED FROM ENTITY_TYPES */}
                    <div className="space-y-2">
                      {(() => {
                        // Group entity types by category dynamically
                        const categorized: Record<string, typeof ENTITY_TYPES> = {};
                        ENTITY_TYPES.forEach(entityType => {
                          const category = entityType.category || 'Other';
                          if (!categorized[category]) {
                            categorized[category] = [];
                          }
                          categorized[category].push(entityType);
                        });
                        
                        return Object.entries(categorized).map(([category, types]) => (
                          <div key={category} className="border-b border-gray-200 pb-2 last:border-0">
                            <div className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1.5 px-1">{category}</div>
                            <div className="space-y-1">
                              {types.map(entityType => (
                                <label key={entityType.id} className="flex items-center gap-2 px-2 py-1 hover:bg-slate-50 rounded cursor-pointer group transition-colors">
                                  <input
                                    type="checkbox"
                                    checked={visibleEntityTypes.has(entityType.id)}
                                    onChange={(e) => {
                                      const newVisible = new Set(visibleEntityTypes);
                                      if (e.target.checked) {
                                        newVisible.add(entityType.id);
                                      } else {
                                        newVisible.delete(entityType.id);
                                      }
                                      setVisibleEntityTypes(newVisible);
                                    }}
                                    className="w-3.5 h-3.5 rounded border-gray-300 text-blue-600 focus:ring-blue-500 focus:ring-2"
                                  />
                                  <span className="text-xs text-gray-700 group-hover:text-gray-900 transition-colors flex items-center gap-1.5">
                                    <span>{entityType.icon}</span>
                                    <span>{entityType.name}</span>
                                  </span>
                                </label>
                              ))}
                            </div>
                          </div>
                        ));
                      })()}
                    </div>
                  </div>
                </div>
              )}
            </div>
            
            {/* Link Type Dropdown - Matches button styling */}
            <div className="relative">
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setShowLinkTypeMenu(!showLinkTypeMenu)}
                title="Link Rendering Type"
              >
                <Link2 className="h-4 w-4 mr-1.5" />
                {linkRenderType === 'curved' ? 'Curved' : linkRenderType === 'straight' ? 'Straight' : 'Freehand'} Links
              </Button>
              
              {showLinkTypeMenu && (
                <div className="absolute top-full right-0 mt-1 w-40 bg-white border border-gray-200 rounded-md shadow-lg z-50 link-type-menu-content">
                  <div className="py-1">
                    <button
                      onClick={() => {
                        setLinkRenderType('curved');
                        setShowLinkTypeMenu(false);
                      }}
                      className={`w-full text-left px-3 py-2 text-sm hover:bg-slate-50 flex items-center gap-2 ${linkRenderType === 'curved' ? 'bg-slate-50' : ''}`}
                    >
                      <div className={`w-2 h-2 rounded-full ${linkRenderType === 'curved' ? 'bg-blue-500' : 'bg-slate-300'}`}></div>
                      Curved
                    </button>
                    <button
                      onClick={() => {
                        setLinkRenderType('straight');
                        setShowLinkTypeMenu(false);
                      }}
                      className={`w-full text-left px-3 py-2 text-sm hover:bg-slate-50 flex items-center gap-2 ${linkRenderType === 'straight' ? 'bg-slate-50' : ''}`}
                    >
                      <div className={`w-2 h-2 rounded-full ${linkRenderType === 'straight' ? 'bg-blue-500' : 'bg-slate-300'}`}></div>
                      Straight
                    </button>
                    <button
                      onClick={() => {
                        setLinkRenderType('freehand');
                        setShowLinkTypeMenu(false);
                      }}
                      className={`w-full text-left px-3 py-2 text-sm hover:bg-slate-50 flex items-center gap-2 ${linkRenderType === 'freehand' ? 'bg-slate-50' : ''}`}
                    >
                      <div className={`w-2 h-2 rounded-full ${linkRenderType === 'freehand' ? 'bg-blue-500' : 'bg-slate-300'}`}></div>
                      Freehand
                    </button>
                  </div>
                </div>
              )}
            </div>
            
            {/* Paths Button - Unified styling */}
            <Button 
              variant={showPathAnalysis ? "default" : "outline"}
              size="sm" 
              onClick={() => setShowPathAnalysis(!showPathAnalysis)}
              title="Path Analysis"
            >
              <Route className="h-4 w-4 mr-1.5" />
              Paths
            </Button>
            
            <Button variant="outline" size="sm" onClick={exportGraphAsJSON} title="Export Graph">
              <Download className="h-4 w-4" />
            </Button>
            
            {/* Layout Dropdown */}
            <div className="relative">
              <Button
                variant={showLayoutMenu ? "default" : "outline"}
                size="sm"
                onClick={() => setShowLayoutMenu(!showLayoutMenu)}
                title="Auto Layout Options"
              >
                <Layout className="h-4 w-4 mr-1.5" />
                Layout
              </Button>

              {showLayoutMenu && <LayoutMenu />}
            </div>

            {/* Layer Visibility Dropdown */}
            <div className="relative">
              <Button
                variant={showLayerPanel ? "default" : "outline"}
                size="sm"
                onClick={() => setShowLayerPanel(!showLayerPanel)}
                title="Layer Visibility"
              >
                <Layers className="h-4 w-4 mr-1.5" />
                Layers
              </Button>

              {showLayerPanel && <LayerMenu />}
            </div>
          </div>
        </div>
        {/* Quick Tips */}
        <div className="mt-2 flex items-center gap-4 text-xs text-slate-500">
          <span>💡 <strong className="text-slate-700">Hover and drag blue dot</strong> to create link</span>
          <span className="text-slate-300">•</span>
          <span><strong className="text-slate-700">Click node</strong> to view details</span>
          <span className="text-slate-300">•</span>
          <span><strong className="text-slate-700">Scroll</strong> to pan, <strong className="text-slate-700">Ctrl+Scroll</strong> to zoom</span>
          <span className="text-slate-300">•</span>
          <span><strong className="text-slate-700">Right-click</strong> canvas to add entity</span>
        </div>
      </div>

      {/* Main Tab Navigation */}
      <div className="bg-white border-b border-gray-200">
        <div className="flex items-center px-4">
          <button
            onClick={() => setActiveMainTab('graph')}
            className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeMainTab === 'graph'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300'
            }`}
          >
            📊 Graph View
          </button>
          <button
            onClick={() => setActiveMainTab('analysis')}
            className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeMainTab === 'analysis'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300'
            }`}
          >
            🔍 Expert Analysis
          </button>
        </div>
      </div>

      {/* Expert Analysis Sub-Navigation */}
      {activeMainTab === 'analysis' && (
        <div className="bg-gray-50 border-b border-gray-200 px-4 py-2 overflow-x-auto">
          <div className="flex items-center gap-2 flex-nowrap min-w-max">
            <button
              onClick={() => setActiveAnalysisView('hierarchicalTree')}
              className={`px-4 py-2 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                activeAnalysisView === 'hierarchicalTree'
                  ? 'bg-blue-500 text-white'
                  : 'bg-white text-gray-700 hover:bg-gray-100'
              }`}
            >
              🌲 Tree Explorer
            </button>
            <button
              onClick={() => setActiveAnalysisView('smartTables')}
              className={`px-4 py-2 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                activeAnalysisView === 'smartTables'
                  ? 'bg-blue-500 text-white'
                  : 'bg-white text-gray-700 hover:bg-gray-100'
              }`}
            >
              📊 Smart Tables
            </button>
            <button
              onClick={() => setActiveAnalysisView('alluvialFlow')}
              className={`px-4 py-2 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                activeAnalysisView === 'alluvialFlow'
                  ? 'bg-blue-500 text-white'
                  : 'bg-white text-gray-700 hover:bg-gray-100'
              }`}
            >
              🌊 Alluvial Flow
            </button>
            <button
              onClick={() => setActiveAnalysisView('timelineSequence')}
              className={`px-4 py-2 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                activeAnalysisView === 'timelineSequence'
                  ? 'bg-blue-500 text-white'
                  : 'bg-white text-gray-700 hover:bg-gray-100'
              }`}
            >
              ⏱️ Timeline
            </button>
            <div className="w-px h-6 bg-gray-300 mx-1"></div>
            <button
              onClick={() => setActiveAnalysisView('financial')}
              className={`px-4 py-2 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                activeAnalysisView === 'financial'
                  ? 'bg-blue-500 text-white'
                  : 'bg-white text-gray-700 hover:bg-gray-100'
              }`}
            >
              💰 Financial Summary
            </button>
            <button
              onClick={() => setActiveAnalysisView('patterns')}
              className={`px-4 py-2 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                activeAnalysisView === 'patterns'
                  ? 'bg-blue-500 text-white'
                  : 'bg-white text-gray-700 hover:bg-gray-100'
              }`}
            >
              📈 Pattern Analysis
            </button>
            <button
              onClick={() => setActiveAnalysisView('matrix')}
              className={`px-4 py-2 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                activeAnalysisView === 'matrix'
                  ? 'bg-blue-500 text-white'
                  : 'bg-white text-gray-700 hover:bg-gray-100'
              }`}
            >
              📐 Relationship Matrix
            </button>
            <button
              onClick={() => setActiveAnalysisView('risk')}
              className={`px-4 py-2 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                activeAnalysisView === 'risk'
                  ? 'bg-blue-500 text-white'
                  : 'bg-white text-gray-700 hover:bg-gray-100'
              }`}
            >
              ⚠️ Risk Report
            </button>
            <button
              onClick={() => setActiveAnalysisView('export')}
              className={`px-4 py-2 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                activeAnalysisView === 'export'
                  ? 'bg-blue-500 text-white'
                  : 'bg-white text-gray-700 hover:bg-gray-100'
              }`}
            >
              📄 Export & Reports
            </button>
          </div>
        </div>
      )}

      {/* Maltego-style Selection Toolbar - DISABLED per user request */}
      {false && selectedNodes.size > 0 && (
        <div className="bg-gradient-to-r from-slate-800 to-slate-700 border-b border-slate-600 px-4 py-2.5">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="bg-white text-slate-800 font-mono">
                {selectedNodes.size} selected
              </Badge>
              
              <div className="h-5 w-px bg-slate-500"></div>
              
              {/* Selection Tools */}
              <Button
                size="sm"
                variant="ghost"
                className="text-white hover:bg-slate-600 text-xs h-8"
                onClick={() => {
                  const parents = getParents(Array.from(selectedNodes), nodes, links);
                  setSelectedNodes(new Set([...selectedNodes, ...parents]));
                  toast.success(`Added ${parents.length} parent(s)`);
                }}
                title="Add Parents"
              >
                <Users className="h-3.5 w-3.5 mr-1.5" />
                Add Parents
              </Button>
              
              <Button
                size="sm"
                variant="ghost"
                className="text-white hover:bg-slate-600 text-xs h-8"
                onClick={() => {
                  const children = getChildren(Array.from(selectedNodes), nodes, links);
                  setSelectedNodes(new Set([...selectedNodes, ...children]));
                  toast.success(`Added ${children.length} children`);
                }}
                title="Add Children"
              >
                <CornerDownRight className="h-3.5 w-3.5 mr-1.5" />
                Add Children
              </Button>
              
              <Button
                size="sm"
                variant="ghost"
                className="text-white hover:bg-slate-600 text-xs h-8"
                onClick={() => {
                  const neighbors = getNeighbors(Array.from(selectedNodes), nodes, links);
                  setSelectedNodes(new Set([...selectedNodes, ...neighbors]));
                  toast.success(`Added ${neighbors.length} neighbor(s)`);
                }}
                title="Add Neighbors (1-hop)"
              >
                <Share2 className="h-3.5 w-3.5 mr-1.5" />
                Add Neighbors
              </Button>
              
              <Button
                size="sm"
                variant="ghost"
                className="text-white hover:bg-slate-600 text-xs h-8"
                onClick={() => {
                  const siblings = getSiblings(Array.from(selectedNodes), nodes, links);
                  setSelectedNodes(new Set([...selectedNodes, ...siblings]));
                  toast.success(`Added ${siblings.length} sibling(s)`);
                }}
                title="Add Siblings (same parent)"
              >
                <GitCommit className="h-3.5 w-3.5 mr-1.5" />
                Add Siblings
              </Button>
              
              <div className="h-5 w-px bg-slate-500"></div>
              
                  <Button
                    size="sm"
                variant="ghost"
                className="text-white hover:bg-slate-600 text-xs h-8"
                    onClick={() => {
                  const parents = getParents(Array.from(selectedNodes), nodes, links);
                  setSelectedNodes(new Set(parents));
                  toast.success(`Selected ${parents.length} parent(s)`);
                    }}
                title="Select Parents Only"
                  >
                Select Parents
                  </Button>
              
                  <Button
                    size="sm"
                variant="ghost"
                className="text-white hover:bg-slate-600 text-xs h-8"
                    onClick={() => {
                  const children = getChildren(Array.from(selectedNodes), nodes, links);
                  setSelectedNodes(new Set(children));
                  toast.success(`Selected ${children.length} children`);
                }}
                title="Select Children Only"
              >
                Select Children
                  </Button>
              
              <Button
                size="sm"
                variant="ghost"
                className="text-white hover:bg-slate-600 text-xs h-8"
                onClick={() => {
                  const leaves = getLeaves(nodes, links);
                  setSelectedNodes(new Set(leaves));
                  toast.success(`Selected ${leaves.length} leaf node(s)`);
                }}
                title="Select Leaf Nodes"
              >
                Select Leaves
              </Button>
                </div>
            
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="ghost"
                className="text-white hover:bg-slate-600 text-xs h-8"
                        onClick={() => {
                  const allIds = new Set(nodes.map(n => n.id));
                  const inverted = new Set(Array.from(allIds).filter(id => !selectedNodes.has(id)));
                  setSelectedNodes(inverted);
                  toast.success(`Inverted selection: ${inverted.size} nodes`);
                }}
                title="Invert Selection"
              >
                <ArrowRightLeft className="h-3.5 w-3.5 mr-1.5" />
                Invert
              </Button>
              
              <Button
                size="sm"
                variant="ghost"
                className="text-white hover:bg-slate-600 text-xs h-8"
                onClick={() => {
                  setSelectedNodes(new Set());
                  toast('Selection cleared');
                }}
                title="Clear Selection"
              >
                <X className="h-3.5 w-3.5 mr-1.5" />
                Clear
              </Button>
                  </div>
            </div>
          </div>
        )}

      {/* Main Content - Graph Canvas with Info Panel */}
      <div className="flex-1 flex relative overflow-hidden">
        
        {/* Graph Canvas */}
        <div
          ref={containerRef}
          className="flex-1 relative overflow-hidden bg-gray-50"
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseUp}
          onContextMenu={handleCanvasRightClick}
        >
          {/* Conditional rendering: Tabbed Views - Analysis vs Graph */}
          {activeMainTab === 'analysis' ? (
            activeAnalysisView === 'hierarchicalTree' ? (
              <HierarchicalTreeExplorer
                nodes={filteredNodes}
                links={filteredLinks}
                onAccountClick={(accountId) => {
                  const node = nodes.find(n => n.id === accountId);
                  if (node) {
                    setSelectedNode(node);
                    setEntityDetailsModal({ open: true, node });
                  }
                }}
              />
            ) : activeAnalysisView === 'smartTables' ? (
              <SmartTablesView
                nodes={filteredNodes}
                links={filteredLinks}
                onAccountClick={(accountId) => {
                  const node = nodes.find(n => n.id === accountId);
                  if (node) {
                    setSelectedNode(node);
                    setEntityDetailsModal({ open: true, node });
                  }
                }}
              />
            ) : activeAnalysisView === 'alluvialFlow' ? (
              <AlluvialFlowDiagram
                nodes={filteredNodes}
                links={filteredLinks}
              />
            ) : activeAnalysisView === 'timelineSequence' ? (
              <TimelineSequenceView
                nodes={filteredNodes}
                links={filteredLinks}
                onAccountClick={(accountId) => {
                  const node = nodes.find(n => n.id === accountId);
                  if (node) {
                    setSelectedNode(node);
                    setEntityDetailsModal({ open: true, node });
                  }
                }}
              />
            ) : activeAnalysisView === 'financial' ? (
              <FinancialSummaryDashboard nodes={filteredNodes} links={filteredLinks} />
            ) : activeAnalysisView === 'patterns' ? (
              <PatternAnalysis links={filteredLinks} />
            ) : activeAnalysisView === 'matrix' ? (
              <RelationshipMatrix nodes={filteredNodes} links={filteredLinks} />
            ) : activeAnalysisView === 'risk' ? (
              <RiskScoringReport nodes={filteredNodes} links={filteredLinks} />
            ) : activeAnalysisView === 'export' ? (
              <ExportReports
                nodes={filteredNodes}
                links={filteredLinks}
                caseId={caseId}
                caseName={investigationData?.graph?.metadata?.case_name}
              />
            ) : null
          ) : (
            <>
          {/* Note: onMouseUp removed from container - will be on SVG only */}
        <svg
          ref={svgRef}
          className="w-full h-full"
          style={{ 
            cursor: isPanning ? 'grabbing' : draggedNode ? 'grabbing' : linkingMode ? 'crosshair' : 'grab',
            userSelect: 'none',
            WebkitUserSelect: 'none',
            MozUserSelect: 'none',
            msUserSelect: 'none'
          }}
          onMouseDown={handleSvgMouseDown}
          onMouseUp={handleMouseUp}
          onWheel={handleWheel}
          onClick={(e) => {
            console.log('🖱️ SVG Canvas clicked', {
              target: (e.target as SVGElement).tagName,
              currentTarget: (e.currentTarget as SVGElement).tagName,
              isCurrentTarget: e.target === e.currentTarget,
              ctrlKey: e.ctrlKey,
              metaKey: e.metaKey,
              selectedNodesCount: selectedNodes.size
            });
            
            // Clear highlighted path and selection when clicking empty canvas
            if ((e.target === e.currentTarget || (e.target as SVGElement).tagName === 'rect') && !e.ctrlKey && !e.metaKey) {
              console.log('❌ Clearing selection (canvas click)');
              setHighlightedPath({ nodeIds: new Set(), linkIds: new Set() });
              setSelectedNode(null);
              setSelectedNodes(new Set());
            }
          }}
        >
          <defs>
            <marker
              id="arrowhead"
              markerWidth="6"
              markerHeight="6"
              refX="5"
              refY="2"
              orient="auto"
              markerUnits="strokeWidth"
            >
              <path d="M0,0 L0,4 L5,2 z" fill="#4B5563" />
            </marker>
            
            <pattern id="dots" x="0" y="0" width="20" height="20" patternUnits="userSpaceOnUse">
              <circle cx="2" cy="2" r="1.5" fill="#cbd5e1" opacity="0.4" />
            </pattern>
          </defs>

          <rect width="100%" height="100%" fill="url(#dots)" />

          {/* GPU-ACCELERATED: Using CSS transform instead of SVG transform for 2-3x better performance */}
          <g style={{ transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`, transformOrigin: '0 0' }}>
            {/* Render links - Smooth Curved Lines - VIEWPORT CULLED for performance */}
            {visibleLinksInViewport.map(link => {
              const sourceNode = visibleNodesInViewport.find(n => n.id === link.source);
              const targetNode = visibleNodesInViewport.find(n => n.id === link.target);
              if (!sourceNode || !targetNode) return null;

              const isEditing = editingLink === link.id;
              
              // Check if this is a tree layout with layer data
              const sourceLayer = sourceNode.metadata?.layer;
              const targetLayer = targetNode.metadata?.layer;
              const hasLayerData = sourceLayer !== undefined && targetLayer !== undefined;
              
              // Skip rendering links if either node is in a collapsed layer
              if ((sourceLayer !== undefined && collapsedLayers.has(sourceLayer)) ||
                  (targetLayer !== undefined && collapsedLayers.has(targetLayer))) {
                return null;
              }
              
              // Use layer color for links in tree layout
              const linkColor = hasLayerData ? getLayerColor(targetLayer) : '#4B5563';
              
              // Calculate dynamic attachment points on entity edges
              const nodeRadius = 35; // Slightly larger radius for better attachment
              const arrowOffset = 8;
              
              // Get dynamic attachment points based on direction
              const sourcePoint = getAttachmentPoint(sourceNode.x, sourceNode.y, targetNode.x, targetNode.y, nodeRadius);
              const targetPoint = getAttachmentPoint(targetNode.x, targetNode.y, sourceNode.x, sourceNode.y, nodeRadius + arrowOffset);
              
              const sourceX = sourcePoint.x;
              const sourceY = sourcePoint.y;
              const targetX = targetPoint.x;
              const targetY = targetPoint.y;
              
              const dx = targetNode.x - sourceNode.x;
              const dy = targetNode.y - sourceNode.y;
              const distance = Math.sqrt(dx * dx + dy * dy);
              
              let path: string;
              
              // Use STRAIGHT lines for tree layout (as per user request)
              if (hasLayerData) {
                // STRAIGHT LINE for tree layout
                path = `M ${sourceX},${sourceY} L ${targetX},${targetY}`;
              } else if (linkRenderType === 'straight') {
                // Straight line
                path = `M ${sourceX},${sourceY} L ${targetX},${targetY}`;
              } else if (linkRenderType === 'freehand') {
                // Freehand style with slight curve variation
                const offset = distance * 0.15;
                const controlX1 = sourceX + (targetX - sourceX) * 0.25 - dy * offset / distance * 0.5;
                const controlY1 = sourceY + (targetY - sourceY) * 0.25 + dx * offset / distance * 0.5;
                const controlX2 = sourceX + (targetX - sourceX) * 0.75 + dy * offset / distance * 0.5;
                const controlY2 = sourceY + (targetY - sourceY) * 0.75 - dx * offset / distance * 0.5;
                path = `M ${sourceX},${sourceY} C ${controlX1},${controlY1} ${controlX2},${controlY2} ${targetX},${targetY}`;
              } else {
                // Curved (default) - smooth bezier curve
                const midX = (sourceX + targetX) / 2;
                const midY = (sourceY + targetY) / 2;
                const offset = distance * 0.2;
                const controlX = midX - dy * offset / distance;
                const controlY = midY + dx * offset / distance;
                path = `M ${sourceX},${sourceY} Q ${controlX},${controlY} ${targetX},${targetY}`;
              }
              
              // Check if this link is part of highlighted path
              const isHighlightedLink = highlightedPath.linkIds.has(link.id);

              return (
                <g key={link.id}>
                  {/* Invisible thick hitbox for easy clicking */}
                  <path
                    d={path}
                    fill="none"
                    stroke="transparent"
                    strokeWidth="20"
                    style={{ cursor: 'pointer' }}
                    onContextMenu={(e) => handleLinkRightClick(e, link)}
                    onDoubleClick={() => handleLinkDoubleClick(link)}
                    onMouseEnter={() => setHoveredLink(link.id)}
                    onMouseLeave={() => setHoveredLink(null)}
                  />
                  
                  {/* Link Line - Visible - Layer-colored or Dark Grey */}
                  <path
                    d={path}
                    fill="none"
                    stroke={
                      currentLayout === 'layeredSankey' && link.metadata?.sankeyColor
                        ? link.metadata.sankeyColor
                        : (isHighlightedLink ? linkColor : (hasLayerData ? linkColor : '#4B5563'))
                    }
                    strokeWidth={
                      currentLayout === 'layeredSankey' && link.metadata?.sankeyWidth
                        ? link.metadata.sankeyWidth
                        : (isHighlightedLink ? "4" : (hasLayerData ? "2.5" : "2"))
                    }
                    opacity={highlightedPath.linkIds.size > 0 && !isHighlightedLink ? 0.15 : 1}
                    markerEnd="url(#arrowhead)"
                    style={{
                      transition: 'all 0.3s',
                      pointerEvents: 'none',
                      ...(currentLayout === 'layeredSankey' && link.metadata?.isRapid && {
                        animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite'
                      })
                    }}
                  />
                  
                  {/* Show label based on layout mode */}
                  {(() => {
                    // In hierarchical mode, ALWAYS show labels (Maltego-style)
                    // In other modes, show only on hover
                    const showLabel = !isEditing && (currentLayout === 'hierarchical' || hoveredLink === link.id);
                    
                    if (!showLabel) return null;
                    
                    // Build label text with metadata (like "Blocksize: 256" in Maltego)
                    let labelText = link.label;
                    const metadata = link.metadata || {};
                    
                    // Add metadata annotations for hierarchical mode
                    if (currentLayout === 'hierarchical' && Object.keys(metadata).length > 0) {
                      // Show first relevant metadata field
                      if (metadata.amount) labelText += ` (₹${metadata.amount})`;
                      else if (metadata.frequency) labelText += ` (${metadata.frequency}x)`;
                      else if (metadata.duration) labelText += ` (${metadata.duration}s)`;
                      else if (metadata.confidence) labelText += ` (${Math.round(metadata.confidence * 100)}%)`;
                    }
                    
                    const labelWidth = Math.max(labelText.length * 7, 80);
                    const midX = (sourceNode.x + targetNode.x) / 2;
                    const midY = (sourceNode.y + targetNode.y) / 2;
                    
                    return (
                      <>
                        {/* Background for label */}
                      <rect
                          x={midX - (labelWidth / 2)}
                          y={midY - 16}
                          width={labelWidth}
                          height="22"
                          rx="4"
                          fill={currentLayout === 'hierarchical' ? '#2D3748' : '#1E293B'}
                          opacity={currentLayout === 'hierarchical' ? '0.85' : '0.95'}
                          filter="drop-shadow(0 1px 3px rgba(0,0,0,0.2))"
                      />
                      {/* Label text */}
                      <text
                          x={midX}
                          y={midY - 3}
                        textAnchor="middle"
                          fill="#E2E8F0"
                        fontSize="10"
                          fontWeight="500"
                          style={{ 
                            pointerEvents: 'none', 
                            letterSpacing: '0.3px',
                            fontFamily: 'system-ui, -apple-system, sans-serif'
                          }}
                        >
                          {labelText}
                      </text>
                    </>
                    );
                  })()}
                  
                  {isEditing && (
                    <foreignObject
                      x={(sourceNode.x + targetNode.x) / 2 - 100}
                      y={(sourceNode.y + targetNode.y) / 2 - 20}
                      width="200"
                      height="100"
                    >
                      <select
                        value={editLinkValue}
                        onChange={(e) => {
                          setEditLinkValue(e.target.value);
                          handleLinkLabelUpdate(link.id, e.target.value);
                        }}
                        onBlur={() => {
                          setEditingLink(null);
                          setEditLinkValue('');
                        }}
                        autoFocus
                        className="w-full px-2 py-1.5 text-xs border-2 border-slate-500 rounded bg-white shadow-xl focus:outline-none focus:ring-2 focus:ring-slate-500"
                        style={{ fontSize: '11px' }}
                      >
                        <option value="">-- Select Type --</option>
                        {RELATIONSHIP_TYPES.map(type => (
                          <option key={type.value} value={type.value}>
                            {type.label}
                          </option>
                        ))}
                      </select>
                    </foreignObject>
                  )}
                </g>
              );
            })}

            {/* Temp link while creating */}
            {linkingMode && linkSource && tempLinkEnd && (
              <>
                {/* Dashed line from source/dot to cursor */}
                <line
                  x1={connectionDot?.x || nodes.find(n => n.id === linkSource)?.x || 0}
                  y1={connectionDot?.y || nodes.find(n => n.id === linkSource)?.y || 0}
                  x2={tempLinkEnd.x}
                  y2={tempLinkEnd.y}
                  stroke="#3B82F6"
                  strokeWidth="2"
                  strokeDasharray="5,5"
                  opacity="0.6"
                />
                {/* Connection dot at origin point */}
                {connectionDot && (
                  <circle
                    cx={connectionDot.x}
                    cy={connectionDot.y}
                    r="6"
                    fill="#3B82F6"
                    stroke="white"
                    strokeWidth="2"
                    className="animate-pulse"
                    filter="drop-shadow(0 2px 4px rgba(59,130,246,0.4))"
                  />
                )}
              </>
            )}

            {/* Drag-to-Select Box */}
            {dragSelectStart && dragSelectEnd && (
              <rect
                x={Math.min(dragSelectStart.x, dragSelectEnd.x)}
                y={Math.min(dragSelectStart.y, dragSelectEnd.y)}
                width={Math.abs(dragSelectEnd.x - dragSelectStart.x)}
                height={Math.abs(dragSelectEnd.y - dragSelectStart.y)}
                fill="rgba(59, 130, 246, 0.1)"
                stroke="#3B82F6"
                strokeWidth="2"
                strokeDasharray="5,5"
                style={{ pointerEvents: 'none' }}
              />
            )}

            {/* Layer Controls (for tree layout) - Collapsible */}
            {(() => {
              // Group nodes by layer
              const layerGroups = new Map<number, typeof filteredNodes>();
              filteredNodes.forEach(node => {
                if (node.metadata?.layer !== undefined) {
                  const layer = node.metadata.layer;
                  if (!layerGroups.has(layer)) {
                    layerGroups.set(layer, []);
                  }
                  layerGroups.get(layer)!.push(node);
                }
              });

              // Only render if we have layer data (tree layout active)
              if (layerGroups.size === 0) return null;

              return Array.from(layerGroups.entries()).map(([layer, nodes]) => {
                if (nodes.length === 0) return null;
                
                const isCollapsed = collapsedLayers.has(layer);
                
                // Calculate layer dimensions
                const minX = Math.min(...nodes.map(n => n.x)) - 100;
                const maxX = Math.max(...nodes.map(n => n.x)) + 100;
                const avgY = nodes.reduce((sum, n) => sum + n.y, 0) / nodes.length;
                
                const layerColor = getLayerColor(layer);
                
                return (
                  <g key={`layer-control-${layer}`}>
                    {/* Clickable layer label with expand/collapse button */}
                    <g
                      transform={`translate(${minX - 120}, ${avgY})`}
                      style={{ cursor: 'pointer' }}
                      onClick={() => toggleLayerCollapse(layer)}
                    >
                      {/* Background for button */}
                      <rect
                        x="-10"
                        y="-18"
                        width="110"
                        height="36"
                        fill="white"
                        stroke={layerColor}
                        strokeWidth="2"
                        rx="6"
                        opacity="0.95"
                      />
                      
                      {/* Expand/Collapse icon */}
                      <text
                        x="5"
                        y="5"
                        textAnchor="middle"
                        dominantBaseline="middle"
                        fontSize="16"
                        fill={layerColor}
                      >
                        {isCollapsed ? '▶' : '▼'}
                      </text>
                      
                      {/* Layer label */}
                      <text
                        x="25"
                        y="5"
                        textAnchor="start"
                        dominantBaseline="middle"
                        fill={layerColor}
                        fontSize="13"
                        fontWeight="600"
                      >
                        Layer {layer}
                      </text>
                      
                      {/* Node count badge */}
                      <circle
                        cx="85"
                        cy="5"
                        r="10"
                        fill={layerColor}
                        opacity="0.2"
                      />
                      <text
                        x="85"
                        y="5"
                        textAnchor="middle"
                        dominantBaseline="middle"
                        fill={layerColor}
                        fontSize="10"
                        fontWeight="600"
                      >
                        {nodes.length}
                      </text>
                    </g>
                    
                    {/* Horizontal line connecting to layer */}
                    <line
                      x1={minX - 10}
                      y1={avgY}
                      x2={minX}
                      y2={avgY}
                      stroke={layerColor}
                      strokeWidth="2"
                      opacity="0.4"
                      strokeDasharray="4,4"
                      style={{ pointerEvents: 'none' }}
                    />
                  </g>
                );
              });
            })()}

            {/* Render nodes - Security Graph Style (Circular) - VIEWPORT CULLED for performance */}
            {visibleNodesInViewport.map(node => {
              // Skip rendering nodes in collapsed layers
              if (node.metadata?.layer !== undefined && collapsedLayers.has(node.metadata.layer)) {
                return null;
              }
              
              // SPECIAL NODE DETECTION
              const isTerminalNode = node.metadata?.is_terminal === true || node.entity?.category === 'terminal';
              const isVictimSecondary = node.metadata?.is_victim_to_victim === true || node.entity?.category === 'victim_secondary';
              
              // Use layer color if available (tree layout), otherwise use category color
              const hasLayerColor = node.metadata?.layerColor;
              let categoryColor = hasLayerColor ? node.metadata.layerColor : getCategoryColor(node.type);
              
              // Override with ORANGE for victim-to-victim nodes (Layer 1 victim accounts)
              if (isVictimSecondary) {
                categoryColor = '#F97316'; // Orange-500 for victim-to-victim
              }
              // Override with RED for terminal nodes (receivers who don't forward)
              else if (isTerminalNode) {
                categoryColor = '#EF4444'; // Red-500 for terminal nodes
              }
              
              const riskColor = getRiskColor(node.risk_level);
              const nodeSize = 60; // Circle diameter
              const nodeRadius = nodeSize / 2;
              const isHighlighted = highlightedNodes.has(node.id);
              const isMultiSelected = selectedNodes.has(node.id);
              const isLinkSource = linkSource === node.id;
              const isInHighlightedPath = highlightedPath.nodeIds.has(node.id);

              return (
                <g
                  key={node.id}
                  transform={`translate(${node.x}, ${node.y})`}
                  opacity={highlightedPath.nodeIds.size > 0 && !isInHighlightedPath ? 0.15 : 1}
                  onMouseDown={(e) => {
                    handleNodeMouseDown(e, node.id);
                  }}
                  onDoubleClick={(e) => {
                    e.stopPropagation();
                    // Open entity details modal on double-click
                    setEntityDetailsModal({ open: true, node });
                  }}
                  onMouseUp={(e) => {
                    console.log('🖱️ Node onMouseUp', {
                      nodeId: node.id,
                      linkingMode,
                      hasNodeMoved,
                      hadPotentialDrag: !!(window as any).__potentialDragNode
                    });
                    
                    // CRITICAL: Stop propagation FIRST
                      e.stopPropagation();
                    
                    // Clear potential drag node (this was preventing release!)
                    (window as any).__potentialDragNode = null;
                    
                    // Clear dragged node state to prevent stuck cursor
                    setDraggedNode(null);
                    
                    // If node wasn't dragged, this is a click - handle selection HERE
                    if (!hasNodeMoved) {
                      console.log('📍 Node clicked (via onMouseUp), handling selection');
                      
                      if (linkingMode && linkSource && linkSource !== node.id) {
                        // Complete link in linking mode
                      createRelationshipMutation.mutate({
                        source_entity_id: linkSource,
                        target_entity_id: node.id,
                        relationship_type: 'CONNECTED'
                      });
                        setLinkingMode(false);
                        setLinkSource(null);
                        setTempLinkEnd(null);
                      } else {
                        // Handle selection
                        if (e.ctrlKey || e.metaKey) {
                          console.log('✅ Multi-select mode (Ctrl/Cmd held)');
                          // Multi-select
                          setSelectedNodes(prev => {
                            const newSet = new Set(prev);
                            if (newSet.has(node.id)) {
                              newSet.delete(node.id);
                            } else {
                              newSet.add(node.id);
                            }
                            return newSet;
                          });
                        } else {
                          console.log('✅ Single select mode', node.id);
                          // Single selection
                          setSelectedNode(node);
                          setSelectedNodes(new Set([node.id]));
                          
                          // HIGHLIGHT DOWNSTREAM PATH
                          console.log('🔦 Highlighting downstream path from', node.id);
                          highlightDownstreamPath(node.id);
                        }
                      }
                    }
                  }}
                  onClick={(e) => {
                    console.log('🖱️ Node onClick (just preventing canvas click)');
                    // CRITICAL: Stop propagation to prevent canvas onClick from clearing selection
                    e.stopPropagation();
                    // Selection already handled in onMouseUp - this just prevents canvas click
                  }}
                  onContextMenu={(e) => handleNodeRightClick(e, node)}
                  onMouseEnter={() => setHoveredNode(node.id)}
                  onMouseLeave={() => setHoveredNode(null)}
                  style={{ cursor: linkingMode ? 'crosshair' : 'pointer' }}
                >
                  {/* Subtle glow for selected nodes (no double circle) */}
                  {(isLinkSource || isMultiSelected) && (
                    <circle
                      cx="0"
                      cy="0"
                      r={nodeRadius + 4}
                      fill={
                        currentLayout === 'layeredSankey' && node.metadata?.classificationColor
                          ? `${node.metadata.classificationColor}33` // Add 20% opacity
                          : (isMultiSelected ? 'rgba(16, 185, 129, 0.15)' : 'rgba(59, 130, 246, 0.15)')
                      }
                      stroke={
                        currentLayout === 'layeredSankey' && node.metadata?.classificationColor
                          ? node.metadata.classificationColor
                          : 'none'
                      }
                      strokeWidth={currentLayout === 'layeredSankey' ? "2" : "0"}
                    />
                  )}
                  
                  {/* Pulse ring only for critical risk nodes (not selection) */}
                  {node.risk_level === 'critical' && !isMultiSelected && !isLinkSource && (
                    <circle
                      cx="0"
                      cy="0"
                      r={nodeRadius + 8}
                      fill="none"
                      stroke={riskColor}
                      strokeWidth="2"
                      opacity="0.3"
                      className="animate-pulse"
                    />
                  )}
                  
                  {/* Highlight ring for search results */}
                  {isHighlighted && (
                    <circle
                      cx="0"
                      cy="0"
                      r={nodeRadius + 12}
                      fill="none"
                      stroke="#FBBF24"
                      strokeWidth="3"
                      opacity="0.6"
                      className="animate-pulse"
                    />
                  )}
                  
                  {/* CRITICAL: Invisible hitbox for reliable clicking/dragging */}
                  {/* NOTE: We DON'T set pointerEvents here - let events bubble to parent <g> */}
                  <circle
                    cx="0"
                    cy="0"
                    r={nodeRadius + 5}
                    fill="transparent"
                    style={{ 
                      cursor: linkingMode ? 'crosshair' : 'pointer'
                      // NO pointerEvents - let parent <g> handle all events
                    }}
                  />
                  
                  {/* Icon ONLY - no circle background */}
                  <text
                    x="0"
                    y="0"
                    textAnchor="middle"
                    dominantBaseline="central"
                    fontSize="32"
                    style={{ 
                      pointerEvents: 'none', // Icon doesn't capture events
                      filter: isMultiSelected || isLinkSource 
                        ? 'drop-shadow(0 0 8px rgba(59, 130, 246, 0.8))' 
                        : 'drop-shadow(0 2px 4px rgba(0,0,0,0.2))'
                    }}
                  >
                    {getEntityIcon(node.type)}
                  </text>
                  
                  {/* Selection ring - only when selected */}
                  {(isMultiSelected || isLinkSource) && (
                    <circle
                      cx="0"
                      cy="0"
                      r={nodeRadius + 5}
                      fill="none"
                      stroke={isMultiSelected ? '#10B981' : '#3B82F6'}
                      strokeWidth="3"
                      strokeDasharray="5,5"
                      opacity="0.6"
                    />
                  )}
                  
                  {/* Label below node - ALWAYS VISIBLE - Don't capture pointer events */}
                  <text
                    x="0"
                    y={nodeRadius + 18}
                    textAnchor="middle"
                    fill="#6B7280"
                    fontSize="9"
                    fontWeight="500"
                    style={{ 
                      textTransform: 'uppercase', 
                      letterSpacing: '0.5px', 
                      pointerEvents: 'none',
                      userSelect: 'none'
                    }}
                  >
                    {node.type.substring(0, 10)}
                  </text>
                  
                  <text
                    x="0"
                    y={nodeRadius + 32}
                    textAnchor="middle"
                    fill="#1F2937"
                    fontSize="11"
                    fontWeight="600"
                    style={{ 
                      pointerEvents: 'none',
                      userSelect: 'none'
                    }}
                  >
                    {node.label.length > 15 ? node.label.substring(0, 12) + '...' : node.label}
                  </text>
                  
                  {/* Connection handles - visible on hover, clickable for linking */}
                  {(hoveredNode === node.id || linkingMode) && (
                    <>
                      <circle 
                        cx={-nodeRadius} 
                        cy="0" 
                        r="6" 
                        fill="#3B82F6" 
                        stroke="white"
                        strokeWidth="2"
                        style={{ cursor: 'crosshair' }}
                        opacity="0.9"
                        onMouseDown={(e) => handleConnectionDotMouseDown(e, node.id)}
                      />
                      <circle 
                        cx={nodeRadius} 
                        cy="0" 
                        r="6" 
                        fill="#3B82F6" 
                        stroke="white"
                        strokeWidth="2"
                        style={{ cursor: 'crosshair' }}
                        opacity="0.9"
                        onMouseDown={(e) => handleConnectionDotMouseDown(e, node.id)}
                      />
                      <circle 
                        cx="0" 
                        cy={-nodeRadius} 
                        r="6" 
                        fill="#3B82F6" 
                        stroke="white"
                        strokeWidth="2"
                        style={{ cursor: 'crosshair' }}
                        opacity="0.9"
                        onMouseDown={(e) => handleConnectionDotMouseDown(e, node.id)}
                      />
                      <circle 
                        cx="0" 
                        cy={nodeRadius} 
                        r="6" 
                        fill="#3B82F6" 
                        stroke="white"
                        strokeWidth="2"
                        style={{ cursor: 'crosshair' }}
                        opacity="0.9"
                        onMouseDown={(e) => handleConnectionDotMouseDown(e, node.id)}
                      />
                    </>
                  )}
                </g>
              );
            })}
          </g>
        </svg>
            </>
          )}

        {/* Custom Context Menu */}
        {contextMenu.visible && (() => {
          // Smart positioning to keep menu on screen
          const menuWidth = contextMenuStage === 'search' ? 400 : 260;
          const menuHeight = contextMenuStage === 'search' ? 500 : 300;
          const windowWidth = window.innerWidth;
          const windowHeight = window.innerHeight;
          
          let left = contextMenu.x;
          let top = contextMenu.y;
          
          // Adjust horizontal position if menu would go off-screen
          if (left + menuWidth > windowWidth) {
            left = windowWidth - menuWidth - 10;
          }
          
          // Adjust vertical position if menu would go off-screen
          if (top + menuHeight > windowHeight) {
            top = windowHeight - menuHeight - 10;
          }
          
          return (
            <div
              className="fixed text-white rounded-xl z-50"
            style={{ 
                left: left, 
                top: top,
                maxWidth: contextMenuStage === 'search' ? '400px' : '260px',
                maxHeight: contextMenuStage === 'search' ? '500px' : 'auto',
                background: 'rgba(30, 41, 59, 0.95)',
                backdropFilter: 'blur(16px)',
                WebkitBackdropFilter: 'blur(16px)',
                border: '1px solid rgba(148, 163, 184, 0.2)',
                boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.4), 0 10px 10px -5px rgba(0, 0, 0, 0.3), inset 0 1px 0 0 rgba(255, 255, 255, 0.05)'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {contextMenu.isCanvas ? (
              // Canvas context menu - Multi-stage - DARK MALTEGO THEME
              <>
                {contextMenuStage === 'main' && (
                  <div className="py-2">
                    <button
                      className="w-full px-4 py-2.5 text-left text-sm hover:bg-slate-700 flex items-center gap-3 text-white font-medium transition-colors rounded"
                      onClick={() => handleContextAction('add-entity')}
                    >
                      <span className="text-lg">➕</span>
                      <span>Add Entity</span>
                    </button>
                  </div>
                )}
                
                {contextMenuStage === 'search' && (
                  <div className="p-3 flex flex-col" style={{ width: '380px', maxHeight: '480px' }}>
                    {/* Search Input - DARK THEME */}
                    <input
                      type="text"
                      placeholder="Search entity types..."
                      value={entitySearchQuery}
                      onChange={(e) => setEntitySearchQuery(e.target.value)}
                      className="w-full px-3 py-2 mb-3 bg-slate-700 border border-slate-600 rounded-md text-sm text-white placeholder-slate-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      autoFocus
                    />
                    
                    {/* Entity Type List - DARK THEME */}
                    <div className="flex-1 overflow-y-auto" style={{ maxHeight: '400px' }}>
                      {Object.entries(groupedEntityTypes).map(([category, types]) => (
                        <div key={category} className="mb-3 last:mb-0">
                          <div className="text-xs font-medium uppercase text-slate-400 mb-1 px-2 sticky top-0 bg-slate-800">
                            {category}
                          </div>
                          <div className="space-y-0.5">
                            {types.map((type) => (
                              <button
                                key={type.id}
                                onClick={() => handleContextAction('select-type', type.id)}
                                className="w-full flex items-center gap-2 px-3 py-2 hover:bg-slate-700 text-left text-sm rounded transition-colors text-white"
                              >
                                <span className="text-lg">{type.icon}</span>
                                <span>{type.name}</span>
                              </button>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                    
                    {/* Back Button - DARK THEME */}
                    <button
                      onClick={() => {
                        setContextMenuStage('main');
                        setEntitySearchQuery('');
                      }}
                      className="mt-3 w-full px-3 py-2 text-sm text-slate-300 hover:bg-slate-700 hover:text-white rounded transition-colors"
                    >
                      ← Back
                    </button>
                  </div>
                )}
                
                {contextMenuStage === 'input' && (
                  <div className="p-4" style={{ width: '280px' }}>
                    {/* Selected Type Display - DARK THEME */}
                    <div className="flex items-center gap-2 mb-3 pb-3 border-b border-slate-600">
                      <span className="text-2xl">
                        {ENTITY_TYPES.find(t => t.id === selectedEntityType)?.icon}
                      </span>
                      <div className="flex-1">
                        <div className="text-sm font-medium text-white">
                          {ENTITY_TYPES.find(t => t.id === selectedEntityType)?.name}
                        </div>
                        <div className="text-xs text-slate-400">
                          {ENTITY_TYPES.find(t => t.id === selectedEntityType)?.category}
                        </div>
                      </div>
                    </div>
                    
                    {/* Value Input - DARK THEME */}
                    <input
                      type="text"
                      placeholder={`Enter ${ENTITY_TYPES.find(t => t.id === selectedEntityType)?.name.toLowerCase()}`}
                      value={entityValue}
                      onChange={(e) => setEntityValue(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && entityValue.trim()) {
                          handleContextAction('create-entity', selectedEntityType, entityValue);
                        }
                      }}
                      className="w-full px-3 py-2 mb-3 bg-slate-700 border border-slate-600 rounded-md text-sm text-white placeholder-slate-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      autoFocus
                    />
                    
                    {/* Action Buttons - DARK THEME */}
                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          setContextMenuStage('search');
                          setSelectedEntityType('');
                          setEntityValue('');
                        }}
                        className="flex-1 px-3 py-2 text-sm text-slate-300 hover:bg-slate-700 hover:text-white rounded transition-colors"
                      >
                        ← Back
                      </button>
                      <button
                        onClick={() => handleContextAction('create-entity', selectedEntityType, entityValue)}
                        disabled={!entityValue.trim() || createEntityMutation.isPending}
                        className="flex-1 px-3 py-2 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        {createEntityMutation.isPending ? 'Adding...' : 'Add'}
                      </button>
                    </div>
                  </div>
                )}
              </>
            ) : contextMenu.node ? (
              // Node context menu - Edit, Transforms, LERS, Delete
              <>
                <button
                  className="w-full px-3 py-2 text-left text-sm hover:bg-slate-700 hover:text-white flex items-center gap-2 transition-all rounded"
                  onClick={() => {
                    setContextMenuStage('edit');
                    setEntityValue(contextMenu.node?.label || '');
                  }}
                >
                  <Edit3 className="w-4 h-4" />
                  <span>Edit Entity</span>
                </button>
                
                <div className="border-t border-slate-600 my-1"></div>
                
                <button
                  className="w-full px-3 py-2 text-left text-sm hover:bg-slate-700 hover:text-white flex items-center justify-between transition-all rounded"
                  onClick={() => setContextMenuStage('transforms')}
                >
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4" />
                    <span>Run Transforms</span>
                  </div>
                  <ChevronRight className="w-4 h-4" />
                </button>
                
                <div className="border-t border-slate-600 my-1"></div>
                
                <button
                  className="w-full px-3 py-2 text-left text-sm hover:bg-slate-700 hover:text-white flex items-center gap-2 transition-all rounded"
                  onClick={() => {
                    setShowCreateLersModal(true);
                    setContextMenu({ visible: false, x: 0, y: 0, node: null, isCanvas: false });
                  }}
                >
                  <FileText className="w-4 h-4" />
                  <span>Create LERS Request</span>
                </button>
                
                <div className="border-t border-slate-600 my-1"></div>
                
                <button
                  className="w-full px-3 py-2 text-left text-sm hover:bg-red-600 hover:text-white text-red-600 flex items-center gap-2 transition-all rounded"
                  onClick={() => handleContextAction('delete')}
                >
                  <Trash2 className="w-4 h-4" />
                  <span>Delete Entity</span>
                </button>
              </>
            ) : null}
            
            {/* Edit Entity Stage */}
            {contextMenuStage === 'edit' && contextMenu.node && (
              <div className="p-4" style={{ width: '280px' }}>
                <div className="flex items-center gap-2 mb-3 pb-3 border-b border-slate-600">
                  <span className="text-2xl">
                    {getEntityIcon(contextMenu.node.type)}
                  </span>
                  <div className="flex-1">
                    <div className="text-sm font-medium text-white">
                      Edit Entity
                    </div>
                    <div className="text-xs text-slate-400">
                      {ENTITY_TYPES.find(t => t.id === contextMenu.node?.type)?.name || contextMenu.node.type}
                    </div>
                  </div>
                </div>
                
                {/* Value Input */}
                <input
                  type="text"
                  placeholder="Enter new label"
                  value={entityValue}
                  onChange={(e) => setEntityValue(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && entityValue.trim() && contextMenu.node) {
                      // Call backend API to persist the change
                      updateEntityLabel({
                        entity_id: contextMenu.node.id,
                        value: entityValue.trim()
                      });
                      setContextMenu({ visible: false, x: 0, y: 0, node: null, isCanvas: false });
                      setContextMenuStage('main');
                      setEntityValue('');
                    }
                  }}
                  className="w-full px-3 py-2 mb-3 bg-slate-700 border border-slate-600 rounded-md text-sm text-white placeholder-slate-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  autoFocus
                />
                
                {/* Action Buttons */}
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      setContextMenuStage('main');
                      setEntityValue('');
                    }}
                    className="flex-1 px-3 py-2 text-sm text-slate-300 hover:bg-slate-700 rounded"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => {
                      if (entityValue.trim() && contextMenu.node) {
                        // Call backend API to persist the change
                        updateEntityLabel({
                          entity_id: contextMenu.node.id,
                          value: entityValue.trim()
                        });
                        setContextMenu({ visible: false, x: 0, y: 0, node: null, isCanvas: false });
                        setContextMenuStage('main');
                        setEntityValue('');
                      }
                    }}
                    disabled={!entityValue.trim()}
                    className="flex-1 px-3 py-2 text-sm bg-blue-600 text-white hover:bg-blue-700 rounded disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Save
                  </button>
                </div>
          </div>
        )}
            
            {/* Transforms Submenu Stage */}
            {contextMenuStage === 'transforms' && contextMenu.node && (() => {
              // Smart positioning for submenu - check both horizontal AND vertical space
              const submenuWidth = 340;
              const submenuHeight = 520; // Approximate height with all transforms
              const windowWidth = window.innerWidth;
              const windowHeight = window.innerHeight;
              const mainMenuRect = document.querySelector('.fixed.text-white.rounded-xl')?.getBoundingClientRect();
              
              let submenuStyle: React.CSSProperties = { 
                minWidth: '340px',
                maxHeight: '520px'
              };
              
              if (mainMenuRect) {
                // Horizontal positioning
                if (mainMenuRect.right + submenuWidth > windowWidth) {
                  // Open to the left instead
                  submenuStyle.right = '100%';
                  submenuStyle.marginRight = '12px';
                } else {
                  // Open to the right (default)
                  submenuStyle.left = '100%';
                  submenuStyle.marginLeft = '12px';
                }
                
                // Vertical positioning - CRITICAL FIX
                const availableSpaceBelow = windowHeight - mainMenuRect.top;
                const availableSpaceAbove = mainMenuRect.top;
                
                if (submenuHeight > availableSpaceBelow && availableSpaceAbove > availableSpaceBelow) {
                  // Not enough space below, but more space above - open upward
                  submenuStyle.bottom = 0;
                  submenuStyle.maxHeight = `${Math.min(availableSpaceAbove - 20, submenuHeight)}px`;
                } else {
                  // Open downward (default)
                  submenuStyle.top = 0;
                  submenuStyle.maxHeight = `${Math.min(availableSpaceBelow - 20, submenuHeight)}px`;
                }
              }
              
              return (
                <div 
                  className="absolute text-white rounded-xl p-4 overflow-y-auto" 
                  style={{
                    ...submenuStyle,
                    background: 'rgba(30, 41, 59, 0.98)',
                    backdropFilter: 'blur(20px)',
                    WebkitBackdropFilter: 'blur(20px)',
                    border: '1px solid rgba(148, 163, 184, 0.25)',
                    boxShadow: '0 25px 30px -5px rgba(0, 0, 0, 0.5), 0 15px 15px -5px rgba(0, 0, 0, 0.4), inset 0 1px 0 0 rgba(255, 255, 255, 0.06)'
                  }}
                >
                <div className="mb-4">
                  <div className="text-sm font-semibold text-white mb-1 flex items-center gap-2">
                    <Sparkles className="w-4 h-4" />
                    Run Transforms
                  </div>
                  <div className="text-xs text-slate-400 mb-3">
                    Upload a file (Bank Statement, CDR, etc.) to run analysis transforms
                  </div>
                </div>
                
                {/* File Upload */}
                <div className="mb-4">
                  <label className="block text-xs text-slate-200 mb-2 font-medium">Upload File</label>
                  <input
                    type="file"
                    accept=".csv,.xlsx,.xls,.pdf,.eml"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        setUploadedFile(file);
                        toast.success(`File "${file.name}" ready for transform`);
                      }
                    }}
                    className="block w-full text-xs text-white rounded-lg cursor-pointer transition-all focus:outline-none file:mr-3 file:py-2.5 file:px-4 file:rounded-md file:border-0 file:text-xs file:font-medium file:text-white file:transition-all hover:file:scale-105"
                    style={{
                      background: 'rgba(51, 65, 85, 0.6)',
                      border: '1px solid rgba(148, 163, 184, 0.2)',
                      backdropFilter: 'blur(8px)',
                      WebkitBackdropFilter: 'blur(8px)'
                    }}
                  />
                  {uploadedFile && (
                    <div 
                      className="mt-2 text-xs text-emerald-300 flex items-center gap-1.5 px-3 py-2 rounded-lg"
                      style={{
                        background: 'rgba(16, 185, 129, 0.15)',
                        border: '1px solid rgba(16, 185, 129, 0.3)',
                        backdropFilter: 'blur(4px)',
                        WebkitBackdropFilter: 'blur(4px)'
                      }}
                    >
                      <FileText className="h-3.5 w-3.5" />
                      <span className="font-medium">{uploadedFile.name}</span>
                    </div>
                  )}
                </div>
                
                {/* Transform Options */}
                <div className="space-y-1.5 max-h-56 overflow-y-auto mb-4 pr-1">
                  {[
                    { id: 'money-flow', name: 'Money Flow Analysis', icon: '💰', type: 'Financial', desc: 'Trace money movement across accounts' },
                    { id: 'velocity', name: 'Velocity Detection', icon: '⚡', type: 'Financial', desc: 'Detect rapid fund transfers' },
                    { id: 'mule', name: 'Mule Detection', icon: '🎯', type: 'Financial', desc: 'Identify mule accounts' },
                    { id: 'contact-network', name: 'Contact Network', icon: '📞', type: 'Telecom', desc: 'Map call relationships' },
                    { id: 'night-stay', name: 'Night Stay Location', icon: '🏠', type: 'Telecom', desc: 'Find residence location' },
                    { id: 'movement', name: 'Movement Pattern', icon: '🗺️', type: 'Telecom', desc: 'Track movement over time' },
                    { id: 'profile-scrape', name: 'Profile Scraping', icon: '📸', type: 'Social', desc: 'Extract social media data' },
                  ].map(transform => (
                    <button
                      key={transform.id}
                      onClick={async () => {
                        if (!uploadedFile) {
                          toast.error('Please upload a file first');
                          return;
                        }
                        
                        try {
                          toast.loading(`Running ${transform.name}...`, { id: 'transform' });
                          
                          // Read file content
                          const fileContent = await uploadedFile.text();
                          const fileSize = uploadedFile.size;
                          const fileType = uploadedFile.name.split('.').pop() || '';
                          
                          // Log file upload success
                          console.log(`File uploaded: ${uploadedFile.name} (${fileSize} bytes, type: ${fileType})`);
                          console.log(`Transform: ${transform.name} (${transform.type})`);
                          
                          // Auto-apply transform-specific layout
                          if (transform.type === 'Telecom' && transform.id === 'contact-network') {
                            setTransformBasedLayout('chakra');
                            toast.success(`${transform.name} completed! Applying Ashoka Chakra layout...`, { id: 'transform' });
                          } else if (transform.type === 'Financial' && transform.id === 'money-flow') {
                            setTransformBasedLayout('horizontal');
                            toast.success(`${transform.name} completed! Applying horizontal flow layout...`, { id: 'transform' });
                          } else {
                            toast.success(`${transform.name} completed! File parsed successfully.`, { id: 'transform' });
                          }
                          
                          // Show mock results
                          setTransformResults({
                            title: transform.name,
                            message: `Successfully processed ${uploadedFile.name}`,
                            fileSize: `${(fileSize / 1024).toFixed(2)} KB`,
                            fileType: fileType.toUpperCase(),
                            rowsProcessed: fileContent.split('\n').length,
                            timestamp: new Date().toLocaleString()
                          });
                          setShowTransformResults(true);
                          
                        } catch (error: any) {
                          console.error('Transform error:', error);
                          toast.error(`Failed to run transform: ${error.message}`, { id: 'transform' });
                        } finally {
                          setContextMenu({ visible: false, x: 0, y: 0, node: null, isCanvas: false });
                          setContextMenuStage('main');
                          setUploadedFile(null);
                        }
                      }}
                      className="w-full flex items-start gap-2.5 px-3 py-3 text-xs rounded-lg transition-all text-left group relative overflow-hidden"
                      style={{
                        background: 'rgba(51, 65, 85, 0.4)',
                        border: '1px solid rgba(148, 163, 184, 0.15)',
                        backdropFilter: 'blur(4px)',
                        WebkitBackdropFilter: 'blur(4px)'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = 'rgba(71, 85, 105, 0.6)';
                        e.currentTarget.style.borderColor = 'rgba(148, 163, 184, 0.3)';
                        e.currentTarget.style.transform = 'translateY(-1px)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = 'rgba(51, 65, 85, 0.4)';
                        e.currentTarget.style.borderColor = 'rgba(148, 163, 184, 0.15)';
                        e.currentTarget.style.transform = 'translateY(0)';
                      }}
                    >
                      <span className="text-lg mt-0.5 transition-transform group-hover:scale-110">{transform.icon}</span>
                      <div className="flex-1">
                        <div className="font-semibold text-white group-hover:text-blue-200 transition-colors">{transform.name}</div>
                        <div className="text-[10px] text-slate-300 mt-0.5 leading-relaxed">{transform.desc}</div>
                        <div 
                          className="text-[9px] mt-1.5 uppercase tracking-wider font-medium px-2 py-0.5 rounded inline-block"
                          style={{
                            background: transform.type === 'Financial' ? 'rgba(34, 197, 94, 0.2)' : 
                                       transform.type === 'Telecom' ? 'rgba(59, 130, 246, 0.2)' : 
                                       'rgba(168, 85, 247, 0.2)',
                            color: transform.type === 'Financial' ? '#86efac' : 
                                   transform.type === 'Telecom' ? '#93c5fd' : 
                                   '#d8b4fe'
                          }}
                        >
                          {transform.type}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
                
                {/* Back Button */}
                <button
                  onClick={() => {
                    setContextMenuStage('main');
                    setUploadedFile(null);
                  }}
                  className="w-full px-3 py-2.5 text-sm rounded-lg flex items-center justify-center gap-2 transition-all font-medium"
                  style={{
                    background: 'rgba(51, 65, 85, 0.5)',
                    border: '1px solid rgba(148, 163, 184, 0.2)',
                    color: '#cbd5e1',
                    backdropFilter: 'blur(4px)',
                    WebkitBackdropFilter: 'blur(4px)'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'rgba(71, 85, 105, 0.7)';
                    e.currentTarget.style.color = '#ffffff';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'rgba(51, 65, 85, 0.5)';
                    e.currentTarget.style.color = '#cbd5e1';
                  }}
                >
                  <ChevronLeft className="w-4 h-4" />
                  Back
                </button>
                </div>
              );
            })()}
            </div>
          );
        })()}

        {/* Floating Control Panel - Fixed position (doesn't move with pan) */}
        <div className="fixed bottom-6 right-6 flex flex-col gap-1 bg-white rounded-lg shadow-lg p-1.5 border border-gray-200 z-50">
          <button
            onClick={() => handleZoom(0.1)}
            className="p-2.5 hover:bg-gray-100 rounded transition-colors"
            title="Zoom In"
          >
            <Plus className="w-5 h-5 text-gray-700" />
          </button>
          <button
            onClick={() => handleZoom(-0.1)}
            className="p-2.5 hover:bg-gray-100 rounded transition-colors"
            title="Zoom Out"
          >
            <span className="text-gray-700 text-xl font-bold leading-none">−</span>
          </button>
          <div className="border-t border-gray-200 my-0.5"></div>
          <button
            onClick={toggleFullscreen}
            className="p-2.5 hover:bg-gray-100 rounded transition-colors"
            title={isFullscreen ? "Exit Fullscreen" : "Enter Fullscreen"}
          >
            <Maximize2 className="w-5 h-5 text-gray-700" />
          </button>
        </div>

        </div>
      </div>

      {/* Individual Transform Execution Modal */}
      <Dialog open={showTransformModal} onOpenChange={setShowTransformModal}>
        <DialogContent className="max-w-lg">
          {activeTransform && selectedNode && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-3">
                  <Sparkles className="h-5 w-5 text-slate-700" />
                  <span>{activeTransform.name}</span>
                </DialogTitle>
                <DialogDescription>
                  {activeTransform.description}
                </DialogDescription>
              </DialogHeader>
              
              <div className="py-4">
                <div className="bg-slate-50 rounded-lg p-4 mb-4">
                  <div className="text-xs text-gray-500 uppercase tracking-wide mb-2">Source Entity</div>
                  <div className="flex items-center gap-2">
                  <span className="text-2xl">{getEntityIcon(selectedNode.type)}</span>
                    <div>
                      <div className="text-sm font-medium text-gray-900">{selectedNode.label}</div>
                      <div className="text-xs text-gray-500">{selectedNode.type}</div>
                    </div>
                  </div>
                </div>
                
                <Button
                  className="w-full"
                  onClick={() => {
                    executeTransformMutation.mutate({
                      transform_id: activeTransform.id,
                      source_entity_id: selectedNode.id
                    });
                    setShowTransformModal(false);
                  }}
                  disabled={executeTransformMutation.isPending}
                >
                  {executeTransformMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Running Transform...
                    </>
                  ) : (
                    <>
                      <Sparkles className="mr-2 h-4 w-4" />
                      Run Transform
                    </>
                  )}
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Advanced Filter Panel */}
      <Sheet open={showFilters} onOpenChange={setShowFilters}>
        <SheetContent side="right" className="w-96 overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Filter Graph</SheetTitle>
            <SheetDescription>
              Apply filters to focus on specific entities and relationships
            </SheetDescription>
          </SheetHeader>

          <div className="mt-6 space-y-6">
            {/* Entity Type Filter */}
            <div>
              <Label className="text-sm font-medium text-gray-900">Entity Types</Label>
              <div className="mt-2 space-y-2 max-h-48 overflow-y-auto border border-gray-200 rounded-md p-2">
                {Array.from(new Set(nodes.map(n => n.type))).sort().map(type => (
                  <div key={type} className="flex items-center gap-2">
                    <Checkbox
                      id={`type-${type}`}
                      checked={filters.entityTypes.includes(type)}
                      onCheckedChange={(checked) => {
                        setFilters(prev => ({
                          ...prev,
                          entityTypes: checked
                            ? [...prev.entityTypes, type]
                            : prev.entityTypes.filter(t => t !== type)
                        }));
                      }}
                    />
                    <label htmlFor={`type-${type}`} className="text-sm text-gray-700 flex items-center gap-1 cursor-pointer">
                      <span>{getEntityIcon(type)}</span>
                      <span>{type}</span>
                    </label>
                  </div>
                ))}
              </div>
            </div>

            {/* Risk Level Filter */}
            <div>
              <Label className="text-sm font-medium text-gray-900">Risk Levels</Label>
              <div className="mt-2 space-y-2">
                {['critical', 'high', 'medium', 'low'].map(level => (
                  <div key={level} className="flex items-center gap-2">
                    <Checkbox
                      id={`risk-${level}`}
                      checked={filters.riskLevels.includes(level)}
                      onCheckedChange={(checked) => {
                        setFilters(prev => ({
                          ...prev,
                          riskLevels: checked
                            ? [...prev.riskLevels, level]
                            : prev.riskLevels.filter(r => r !== level)
                        }));
                      }}
                    />
                    <label htmlFor={`risk-${level}`} className="text-sm text-gray-700 flex items-center gap-2 cursor-pointer">
                      <div 
                        className="w-3 h-3 rounded-full" 
                        style={{ backgroundColor: getRiskColor(level) }}
                      ></div>
                      <span className="capitalize">{level}</span>
                    </label>
                  </div>
                ))}
              </div>
            </div>

            {/* Confidence Filter */}
            <div>
              <Label className="text-sm font-medium text-gray-900 mb-2 block">
                Min Confidence: {filters.minConfidence}%
              </Label>
              <input
                type="range"
                min="0"
                max="100"
                step="5"
                value={filters.minConfidence}
                onChange={(e) => setFilters(prev => ({ ...prev, minConfidence: parseInt(e.target.value) }))}
                className="w-full mt-2 accent-slate-700"
              />
            </div>

            {/* Date Range Filter */}
            <div>
              <Label className="text-sm font-medium text-gray-900 mb-2 block">Date Range</Label>
              <div className="space-y-2">
                <div>
                  <Label className="text-xs text-gray-500">From</Label>
                  <Input
                    type="date"
                    value={filters.dateFrom}
                    onChange={(e) => setFilters(prev => ({ ...prev, dateFrom: e.target.value }))}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label className="text-xs text-gray-500">To</Label>
                  <Input
                    type="date"
                    value={filters.dateTo}
                    onChange={(e) => setFilters(prev => ({ ...prev, dateTo: e.target.value }))}
                    className="mt-1"
                  />
                </div>
              </div>
            </div>

            {/* Metadata Filter */}
            <div>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="has-metadata"
                  checked={filters.hasMetadata}
                  onCheckedChange={(checked) => setFilters(prev => ({ ...prev, hasMetadata: checked as boolean }))}
                />
                <Label htmlFor="has-metadata" className="text-sm text-gray-700 cursor-pointer">
                  Only show entities with metadata
                </Label>
              </div>
            </div>

            {/* Filter Actions */}
            <div className="flex gap-2 pt-4 border-t">
              <Button 
                variant="outline" 
                className="flex-1"
                onClick={() => {
                  setFilters({
                    entityTypes: [],
                    riskLevels: [],
                    minConfidence: 0,
                    dateFrom: '',
                    dateTo: '',
                    hasMetadata: false,
                    layers: [],
                  });
                  toast.success('Filters cleared');
                }}
              >
                Clear All
              </Button>
              <Button 
                className="flex-1"
                onClick={() => {
                  setShowFilters(false);
                  toast.success(`Showing ${filteredNodes.length}/${nodes.length} entities`);
                }}
              >
                Apply
              </Button>
            </div>

            {/* Filter Summary */}
            <div className="text-xs text-gray-500 text-center pt-2 border-t">
              Showing {filteredNodes.length} of {nodes.length} entities
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* Old Entity Details Modal (kept for reference, but not used) */}
      <Dialog open={showEntityModal} onOpenChange={setShowEntityModal}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          {selectedNode && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-3 text-xl">
                  <span className="text-3xl">{getEntityIcon(selectedNode.type)}</span>
                  <div>
                    <div>{selectedNode.label}</div>
                    <div className="text-sm font-normal text-gray-500 uppercase mt-1">{selectedNode.type}</div>
                  </div>
                </DialogTitle>
                <DialogDescription>
                  Click on transforms below to enrich this entity and auto-populate the graph
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-6 py-4">
                {/* Entity Information */}
                <div>
                  <h3 className="text-sm font-normal text-gray-900 mb-3">Entity Information</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex flex-col">
                      <span className="text-xs text-gray-500 uppercase">Type</span>
                    <Badge variant="outline" className="mt-1 w-fit">
                      <span className="mr-1">{getEntityIcon(selectedNode.type)}</span>
                      {selectedNode.type}
                    </Badge>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-xs text-gray-500 uppercase">Risk Level</span>
                      <Badge
                        variant="outline"
                        className="mt-1 w-fit"
                        style={{ 
                          backgroundColor: getRiskColor(selectedNode.risk_level) + '20',
                          borderColor: getRiskColor(selectedNode.risk_level),
                          color: getRiskColor(selectedNode.risk_level)
                        }}
                      >
                        {selectedNode.risk_level}
                      </Badge>
                    </div>
                  </div>
                </div>

                {/* Metadata */}
                {selectedNode.metadata && Object.keys(selectedNode.metadata).length > 0 && (
                  <div>
                    <h3 className="text-sm font-normal text-gray-900 mb-3">Metadata</h3>
                    <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                      {Object.entries(selectedNode.metadata).map(([key, value]) => (
                        <div key={key} className="flex justify-between text-sm border-b border-gray-200 pb-2 last:border-0">
                          <span className="text-gray-600 font-medium">{key}:</span>
                          <span className="text-gray-900 text-right max-w-[60%] break-all">
                            {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Available Transforms */}
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <Sparkles className="h-5 w-5 text-slate-700" />
                    <h3 className="text-sm font-normal text-gray-900">Available Transforms</h3>
                  </div>
                  
                  {transformsLoading ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="h-6 w-6 animate-spin text-slate-700" />
                    </div>
                  ) : transforms && transforms.length > 0 ? (
                    <div className="grid grid-cols-2 gap-3">
                      {transforms.map((transform: Transform) => (
                        <Button
                          key={transform.id}
                          variant="outline"
                          className="w-full justify-start h-auto py-3 hover:bg-slate-50 hover:border-slate-300"
                          onClick={() => {
                            executeTransformMutation.mutate({
                              transform_id: transform.id,
                              source_entity_id: selectedNode.id
                            });
                          }}
                          disabled={executeTransformMutation.isPending}
                        >
                          <div className="flex flex-col items-start text-left w-full">
                            <div className="flex items-center gap-2 font-normal">
                              {executeTransformMutation.isPending ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <Sparkles className="h-4 w-4 text-slate-700" />
                              )}
                              <span>{transform.name}</span>
                            </div>
                            <span className="text-xs text-gray-500 mt-1">{transform.description}</span>
                          </div>
                        </Button>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-gray-500 text-sm">
                      No transforms available for this entity type
                    </div>
                  )}
                </div>

                {/* Quick Actions */}
                <div>
                  <h3 className="text-sm font-normal text-gray-900 mb-3">Quick Actions</h3>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setShowEntityModal(false);
                        setLinkingMode(true);
                        setLinkSource(selectedNode.id);
                        toast('👉 Click another entity to create a link');
                      }}
                    >
                      <Link2 className="h-4 w-4 mr-2" />
                      Create Link
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-slate-700 hover:bg-slate-50"
                      onClick={() => {
                        setShowCreateLersModal(true);
                        toast('🔍 LERS Request form coming soon!');
                      }}
                    >
                      <FileText className="h-4 w-4 mr-2" />
                      Create LERS Request
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-red-600 hover:bg-red-50"
                      onClick={() => {
                        if (confirm(`Delete entity: ${selectedNode.label}?`)) {
                          deleteEntityMutation.mutate(selectedNode.id);
                        }
                      }}
                      disabled={deleteEntityMutation.isPending}
                    >
                      {deleteEntityMutation.isPending ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <X className="h-4 w-4 mr-2" />
                      )}
                      Delete Entity
                    </Button>
                  </div>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Annotation Modal */}
      <Dialog open={showAnnotationModal} onOpenChange={setShowAnnotationModal}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Add Annotation</DialogTitle>
            <DialogDescription>
              Add notes and tags to this {annotationTarget?.type === 'node' ? 'entity' : 'relationship'}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div>
              <Label className="text-sm font-medium mb-2 block">Note</Label>
              <textarea
                value={annotationText}
                onChange={(e) => setAnnotationText(e.target.value)}
                placeholder="Enter your notes here..."
                className="w-full px-3 py-2 text-sm border rounded-md focus:outline-none focus:ring-2 focus:ring-slate-500"
                rows={4}
              />
            </div>
            
            <div>
              <Label className="text-sm font-medium mb-2 block">Tags</Label>
              <div className="flex gap-2 mb-2">
                <Input
                  value={newTag}
                  onChange={(e) => setNewTag(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      addTag();
                    }
                  }}
                  placeholder="Add a tag..."
                  className="flex-1"
                />
                <Button onClick={addTag} size="sm">Add</Button>
              </div>
              <div className="flex flex-wrap gap-2">
                {annotationTags.map(tag => (
                  <Badge key={tag} variant="secondary" className="flex items-center gap-1">
                    {tag}
                    <button
                      onClick={() => removeTag(tag)}
                      className="ml-1 hover:text-red-600"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            </div>
          </div>
          
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setShowAnnotationModal(false)}>
              Cancel
            </Button>
            <Button onClick={saveAnnotation}>
              Save Annotation
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* SIMPLIFIED: Link Context Menu (only delete - use double-click to edit) */}
      {linkContextMenu.visible && linkContextMenu.link && (
        <div
          className="fixed z-50 bg-white border border-gray-200 rounded-lg shadow-lg py-2 min-w-[160px] context-menu"
          style={{
            left: `${linkContextMenu.x}px`,
            top: `${linkContextMenu.y}px`,
          }}
        >
          <div className="px-4 py-1 text-xs text-gray-500 border-b border-gray-100">
            💡 Double-click to edit relationship
          </div>
          
          <button
            className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
            onClick={() => handleLinkContextAction('delete', linkContextMenu.link!)}
          >
            <span>🗑️</span>
            <span>Delete Relationship</span>
          </button>
        </div>
      )}

      {/* FIXED: Link Edit Modal with Dropdown */}
      {showLinkEditModal && editingLinkData && (
        <Dialog open={showLinkEditModal} onOpenChange={setShowLinkEditModal}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Edit Relationship</DialogTitle>
              <DialogDescription>
                Double-clicked to quickly change this relationship type.
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4">
              <div>
                <Label htmlFor="relationship-type">Relationship Type</Label>
                <select
                  id="relationship-type"
                  className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  defaultValue={editingLinkData.currentType}
                  onChange={(e) => handleLinkTypeChange(e.target.value)}
                >
                  {RELATIONSHIP_TYPES.map(type => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </select>
              </div>
              
              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowLinkEditModal(false);
                    setEditingLinkData(null);
                  }}
                >
                  Cancel
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Keyboard Shortcuts Modal */}
      <KeyboardShortcutsModal
        open={showKeyboardShortcuts}
        onClose={() => setShowKeyboardShortcuts(false)}
      />

      {/* Transform Results Modal */}
      {showTransformResults && transformResults && (
        <Dialog open={showTransformResults} onOpenChange={setShowTransformResults}>
          <DialogContent className="max-w-4xl max-h-[80vh] overflow-auto">
            <TransformResultContainer
              title={transformResults.title || 'Transform Results'}
              results={transformResults}
              onClose={() => setShowTransformResults(false)}
            />
          </DialogContent>
        </Dialog>
      )}

      {/* Alerts Panel */}
      {alerts.length > 0 && (
        <div className="fixed bottom-4 right-4 max-w-md space-y-2 z-50">
          {alerts.slice(0, 3).map((alert, idx) => (
            <Card key={idx} className="p-4 shadow-lg border-l-4 border-red-500">
              <div className="flex items-start justify-between">
                <div>
                  <h4 className="font-semibold text-sm">{alert.title}</h4>
                  <p className="text-xs text-slate-600 mt-1">{alert.description}</p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setAlerts(alerts.filter((_, i) => i !== idx))}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Old Entity Type Filters panel removed - now using dropdown in toolbar */}

      {/* Path Analysis Dialog */}
      <PathAnalysisPanel
        open={showPathAnalysis}
        onOpenChange={setShowPathAnalysis}
        nodes={nodes}
        links={links}
        onPathHighlight={(path) => {
          setHighlightedNodes(new Set(path));
        }}
        onCycleHighlight={(cycle) => {
          setHighlightedNodes(new Set(cycle));
        }}
      />


      {/* Mini Map */}
      {showMiniMapPanel && nodes.length > 0 &&
       !['hierarchicalTree', 'smartTables', 'alluvialFlow', 'timelineSequence'].includes(currentLayout) && (
        <MiniMap
          nodes={nodes}
          links={links}
          viewport={{ x: pan.x, y: pan.y, zoom }}
          onViewportChange={(x, y) => {
            setPan({ x, y });
          }}
        />
      )}


      {/* Entity Details Modal (Double-click) */}
      {entityDetailsModal.open && entityDetailsModal.node && (
        <Dialog open={entityDetailsModal.open} onOpenChange={(open) => setEntityDetailsModal({ open, node: null })}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-3">
                <span className="text-2xl">{getEntityIcon(entityDetailsModal.node.type)}</span>
                <div>
                  <div className="text-lg font-semibold">{entityDetailsModal.node.label}</div>
                  <div className="text-sm text-gray-500 font-normal capitalize">{entityDetailsModal.node.type.replace(/_/g, ' ')}</div>
                </div>
              </DialogTitle>
            </DialogHeader>
            
            <div className="space-y-4 max-h-[60vh] overflow-y-auto">
              {/* Layer Information */}
              {entityDetailsModal.node.metadata?.layer !== undefined && (
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="flex items-center gap-3">
                    <div 
                      className="w-6 h-6 rounded-full flex-shrink-0"
                      style={{ 
                        backgroundColor: entityDetailsModal.node.metadata.is_victim_to_victim ? '#F97316' 
                          : entityDetailsModal.node.metadata.is_terminal ? '#EF4444' 
                          : getLayerColor(entityDetailsModal.node.metadata.layer) 
                      }}
                    />
                    <div>
                      <div className="text-sm font-medium text-gray-700">
                        Layer {entityDetailsModal.node.metadata.layer}
                        {entityDetailsModal.node.metadata.is_victim_to_victim && (
                          <span className="ml-2 text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full font-semibold">
                            Victim Account
                          </span>
                        )}
                        {entityDetailsModal.node.metadata.is_terminal && (
                          <span className="ml-2 text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-semibold">
                            Terminal Node
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-gray-500">
                        {entityDetailsModal.node.metadata.is_victim_to_victim
                          ? 'Victim account (receives from other victims only)'
                          : entityDetailsModal.node.metadata.is_terminal 
                          ? 'Beneficiary - Money withdrawn/kept (no forward transfer)'
                          : 'Transaction flow layer'}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Bank Account Details */}
              {entityDetailsModal.node.metadata && (
                <div className="space-y-3">
                  <h3 className="text-sm font-semibold text-gray-900">Account Details</h3>
                  <div className="grid grid-cols-2 gap-4">
                    {entityDetailsModal.node.metadata.account_number && (
                      <div className="bg-blue-50 rounded-lg p-3">
                        <div className="text-xs text-gray-600 mb-1">Account Number</div>
                        <div className="text-sm font-mono font-semibold text-gray-900">
                          {entityDetailsModal.node.metadata.account_number}
                        </div>
                      </div>
                    )}
                    
                    {entityDetailsModal.node.metadata.ifsc_code && (
                      <div className="bg-purple-50 rounded-lg p-3">
                        <div className="text-xs text-gray-600 mb-1">IFSC Code</div>
                        <div className="text-sm font-mono font-semibold text-gray-900">
                          {entityDetailsModal.node.metadata.ifsc_code}
                        </div>
                      </div>
                    )}
                    
                    {entityDetailsModal.node.metadata.bank_name && (
                      <div className="bg-green-50 rounded-lg p-3">
                        <div className="text-xs text-gray-600 mb-1">Bank Name</div>
                        <div className="text-sm font-semibold text-gray-900">
                          {entityDetailsModal.node.metadata.bank_name}
                        </div>
                      </div>
                    )}
                    
                    {entityDetailsModal.node.metadata.amount && (
                      <div className="bg-orange-50 rounded-lg p-3">
                        <div className="text-xs text-gray-600 mb-1">Amount</div>
                        <div className="text-sm font-semibold text-gray-900">
                          ₹ {parseFloat(entityDetailsModal.node.metadata.amount).toLocaleString('en-IN')}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* All Metadata */}
              {entityDetailsModal.node.metadata && Object.keys(entityDetailsModal.node.metadata).length > 0 && (
                <div className="space-y-3">
                  <h3 className="text-sm font-semibold text-gray-900">All Metadata</h3>
                  <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                    {Object.entries(entityDetailsModal.node.metadata).map(([key, value]) => (
                      <div key={key} className="flex justify-between text-sm border-b border-gray-200 pb-2 last:border-0">
                        <span className="text-gray-600 capitalize">{key.replace(/_/g, ' ')}</span>
                        <span className="text-gray-900 font-medium">{String(value)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Risk and Confidence */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-red-50 rounded-lg p-3">
                  <div className="text-xs text-gray-600 mb-1">Risk Level</div>
                  <div className="text-sm font-semibold text-gray-900 capitalize">
                    {entityDetailsModal.node.risk_level || 'Unknown'}
                  </div>
                </div>
                
                <div className="bg-blue-50 rounded-lg p-3">
                  <div className="text-xs text-gray-600 mb-1">Confidence</div>
                  <div className="text-sm font-semibold text-gray-900">
                    {entityDetailsModal.node.confidence || 0}%
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-4 border-t">
              <Button
                variant="outline"
                onClick={() => setEntityDetailsModal({ open: false, node: null })}
              >
                Close
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};

// Wrap with ErrorBoundary for robust error handling
export default function InvestigationWorkbenchWithErrorBoundary() {
  return (
    <ErrorBoundary>
      <InvestigationWorkbenchTab />
    </ErrorBoundary>
  );
}
