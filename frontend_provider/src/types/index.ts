/**
 * Type definitions for Provider Frontend
 * Phase 0 - Emergency Fixes: Complete type definitions
 */

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
  case: string | { case_number: string; fir_number?: string; [key: string]: any }
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
  created_by: string | { name: string; tenant: string; [key: string]: any }
  created_by_name: string
  created_at: string
  updated_at: string
  submitted_at?: string
  description?: string
  identifiers?: Array<{ type: string; value: string }>
  date_range_from?: string
  date_range_to?: string
  legal_mandate_type?: string
  court_order_number?: string
  legal_mandate_file?: string
  data_points?: DataPoint[]
  messages?: LERSMessage[]
  timeline_entries?: TimelineEntry[]
}

export interface DataPoint {
  id: string
  label: string
  value: string
  data_type: string
  data_type_display: string
}

export interface LERSMessage {
  id: string
  request: string
  user: string
  user_name: string
  user_role: string
  message_text: string
  message_type: string
  attachments?: Attachment[]
  is_read: boolean
  created_at: string
  updated_at: string
}

export interface Attachment {
  id?: string
  url: string
  filename: string
  size?: number
  type?: string
}

export interface TimelineEntry {
  id: string
  request: string
  event_type: string
  event_type_display: string
  description: string
  user?: string
  user_name?: string
  metadata?: Record<string, any>
  created_at: string
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

export interface Notification {
  id: string
  notification_type: string
  title: string
  message: string
  priority: string
  is_read: boolean
  metadata?: Record<string, any>
  created_at: string
}

export interface UserPresence {
  user_id: string
  user_name: string
  status: 'ONLINE' | 'AWAY' | 'OFFLINE'
  last_seen: string
  socket_id?: string
}

export interface PaginatedResponse<T> {
  count: number
  next: string | null
  previous: string | null
  results: T[]
}

export interface APIError {
  detail?: string
  error?: string
  message?: string
  [key: string]: any
}
