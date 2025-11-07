import axios from 'axios'
import { toast } from 'react-toastify'

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1'

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000, // Default 30 seconds timeout (can be overridden per request)
})

// Request interceptor
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('access_token')
    console.log('API Interceptor - Token:', token ? token.substring(0, 30) + '...' : 'NO TOKEN')
    console.log('API Interceptor - Request URL:', config.url)
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
      console.log('API Interceptor - Auth header set:', config.headers.Authorization?.substring(0, 30) + '...')
    } else {
      console.warn('API Interceptor - No token found in localStorage!')
    }
    return config
  },
  (error) => {
    console.error('API Interceptor - Request error:', error)
    return Promise.reject(error)
  }
)

// Response interceptor
api.interceptors.response.use(
  (response) => {
    console.log('API Response received:', response.status, response.config.url)
    return response
  },
  async (error) => {
    console.error('API Response error:', error.response?.status, error.config?.url, error.response?.data)
    const originalRequest = error.config

    // If 401 and not already retrying, try to refresh token
    if (error.response?.status === 401 && !originalRequest._retry) {
      console.log('Got 401, attempting token refresh...')
      originalRequest._retry = true

      try {
        const refreshToken = localStorage.getItem('refresh_token')
        if (refreshToken) {
          console.log('Refreshing token...')
          const response = await axios.post(`${API_BASE_URL}/auth/token/refresh/`, {
            refresh: refreshToken,
          })

          const { access } = response.data
          localStorage.setItem('access_token', access)
          console.log('Token refreshed successfully, retrying request...')

          originalRequest.headers.Authorization = `Bearer ${access}`
          return api(originalRequest)
        } else {
          console.warn('No refresh token found, cannot refresh')
        }
      } catch (refreshError) {
        console.error('Token refresh failed:', refreshError)
        // Refresh failed, logout user
        localStorage.removeItem('access_token')
        localStorage.removeItem('refresh_token')
        window.location.href = '/login'
        return Promise.reject(refreshError)
      }
    }

    // Show error toast (but not for download requests since we handle them separately)
    if (!error.config?.url?.includes('/download/')) {
      const errorMessage = error.response?.data?.detail || error.response?.data?.error || error.message || 'An error occurred'
      toast.error(errorMessage)
    }

    return Promise.reject(error)
  }
)

export default api

