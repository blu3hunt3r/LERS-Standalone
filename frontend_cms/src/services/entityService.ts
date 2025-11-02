import api from './api'

export interface Entity {
  id: string
  entity_type: string
  normalized_value: string
  display_value?: string
  value_hash: string
  confidence: number
  verified: boolean
  verified_by?: string
  verified_at?: string
  source_file?: {
    id: string
    file_name: string
  }
  source_line_number?: number
  ai_notes?: string
  created_at: string
  updated_at: string
  case?: {
    id: string
    case_number: string
  }
}

export interface EntitySearchParams {
  query: string
  entity_type?: string
  exclude_id?: string
}

export interface RevealPIIRequest {
  justification: string
  supervisor_otp: string
}

export interface MergeEntitiesRequest {
  source_id: string
  target_id: string
  reason: string
}

export interface CreateWatchlistRequest {
  watch_scope: 'station' | 'district' | 'state' | 'national'
  reason: string
  risk_level?: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
  alert_on_new_case?: boolean
  expires_in_days?: number
}

const entityService = {
  // Get all entities for a case
  getCaseEntities: async (caseId: string): Promise<{ results: Entity[] }> => {
    const response = await api.get(`/api/v1/entities/`, {
      params: { case_id: caseId }
    })
    return response.data
  },

  // Get a single entity by ID
  getEntity: async (entityId: string): Promise<Entity> => {
    const response = await api.get(`/api/v1/entities/${entityId}/`)
    return response.data
  },

  // Search entities
  searchEntities: async (params: EntitySearchParams): Promise<Entity[]> => {
    const response = await api.get('/api/v1/entities/merge/search/', {
      params
    })
    return response.data
  },

  // Reveal PII for an entity
  revealPII: async (entityId: string, data: RevealPIIRequest): Promise<any> => {
    const response = await api.post(`/api/v1/entities/pii/${entityId}/reveal-pii/`, data)
    return response.data
  },

  // Request supervisor OTP for PII reveal
  requestSupervisorOTP: async (entityId: string, justification: string): Promise<any> => {
    const response = await api.post(`/api/v1/entities/pii/${entityId}/request-supervisor-otp/`, {
      justification
    })
    return response.data
  },

  // Merge two entities
  mergeEntities: async (data: MergeEntitiesRequest): Promise<any> => {
    const response = await api.post('/api/v1/entities/merge/merge/', data)
    return response.data
  },

  // Watchlist operations
  watchlist: {
    // Create a watch for an entity
    createWatch: async (entityHash: string, data: CreateWatchlistRequest): Promise<any> => {
      const response = await api.post(`/api/v1/entities/watchlist/${entityHash}/watch/`, data)
      return response.data
    },

    // Get matches for a watched entity
    getMatches: async (entityHash: string): Promise<any> => {
      const response = await api.get(`/api/v1/entities/watchlist/${entityHash}/matches/`)
      return response.data
    },

    // List all active watches
    listActive: async (): Promise<any> => {
      const response = await api.get('/api/v1/entities/watchlist/active/')
      return response.data
    },

    // Deactivate a watch
    deactivate: async (watchId: string): Promise<any> => {
      const response = await api.delete(`/api/v1/entities/watchlist/${watchId}/deactivate/`)
      return response.data
    }
  }
}

export default entityService
