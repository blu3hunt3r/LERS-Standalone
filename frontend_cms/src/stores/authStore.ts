import { create } from 'zustand'
import { User } from '../types'

interface AuthState {
  user: User | null
  isAuthenticated: boolean
  accessToken: string | null
  refreshToken: string | null
  setUser: (user: User | null) => void
  setTokens: (accessToken: string, refreshToken: string) => void
  logout: () => void
}

export const useAuthStore = create<AuthState>((set) => {
  // Initialize from localStorage
  const accessToken = localStorage.getItem('access_token')
  const refreshToken = localStorage.getItem('refresh_token')
  const isAuthenticated = !!(accessToken && refreshToken)

  return {
    user: null,
    isAuthenticated,
    accessToken,
    refreshToken,
    
    setUser: (user) => set({ user }),
    
    setTokens: (accessToken, refreshToken) => {
      localStorage.setItem('access_token', accessToken)
      localStorage.setItem('refresh_token', refreshToken)
      set({ accessToken, refreshToken, isAuthenticated: true })
    },
    
    logout: () => {
      localStorage.removeItem('access_token')
      localStorage.removeItem('refresh_token')
      set({ user: null, accessToken: null, refreshToken: null, isAuthenticated: false })
    },
  }
})

