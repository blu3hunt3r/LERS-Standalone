/**
 * Crime Template Service
 * Handles API calls for crime templates
 */
import api from './api'

export interface TemplateField {
  field_name: string
  field_type: string
  is_required: boolean
  help_text?: string
  validation_rules?: Record<string, any>
}

export interface EvidenceChecklistItem {
  evidence_type: string
  is_required: boolean
  description?: string
}

export interface SuggestedLERSRequest {
  request_type: string
  provider_types: string[]
  suggested_sla_days: number
  priority: string
  description: string
}

export interface CrimeTemplate {
  id: string
  category: string
  display_name: string
  description: string
  icon: string
  required_fields: TemplateField[]
  optional_fields: TemplateField[]
  evidence_checklist: EvidenceChecklistItem[]
  entity_extraction_rules: Record<string, any>
  suggested_lers_requests: SuggestedLERSRequest[]
  priority_rules: Record<string, any>
  applicable_laws: string[]
  tags: string[]
  is_active: boolean
  created_at: string
  updated_at: string
}

const templateService = {
  /**
   * Get all crime templates
   */
  getAllTemplates: async (): Promise<CrimeTemplate[]> => {
    const response = await api.get('/ingestion/templates/')
    return response.data
  },

  /**
   * Get template by category
   */
  getTemplateByCategory: async (category: string): Promise<CrimeTemplate | null> => {
    const response = await api.get('/ingestion/templates/', {
      params: { category: category }
    })
    return response.data.length > 0 ? response.data[0] : null
  },

  /**
   * Get template by ID
   */
  getTemplateById: async (id: string): Promise<CrimeTemplate> => {
    const response = await api.get(`/ingestion/templates/${id}/`)
    return response.data
  },
}

export default templateService

