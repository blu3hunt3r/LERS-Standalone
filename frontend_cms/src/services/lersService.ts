import api from './api'
import { LERSRequest } from '../types'

export const lersService = {
  async getRequests(params?: Record<string, any>) {
    const response = await api.get<{ count: number; results: LERSRequest[] }>('/lers/requests/', { params })
    return response.data
  },

  async getRequest(id: string): Promise<LERSRequest> {
    const response = await api.get<LERSRequest>(`/lers/requests/${id}/`)
    return response.data
  },

  async createRequest(data: any): Promise<LERSRequest> {
    const response = await api.post<LERSRequest>('/lers/requests/', data)
    return response.data
  },

  async approveRequest(id: string, notes?: string): Promise<LERSRequest> {
    const response = await api.post<LERSRequest>(`/lers/requests/${id}/approve/`, { approval_notes: notes })
    return response.data
  },

  async rejectRequest(id: string, reason: string): Promise<LERSRequest> {
    const response = await api.post<LERSRequest>(`/lers/requests/${id}/reject/`, { rejection_reason: reason })
    return response.data
  },

  // Get smart actions for entity type
  async getEntitySmartActions(entityType: string, entityValue: string, caseId: string) {
    const response = await api.post('/lers/requests/entity-smart-actions/', {
      entity_type: entityType,
      entity_value: entityValue,
      case_id: caseId
    })
    return response.data
  },

  // Smart create LERS request from entity
  async smartCreateFromEntity(data: {
    entity_hash: string
    entity_type: string
    case_id: string
    request_type: string
    provider_id: string
  }) {
    const response = await api.post('/lers/requests/smart-create/', data)
    return response.data
  },

  // Get LERS requests for a specific case
  async getLERSRequestsForCase(caseId: string) {
    const response = await api.get(`/lers/requests/?case=${caseId}`)
    return response.data.results || []
  },

  // Get all providers with their capabilities and data points
  async getProviders(params?: { category?: string; provider_id?: string }) {
    const response = await api.get('/lers/requests/providers/', { params })
    return response.data
  },

  // ═══════════════════════════════════════════════════════════════
  // PHASE 4: NEW API METHODS FOR ENHANCED LERS SYSTEM
  // ═══════════════════════════════════════════════════════════════

  /**
   * Get all messages for a LERS request
   */
  async getMessages(requestId: string) {
    const response = await api.get(`/lers/requests/${requestId}/messages/`)
    return response.data
  },

  /**
   * Send a message in a LERS request chat
   */
  async sendMessage(requestId: string, data: {
    message_text: string
    message_type?: 'TEXT' | 'FILE' | 'SYSTEM'
    attachments?: Array<{url: string; filename: string; size?: number; type?: string}>
    metadata?: Record<string, any>
  }) {
    const response = await api.post(`/lers/requests/${requestId}/messages/`, data)
    return response.data
  },

  /**
   * Get pending approval requests (Approver Dashboard)
   */
  async getPendingApprovals(params?: {
    priority?: 'NORMAL' | 'HIGH' | 'URGENT'
    station?: string
    io?: string
    date_from?: string
    date_to?: string
    sort?: 'newest' | 'oldest' | 'priority' | 'sla'
    page?: number
    page_size?: number
  }) {
    const response = await api.get('/lers/requests/pending-approvals/', { params })
    return response.data
  },

  /**
   * Get unread notification count for current user
   */
  async getUnreadNotificationCount() {
    const response = await api.get('/lers/requests/notifications/unread-count/')
    return response.data.unread_count
  },

  /**
   * Get all notifications for current user
   */
  async getNotifications(params?: {
    read?: 'true' | 'false'
    priority?: 'NORMAL' | 'HIGH' | 'URGENT'
    type?: string
    page?: number
    page_size?: number
  }) {
    const response = await api.get('/lers/requests/notifications/', { params })
    return response.data
  },

  /**
   * Mark a specific notification as read
   */
  async markNotificationRead(notificationId: string) {
    const response = await api.post(`/lers/requests/notifications/${notificationId}/mark-read/`)
    return response.data
  },

  /**
   * Mark all notifications as read
   */
  async markAllNotificationsRead() {
    const response = await api.post('/lers/requests/notifications/mark-all-read/')
    return response.data
  },

  /**
   * Get current user's presence status
   */
  async getPresence() {
    const response = await api.get('/lers/requests/presence/')
    return response.data
  },

  /**
   * Update current user's presence status
   */
  async updatePresence(status: 'ONLINE' | 'AWAY' | 'OFFLINE', socketId?: string) {
    const response = await api.post('/lers/requests/presence/', {
      status,
      socket_id: socketId
    })
    return response.data
  },
}

