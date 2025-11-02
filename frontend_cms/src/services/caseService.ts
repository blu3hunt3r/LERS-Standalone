import api from './api'
import { Case, CaseStatistics, CreateCaseData, CaseParticipant, CaseNote, EvidenceFile } from '../types'

export const caseService = {
  async getCases(params?: Record<string, any>) {
    const response = await api.get<{ count: number; results: Case[] }>('/cases/', { params })
    return response.data
  },

  async getCase(id: string): Promise<Case> {
    const response = await api.get<Case>(`/cases/${id}/`)
    return response.data
  },

  async createCase(data: CreateCaseData): Promise<Case> {
    const response = await api.post<Case>('/cases/', data)
    return response.data
  },

  async updateCase(id: string, data: Partial<CreateCaseData>): Promise<Case> {
    const response = await api.patch<Case>(`/cases/${id}/`, data)
    return response.data
  },

  async getStatistics(): Promise<CaseStatistics> {
    const response = await api.get<CaseStatistics>('/cases/statistics/')
    return response.data
  },

  async getParticipants(caseId: string): Promise<CaseParticipant[]> {
    const response = await api.get<CaseParticipant[]>(`/cases/${caseId}/participants/`)
    return response.data
  },

  async addParticipant(caseId: string, data: Partial<CaseParticipant>): Promise<CaseParticipant> {
    const response = await api.post<CaseParticipant>(`/cases/${caseId}/participants/`, data)
    return response.data
  },

  async getNotes(caseId: string): Promise<CaseNote[]> {
    const response = await api.get<CaseNote[]>(`/cases/${caseId}/notes/`)
    return response.data
  },

  async addNote(caseId: string, content: string): Promise<CaseNote> {
    const response = await api.post<CaseNote>(`/cases/${caseId}/notes/`, { content })
    return response.data
  },

  async getTimeline(caseId: string) {
    const response = await api.get(`/cases/${caseId}/timeline/`)
    return response.data
  },

  async getEvidence(caseId: string): Promise<EvidenceFile[]> {
    const response = await api.get<{ results: EvidenceFile[] }>('/evidence/files/', { 
      params: { case: caseId } 
    })
    return response.data.results
  },

  async uploadEvidence(caseId: string, file: File, description?: string): Promise<EvidenceFile> {
    const formData = new FormData()
    formData.append('file', file)
    formData.append('case', caseId)
    if (description) {
      formData.append('description', description)
    }

    const response = await api.post<EvidenceFile>('/evidence/files/', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    })
    return response.data
  },
}

