/**
 * API Service - Complete Axios Configuration
 * Phase 0 - Emergency Fixes: Provider Frontend Build Restoration
 *
 * Features:
 * - Axios instance with base URL configuration
 * - Request interceptor for automatic JWT token injection
 * - Response interceptor for 401 handling and token refresh
 * - Centralized error handling with user-friendly messages
 * - TypeScript type safety
 * - Environment variable configuration
 */

import axios, { AxiosError } from 'axios'
import type { AxiosRequestConfig, InternalAxiosRequestConfig } from 'axios'
import { toast } from 'sonner'

/**
 * API Base URL from environment variables
 * Defaults to localhost:8000/api/v1 for development
 */
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1'

/**
 * Main API instance with pre-configured settings
 */
export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000, // 30 second timeout
  withCredentials: true, // CRITICAL: Enable httpOnly cookie sending
})

/**
 * Flag to prevent infinite refresh loops
 */
let isRefreshing = false
let failedQueue: Array<{
  resolve: (value?: any) => void
  reject: (reason?: any) => void
}> = []

/**
 * Process queued requests after token refresh
 */
const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach(prom => {
    if (error) {
      prom.reject(error)
    } else {
      prom.resolve(token)
    }
  })

  failedQueue = []
}

/**
 * Request Interceptor
 * No longer needed for authorization - cookies handle this automatically!
 * Backend middleware extracts token from httpOnly cookie.
 */
api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    // No token injection needed - httpOnly cookies are automatically sent
    // with every request by the browser

    // Log request in development
    if (import.meta.env.DEV) {
      console.log(`[API Request] ${config.method?.toUpperCase()} ${config.url}`, {
        params: config.params,
        data: config.data,
        cookies: 'httpOnly cookies sent automatically',
      })
    }

    return config
  },
  (error: AxiosError) => {
    // Log error in development
    if (import.meta.env.DEV) {
      console.error('[API Request Error]', error)
    }
    return Promise.reject(error)
  }
)

/**
 * Response Interceptor
 * Handles automatic token refresh on 401 Unauthorized
 * Shows user-friendly error messages
 * Implements retry logic for failed requests
 */
api.interceptors.response.use(
  // Success handler - pass through response
  (response) => {
    // Log response in development
    if (import.meta.env.DEV) {
      console.log(`[API Response] ${response.config.method?.toUpperCase()} ${response.config.url}`, {
        status: response.status,
        data: response.data,
      })
    }
    return response
  },

  // Error handler - handle 401, refresh token, retry
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean }

    // Log error in development
    if (import.meta.env.DEV) {
      console.error('[API Response Error]', {
        url: error.config?.url,
        status: error.response?.status,
        data: error.response?.data,
      })
    }

    /**
     * Handle 401 Unauthorized - Token Refresh Flow
     */
    if (error.response?.status === 401 && originalRequest && !originalRequest._retry) {
      // If already refreshing, queue this request
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject })
        })
          .then(token => {
            if (originalRequest.headers) {
              originalRequest.headers.Authorization = `Bearer ${token}`
            }
            return api(originalRequest)
          })
          .catch(err => {
            return Promise.reject(err)
          })
      }

      // Mark as retrying
      originalRequest._retry = true
      isRefreshing = true

      // Attempt cookie-based token refresh
      try {
        // Call token refresh endpoint
        // No body needed - backend reads refresh_token from httpOnly cookie
        const response = await api.post('/auth/token/refresh/')

        // Backend automatically sets new access_token cookie
        // No need to update localStorage or Authorization header

        // Process queued requests - they will use new cookie automatically
        processQueue(null, 'cookie-refreshed')

        // Reset refreshing flag
        isRefreshing = false

        // Retry original request with new cookie
        return api(originalRequest)
      } catch (refreshError) {
        // Token refresh failed
        processQueue(refreshError, null)
        isRefreshing = false

        // Redirect to login (backend will clear cookies)
        handleLogout('Your session has expired. Please login again.')

        return Promise.reject(refreshError)
      }
    }

    /**
     * Handle other error responses with user-friendly messages
     */
    handleErrorResponse(error)

    return Promise.reject(error)
  }
)

/**
 * Handle logout flow
 * Cookies are cleared by backend on /auth/logout/
 */
const handleLogout = (message?: string) => {
  // Show message if provided
  if (message) {
    toast.error(message)
  }

  // Redirect to login page
  // Backend will clear httpOnly cookies on logout endpoint
  window.location.href = '/login'
}

/**
 * Handle error responses with user-friendly toast messages
 */
const handleErrorResponse = (error: AxiosError) => {
  let errorMessage = 'An unexpected error occurred'

  if (error.response) {
    // Server responded with error status
    const data = error.response.data as any

    // Extract error message from various possible formats
    errorMessage =
      data?.detail ||
      data?.error ||
      data?.message ||
      data?.non_field_errors?.[0] ||
      getStatusMessage(error.response.status)

    // Handle validation errors (400)
    if (error.response.status === 400 && typeof data === 'object') {
      const validationErrors = Object.entries(data)
        .filter(([key]) => key !== 'detail' && key !== 'error' && key !== 'message')
        .map(([key, value]) => {
          const fieldName = key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
          const errorValue = Array.isArray(value) ? value[0] : value
          return `${fieldName}: ${errorValue}`
        })

      if (validationErrors.length > 0) {
        errorMessage = validationErrors.join(', ')
      }
    }
  } else if (error.request) {
    // Request made but no response received
    errorMessage = 'No response from server. Please check your connection.'
  } else {
    // Error in request setup
    errorMessage = error.message || 'Failed to make request'
  }

  // Show error toast
  toast.error(errorMessage)

  // Log full error in development
  if (import.meta.env.DEV) {
    console.error('[Error Details]', {
      message: errorMessage,
      error: error,
      response: error.response?.data,
    })
  }
}

/**
 * Get user-friendly message for HTTP status codes
 */
const getStatusMessage = (status: number): string => {
  const statusMessages: Record<number, string> = {
    400: 'Invalid request. Please check your input.',
    401: 'Unauthorized. Please login again.',
    403: 'You do not have permission to perform this action.',
    404: 'The requested resource was not found.',
    409: 'Conflict. The resource already exists or cannot be modified.',
    422: 'Validation error. Please check your input.',
    429: 'Too many requests. Please try again later.',
    500: 'Internal server error. Please try again later.',
    502: 'Bad gateway. The server is temporarily unavailable.',
    503: 'Service unavailable. Please try again later.',
    504: 'Gateway timeout. The request took too long.',
  }

  return statusMessages[status] || `Request failed with status ${status}`
}

/**
 * Cookie-based authentication - no localStorage helpers needed!
 * Tokens are stored in httpOnly cookies managed by the backend.
 *
 * To check authentication status, use the /auth/users/me/ endpoint.
 * To logout, call the /auth/logout/ endpoint to clear cookies.
 */

/**
 * Type-safe wrapper for GET requests
 */
export const get = <T = any>(url: string, config?: AxiosRequestConfig): Promise<T> => {
  return api.get<T>(url, config).then(response => response.data)
}

/**
 * Type-safe wrapper for POST requests
 */
export const post = <T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> => {
  return api.post<T>(url, data, config).then(response => response.data)
}

/**
 * Type-safe wrapper for PUT requests
 */
export const put = <T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> => {
  return api.put<T>(url, data, config).then(response => response.data)
}

/**
 * Type-safe wrapper for PATCH requests
 */
export const patch = <T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> => {
  return api.patch<T>(url, data, config).then(response => response.data)
}

/**
 * Type-safe wrapper for DELETE requests
 */
export const del = <T = any>(url: string, config?: AxiosRequestConfig): Promise<T> => {
  return api.delete<T>(url, config).then(response => response.data)
}

/**
 * Export API instance as default
 */
export default api
