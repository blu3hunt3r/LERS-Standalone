export interface User {
  id: string
  email: string
  username: string
  full_name: string
  role: string
  role_display: string
  tenant: string
  tenant_name: string
  is_active: boolean
}

export interface LoginCredentials {
  email: string
  password: string
}

export interface LoginResponse {
  user: User
  tokens?: {
    access: string
    refresh: string
  }
  // Backward compatibility
  access?: string
  refresh?: string
}

export interface Case {
  id: string
  case_number: string
  title: string
  description: string
  crime_category: string
  crime_category_display: string
  sub_category?: string
  status: string
  status_display: string
  priority: string
  priority_display: string
  fir_number?: string
  fir_date?: string
  financial_loss?: number
  victim_name?: string
  victim_contact?: string
  assigned_to?: string | { id: string; full_name: string; email: string }
  assigned_to_name?: string
  created_by: string
  created_by_name: string
  incident_date?: string
  reported_date?: string
  incident_location?: string
  incident_geo?: any
  complainant_masked?: string
  acknowledgement_number?: string
  police_station?: string
  entity_count?: number
  evidence_count?: number
  request_count?: number
  participants?: CaseParticipant[]
  created_at: string
  updated_at: string
}

export interface CaseStatistics {
  total: number
  by_status: Record<string, number>
  by_priority: Record<string, number>
  by_category: Record<string, number>
  total_financial_loss: number
}

export interface CreateCaseData {
  title: string
  description: string
  crime_category: string
  priority: string
  fir_number?: string
  fir_date?: string
  financial_loss?: number
  victim_name?: string
  victim_contact?: string
}

export interface LERSRequest {
  id: string
  request_number: string
  case: string
  case_number: string
  request_type: string
  request_type_display: string
  priority: string
  priority_display: string
  status: string
  status_display: string
  provider_name: string
  provider_tenant?: string
  sla_due_date?: string
  created_by: string
  created_by_name: string
  created_at: string
  updated_at: string
}

export interface CaseParticipant {
  id: string
  case: string
  role: string
  role_display: string
  name: string
  phone?: string
  email?: string
  notes?: string
  created_at: string
}

export interface CaseNote {
  id: string
  case: string
  author: string
  author_name: string
  content: string
  created_at: string
}

export interface EvidenceFile {
  id: string
  case: string
  file_name: string
  file_type: string
  file_type_display: string
  file_size: number
  uploaded_by_name: string
  created_at: string
  description?: string
}

