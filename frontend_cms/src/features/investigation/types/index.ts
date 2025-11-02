/**
 * ============================================================================
 * INVESTIGATION WORKBENCH - TYPE DEFINITIONS
 * ============================================================================
 * Central type definitions for the entire investigation system
 */

import { Entity, Transform } from '@/services/investigationService';

// ============================================================================
// CORE GRAPH TYPES
// ============================================================================

export interface Node {
  id: string;
  x: number;
  y: number;
  label: string;
  type: string;
  metadata: any;
  risk_level: string;
  entity: Entity;
  layer?: number;        // Layer in graph hierarchy
  community?: number;    // Community/cluster ID
}

export interface Link {
  id: string;
  source: string;
  target: string;
  label: string;
  type: string;
  amount?: number;       // Transaction amount
  date?: string;         // Transaction/interaction date
  metadata?: any;        // Additional data
  confidence?: number;   // Link confidence score
}

// ============================================================================
// UI STATE TYPES
// ============================================================================

export interface ContextMenu {
  visible: boolean;
  x: number;
  y: number;
  node: Node | null;
  isCanvas: boolean;
}

export interface LinkContextMenu {
  visible: boolean;
  x: number;
  y: number;
  link: Link | null;
}

export interface Viewport {
  x: number;
  y: number;
  zoom: number;
}

// ============================================================================
// LAYER SYSTEM TYPES
// ============================================================================

export interface LayerConfig {
  id: number;
  name: string;
  visible: boolean;
  opacity: number;
  color?: string;
}

export type LayerPreset = 'focus' | 'medium' | 'full' | 'custom';

// ============================================================================
// PATH ANALYSIS TYPES
// ============================================================================

export interface PathResult {
  nodes: string[];
  links: string[];
  length: number;
  totalAmount?: number;
  riskScore?: number;
}

export interface CycleResult {
  nodes: string[];
  length: number;
  totalAmount?: number;
}

// ============================================================================
// FILTER TYPES
// ============================================================================

export interface GraphFilters {
  entityTypes: string[];
  riskLevels: string[];
  minConfidence: number;
  dateFrom: string;
  dateTo: string;
  hasMetadata: boolean;
  amountRange: [number, number];
  layers: number[];
}

// ============================================================================
// STATISTICS TYPES
// ============================================================================

export interface GraphStatistics {
  entityCount: number;
  relationshipCount: number;
  totalMoney: number;
  avgPathLength: number;
  density: number;
  components: number;
  largestComponent: number;
  isolatedEntities: number;
  dateRange: {
    start: Date | null;
    end: Date | null;
    days: number;
  };
}

// ============================================================================
// VISUALIZATION TYPES
// ============================================================================

export type ColorMode = 'category' | 'risk' | 'amount' | 'recency' | 'confidence' | 'status';

export type LayoutType =
  | 'force'
  | 'hierarchical'
  | 'tree'
  | 'circular'
  | 'grid'
  | 'chakra'
  | 'horizontal'
  | 'block'
  | 'centrality'
  | 'orthogonal'
  | 'radial'
  | 'sankey'
  | 'timeline'
  | 'bankCluster';

// ============================================================================
// TRANSFORM TYPES
// ============================================================================

export interface TransformResult {
  id: string;
  transform_name: string;
  executed_at: string;
  duration_ms: number;
  summary: {
    total_entities: number;
    total_relationships: number;
    total_amount?: number;
    key_findings: string[];
  };
  entities_created: Entity[];
  relationships_created: any[];
  analysis: {
    mule_accounts?: string[];
    cycles_detected?: string[][];
    high_risk_paths?: PathResult[];
    patterns?: string[];
  };
}

// ============================================================================
// HISTORY TYPES (Undo/Redo)
// ============================================================================

export interface HistoryAction {
  type: 'ADD_NODE' | 'DELETE_NODE' | 'MOVE_NODE' | 'ADD_LINK' | 'DELETE_LINK' | 'EDIT_LINK';
  data: any;
  timestamp: number;
}

// ============================================================================
// ENTITY TYPES DEFINITION
// ============================================================================

export interface EntityTypeDefinition {
  id: string;
  name: string;
  icon: string;
  category: string;
  description?: string;
  color?: string;
}

// ============================================================================
// RELATIONSHIP TYPES
// ============================================================================

export interface RelationshipType {
  value: string;
  label: string;
  category?: string;
  icon?: string;
  color?: string;
}

// ============================================================================
// MODULE TYPES (for data source modules)
// ============================================================================

export interface DataSourceModule {
  id: string;
  name: string;
  icon: string;
  description: string;
  entityTypes: string[];
  transforms: Transform[];
  parsers: string[];
  enabled: boolean;
}

// ============================================================================
// EXPORT ALL
// ============================================================================

export type {
  Entity,
  Transform,
};

