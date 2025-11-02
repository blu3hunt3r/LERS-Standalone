import apiClient from './api';

export interface Entity {
  id: string;
  case: string;
  entity_type: string;
  entity_type_display: string;
  value: string;
  normalized_value: string;
  metadata: Record<string, any>;
  confidence: number;
  risk_score: number;
  risk_level: string;
  risk_level_display: string;
  position_x?: number;
  position_y?: number;
  is_pinned: boolean;
  is_primary_subject: boolean;
  is_verified: boolean;
  is_flagged: boolean;
  flag_reason?: string;
  source: string;
  extracted_from?: string;
  transform_used?: string;
  created_at: string;
  updated_at: string;
}

export interface EntityRelationship {
  id: string;
  case: string;
  source: string;
  target: string;
  relationship_type: string;
  relationship_type_display: string;
  metadata: Record<string, any>;
  confidence: number;
  weight: number;
  first_observed?: string;
  last_observed?: string;
  observation_count: number;
  source_data?: string;
  transform_used?: string;
  created_at: string;
  updated_at: string;
}

export interface InvestigationGraph {
  entities: Entity[];
  relationships: EntityRelationship[];
  graph: {
    id: string;
    case: string;
    graph_data: Record<string, any>;
    layout_type: string;
    layout_settings: Record<string, any>;
    node_count: number;
    edge_count: number;
    version: number;
    created_at: string;
    updated_at: string;
  };
}

export interface Transform {
  id: string;
  name: string;
  description: string;
  category: string;
  auto_run: boolean;
  input_types: string[];
  output_types: string[];
}

export interface TransformResult {
  success: boolean;
  transform: any;
  entities_created: Entity[];
  relationships_created: EntityRelationship[];
  execution_time: number;
}

class InvestigationService {
  /**
   * Get the investigation graph for a case
   */
  async getGraph(caseId: string): Promise<InvestigationGraph> {
    const response = await apiClient.get(`/investigation/cases/${caseId}/graph/`);
    return response.data;
  }

  /**
   * Create a new entity manually
   */
  async createEntity(
    caseId: string,
    data: {
      entity_type: string;
      value: string;
      metadata?: Record<string, any>;
      position_x?: number;
      position_y?: number;
    }
  ): Promise<Entity> {
    const response = await apiClient.post(`/investigation/cases/${caseId}/entities/`, data);
    return response.data;
  }

  /**
   * Create a relationship between two entities
   */
  async createRelationship(
    caseId: string,
    data: {
      source_entity_id: string;
      target_entity_id: string;
      relationship_type: string;
      metadata?: Record<string, any>;
    }
  ): Promise<EntityRelationship> {
    const response = await apiClient.post(`/investigation/cases/${caseId}/relationships/`, data);
    return response.data;
  }

  /**
   * Execute a transform on an entity
   */
  async executeTransform(
    caseId: string,
    data: {
      transform_id: string;
      source_entity_id: string;
    }
  ): Promise<TransformResult> {
    const response = await apiClient.post(`/investigation/cases/${caseId}/execute-transform/`, data);
    return response.data;
  }

  /**
   * Get available transforms for an entity type
   */
  async getTransforms(entityType?: string): Promise<Transform[]> {
    const params = entityType ? { entity_type: entityType } : {};
    const response = await apiClient.get('/investigation/transforms/', { params });
    return response.data;
  }

  /**
   * Update entity position (for graph persistence)
   */
  async updateEntityPosition(
    caseId: string,
    data: {
      entity_id: string;
      position_x: number;
      position_y: number;
      is_pinned?: boolean;
    }
  ): Promise<Entity> {
    const response = await apiClient.patch(`/investigation/cases/${caseId}/entities/position/`, data);
    return response.data;
  }

  /**
   * Update entity label
   */
  async updateEntityLabel(
    caseId: string,
    data: {
      entity_id: string;
      value: string;
    }
  ): Promise<Entity> {
    const response = await apiClient.patch(`/investigation/cases/${caseId}/entities/label/`, data);
    return response.data;
  }

  /**
   * Update a relationship
   */
  async updateRelationship(
    caseId: string,
    data: {
      relationship_id: string;
      relationship_type: string;
    }
  ): Promise<EntityRelationship> {
    const response = await apiClient.patch(
      `/investigation/cases/${caseId}/relationships/${data.relationship_id}/`,
      { relationship_type: data.relationship_type }
    );
    return response.data;
  }

  /**
   * Delete an entity
   */
  async deleteEntity(caseId: string, entityId: string): Promise<void> {
    await apiClient.delete(`/investigation/cases/${caseId}/entities/${entityId}/`);
  }

  /**
   * Delete a relationship
   */
  async deleteRelationship(caseId: string, relationshipId: string): Promise<void> {
    await apiClient.delete(`/investigation/cases/${caseId}/relationships/${relationshipId}/`);
  }

  /**
   * Export graph in various formats
   */
  async exportGraph(caseId: string, format: 'json' | 'cytoscape' | 'graphml' = 'json'): Promise<any> {
    const response = await apiClient.get(`/investigation/cases/${caseId}/export/`, {
      params: { format }
    });
    return response.data;
  }
}

export const investigationService = new InvestigationService();


