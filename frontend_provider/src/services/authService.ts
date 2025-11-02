import api from './api'
import { LoginCredentials, LoginResponse, User } from '../types'

export const authService = {
  async login(credentials: LoginCredentials): Promise<LoginResponse> {
    const response = await api.post<LoginResponse>('/auth/login/', credentials)
    return response.data
  },

  async getProfile(): Promise<User> {
    const response = await api.get<User>('/auth/profile/')
    return response.data
  },

  async logout(): Promise<void> {
    const refreshToken = localStorage.getItem('refresh_token')
    if (refreshToken) {
      try {
        await api.post('/auth/logout/', { refresh: refreshToken })
      } catch (error) {
        // Ignore logout errors
      }
    }
  },
}

