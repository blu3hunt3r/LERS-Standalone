/**
 * ============================================================================
 * useGraphData - Custom hook for graph data management
 * ============================================================================
 * Centralizes graph state, API calls, and data transformations
 */

import { useState, useEffect, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { investigationService } from '@/services/investigationService';
import { Node, Link, GraphFilters } from '../types';
import { calculateLayers, calculateGraphStatistics } from '../utils/graphAlgorithms';
import toast from 'react-hot-toast';

export const useGraphData = (caseId: string | undefined) => {
  const queryClient = useQueryClient();
  const [nodes, setNodes] = useState<Node[]>([]);
  const [links, setLinks] = useState<Link[]>([]);
  const [layers, setLayers] = useState<Map<string, number>>(new Map());
  const [victimNodeId, setVictimNodeId] = useState<string | null>(null);

  console.log('🔍 useGraphData called with caseId:', caseId);

  // Fetch graph data from API
  const { data: graphData, isLoading, error } = useQuery({
    queryKey: ['investigation-graph', caseId],
    queryFn: () => {
      console.log('📡 Fetching graph data for case:', caseId);
      return investigationService.getGraph(caseId!);
    },
    enabled: !!caseId,
    refetchOnWindowFocus: false,
  });

  console.log('📊 Graph data:', graphData);
  console.log('⏳ Loading:', isLoading);
  console.log('❌ Error:', error);

  // Transform API data to graph nodes and links
  useEffect(() => {
    console.log('🔄 useEffect triggered, graphData:', graphData);
    
    if (graphData?.entities) {
      console.log(`✅ Processing ${graphData.entities.length} entities and ${graphData.relationships.length} relationships`);
      
      // Apply initial layout if positions are not set (all at 0,0)
      const hasValidPositions = graphData.entities.some(e => 
        (e.position_x !== 0 && e.position_x !== null) || 
        (e.position_y !== 0 && e.position_y !== null)
      );
      
      const newNodes: Node[] = graphData.entities.map((entity, index) => {
        let x = entity.position_x || 0;
        let y = entity.position_y || 0;
        
        // If no valid positions exist, apply TOP-DOWN tree layout
        if (!hasValidPositions) {
          const layer = entity.metadata?.layer || 0;
          const nodesInLayer = graphData.entities.filter(e => 
            (e.metadata?.layer || 0) === layer
          ).length;
          const indexInLayer = graphData.entities.filter((e, i) => 
            i <= index && (e.metadata?.layer || 0) === layer
          ).length - 1;
          
          // TOP-DOWN TREE LAYOUT:
          // - Victim (Layer 1) at TOP (y = 0)
          // - Each subsequent layer goes DOWN (increasing y)
          // - Horizontal spread for nodes in same layer
          y = layer * 400; // 400px between layers (vertical - downward) - INCREASED for better visibility
          x = (indexInLayer - nodesInLayer / 2) * 200; // 200px between nodes in same layer (horizontal spread) - INCREASED
        }
        
        return {
          id: entity.id,
          x,
          y,
          label: entity.value,
          type: entity.entity_type,
          metadata: entity.metadata,
          risk_level: entity.risk_level,
          entity: entity,
        };
      });

      const newLinks: Link[] = graphData.relationships.map((rel) => ({
        id: rel.id,
        source: rel.source,
        target: rel.target,
        label: rel.relationship_type_display,
        type: rel.relationship_type,
        amount: rel.metadata?.amount,
        date: rel.metadata?.date,
        metadata: rel.metadata,
      }));

      console.log(`📊 Created ${newNodes.length} nodes and ${newLinks.length} links`);

      // Build layer map directly from metadata (Excel/PDF parsers populate this)
      const metadataLayerMap = new Map<string, number>();
      newNodes.forEach(node => {
        const metadataLayer = node.metadata?.layer;
        if (metadataLayer !== undefined && metadataLayer !== null && !Number.isNaN(metadataLayer)) {
          metadataLayerMap.set(node.id, Number(metadataLayer));
        }
      });

      if (metadataLayerMap.size > 0) {
        setLayers(metadataLayerMap);
        setNodes(newNodes.map(node => {
          const assignedLayer = metadataLayerMap.get(node.id);
          return {
            ...node,
            layer: assignedLayer,
            metadata: {
              ...node.metadata,
              layer: assignedLayer ?? node.metadata?.layer,
            },
          };
        }));
      } else {
        // Fallback to raw nodes (BFS layering will run later)
        setNodes(newNodes);
      }

      setLinks(newLinks);

      // Auto-detect victim node (person type with most connections) - used for BFS fallback
      const personNodes = newNodes.filter(n => n.type === 'person');
      if (personNodes.length > 0 && !victimNodeId) {
        const connectionCounts = personNodes.map(node => ({
          id: node.id,
          count: newLinks.filter(l => l.source === node.id || l.target === node.id).length,
        }));
        const mostConnected = connectionCounts.sort((a, b) => b.count - a.count)[0];
        setVictimNodeId(mostConnected.id);
      }
    }
  }, [graphData]);

  // Fallback: calculate layers via BFS only when metadata layers are unavailable
  useEffect(() => {
    if (layers.size === 0 && victimNodeId && nodes.length > 0) {
      const layerMap = calculateLayers(nodes, links, victimNodeId);
      setLayers(layerMap);

      setNodes(prev => prev.map(node => {
        const computedLayer = layerMap.get(node.id) || 0;
        return {
          ...node,
          layer: computedLayer,
          metadata: {
            ...node.metadata,
            layer: node.metadata?.layer ?? computedLayer,
          },
        };
      }));
    }
  }, [victimNodeId, nodes.length, links.length, layers.size]);

  // Calculate graph statistics
  const statistics = useMemo(() => {
    return calculateGraphStatistics(nodes, links);
  }, [nodes, links]);

  // Filter nodes based on criteria
  const getFilteredNodes = (filters: GraphFilters): Node[] => {
    return nodes.filter(node => {
      // Entity type filter
      if (filters.entityTypes.length > 0 && !filters.entityTypes.includes(node.type)) {
        return false;
      }

      // Risk level filter
      if (filters.riskLevels.length > 0 && !filters.riskLevels.includes(node.risk_level || 'low')) {
        return false;
      }

      // Confidence filter
      if (node.entity && node.entity.confidence < filters.minConfidence) {
        return false;
      }

      // Date range filter
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

      // Has metadata filter
      if (filters.hasMetadata && (!node.metadata || Object.keys(node.metadata).length === 0)) {
        return false;
      }

      // Layer filter
      if (filters.layers.length > 0 && node.layer !== undefined && !filters.layers.includes(node.layer)) {
        return false;
      }

      return true;
    });
  };

  // Filter links to only show connections between visible nodes
  const getFilteredLinks = (visibleNodes: Node[]): Link[] => {
    const visibleNodeIds = new Set(visibleNodes.map(n => n.id));
    return links.filter(link =>
      visibleNodeIds.has(link.source) && visibleNodeIds.has(link.target)
    );
  };

  // CRUD Mutations
  const createEntityMutation = useMutation({
    mutationFn: (data: any) => investigationService.createEntity(caseId!, data),
    onSuccess: () => {
      toast.success('✅ Entity created');
      queryClient.invalidateQueries({ queryKey: ['investigation-graph', caseId] });
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to create entity');
    },
  });

  const deleteEntityMutation = useMutation({
    mutationFn: (entityId: string) => investigationService.deleteEntity(caseId!, entityId),
    onMutate: async (entityId) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['investigation-graph', caseId] });
      
      // Snapshot previous value
      const previousData = queryClient.getQueryData(['investigation-graph', caseId]);
      
      // Optimistically remove the entity and its relationships
      queryClient.setQueryData(['investigation-graph', caseId], (old: any) => {
        if (!old) return old;
        return {
          ...old,
          entities: old.entities?.filter((entity: any) => entity.id !== entityId) || [],
          relationships: old.relationships?.filter((rel: any) => 
            rel.source !== entityId && rel.target !== entityId
          ) || []
        };
      });
      
      return { previousData };
    },
    onSuccess: () => {
      toast.success('✅ Entity deleted');
      // Do NOT invalidate queries - rely purely on optimistic update
      // The backend has deleted it, and our cache is now the source of truth
    },
    onError: (error: any, entityId, context: any) => {
      // Rollback on error
      if (context?.previousData) {
        queryClient.setQueryData(['investigation-graph', caseId], context.previousData);
      }
      toast.error(error.response?.data?.error || 'Failed to delete entity');
    },
  });

  const updateEntityPositionMutation = useMutation({
    mutationFn: (data: { entity_id: string; position_x: number; position_y: number }) =>
      investigationService.updateEntityPosition(caseId!, data),
    onMutate: async (data) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['investigation-graph', caseId] });
      
      // Snapshot previous value
      const previousData = queryClient.getQueryData(['investigation-graph', caseId]);
      
      // Optimistically update the position
      queryClient.setQueryData(['investigation-graph', caseId], (old: any) => {
        if (!old) return old;
        return {
          ...old,
          entities: old.entities?.map((entity: any) =>
            entity.id === data.entity_id
              ? { ...entity, position_x: data.position_x, position_y: data.position_y }
              : entity
          ) || []
        };
      });
      
      return { previousData };
    },
    onError: (error: any, data, context: any) => {
      // Rollback on error
      if (context?.previousData) {
        queryClient.setQueryData(['investigation-graph', caseId], context.previousData);
      }
      toast.error(error.response?.data?.error || 'Failed to update entity position');
    },
    onSettled: () => {
      // Optionally refetch after a delay to ensure consistency
      // This is debounced in practice due to React Query's behavior
    },
  });

  const updateEntityLabelMutation = useMutation({
    mutationFn: (data: { entity_id: string; value: string }) =>
      investigationService.updateEntityLabel(caseId!, data),
    onSuccess: () => {
      toast.success('✅ Entity label updated');
      queryClient.invalidateQueries({ queryKey: ['investigation-graph', caseId] });
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to update entity label');
    },
  });

  const createRelationshipMutation = useMutation({
    mutationFn: (data: { source_entity_id: string; target_entity_id: string; relationship_type: string }) =>
      investigationService.createRelationship(caseId!, data),
    onSuccess: () => {
      toast.success('✅ Relationship created');
      queryClient.invalidateQueries({ queryKey: ['investigation-graph', caseId] });
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to create relationship');
    },
  });

  const updateRelationshipMutation = useMutation({
    mutationFn: (data: { relationship_id: string; relationship_type: string }) =>
      investigationService.updateRelationship(caseId!, data),
    onSuccess: () => {
      toast.success('✅ Relationship updated');
      queryClient.invalidateQueries({ queryKey: ['investigation-graph', caseId] });
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to update relationship');
    },
  });

  const deleteRelationshipMutation = useMutation({
    mutationFn: (relationshipId: string) =>
      investigationService.deleteRelationship(caseId!, relationshipId),
    onMutate: async (relationshipId) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['investigation-graph', caseId] });
      
      // Snapshot previous value
      const previousData = queryClient.getQueryData(['investigation-graph', caseId]);
      
      // Optimistically update - remove the link immediately
      queryClient.setQueryData(['investigation-graph', caseId], (old: any) => {
        if (!old) return old;
        return {
          ...old,
          relationships: old.relationships?.filter((rel: any) => rel.id !== relationshipId) || []
        };
      });
      
      return { previousData };
    },
    onSuccess: () => {
      toast.success('✅ Relationship deleted');
      // Do NOT invalidate queries - rely purely on optimistic update
      // The backend has deleted it, and our cache is now the source of truth
      // Next time the component mounts or data is fetched, it will be correct
    },
    onError: (error: any, relationshipId, context: any) => {
      // Rollback on error
      if (context?.previousData) {
        queryClient.setQueryData(['investigation-graph', caseId], context.previousData);
      }
      toast.error(error.response?.data?.error || 'Failed to delete relationship');
    },
  });

  return {
    // Data
    nodes,
    links,
    layers,
    statistics,
    victimNodeId,
    isLoading,
    error,

    // Setters
    setNodes,
    setLinks,
    setVictimNodeId,

    // Filters
    getFilteredNodes,
    getFilteredLinks,

    // Mutations
    createEntity: createEntityMutation.mutate,
    deleteEntity: deleteEntityMutation.mutate,
    updateEntityPosition: updateEntityPositionMutation.mutate,
    updateEntityLabel: updateEntityLabelMutation.mutate,
    createRelationship: createRelationshipMutation.mutate,
    updateRelationship: updateRelationshipMutation.mutate,
    deleteRelationship: deleteRelationshipMutation.mutate,

    // Mutation states
    isCreatingEntity: createEntityMutation.isPending,
    isDeletingEntity: deleteEntityMutation.isPending,
    isUpdatingPosition: updateEntityPositionMutation.isPending,
    isUpdatingLabel: updateEntityLabelMutation.isPending,
  };
};

