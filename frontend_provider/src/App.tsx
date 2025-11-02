import { Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useAuthStore } from './stores/authStore'
import { SocketProvider } from './contexts/SocketContext'
import { Toaster } from 'sonner'

// Pages
import LoginPage from './pages/LoginPage'
import ProviderDashboard from './pages/provider/ProviderDashboard'
import ProviderInbox from './pages/provider/ProviderInbox'
import ProviderRequestDetail from './pages/provider/ProviderRequestDetail'

// Layout
import ProviderPortalLayout from './components/provider/ProviderPortalLayout'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
      staleTime: 30000,
    },
  },
})

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuthStore()
  return isAuthenticated ? <>{children}</> : <Navigate to="/login" replace />
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <SocketProvider>
        <Toaster position="top-right" richColors />
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          
          {/* Provider Portal Routes */}
          <Route
            path="/"
            element={
              <PrivateRoute>
                <ProviderPortalLayout />
              </PrivateRoute>
            }
          >
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="dashboard" element={<ProviderDashboard />} />
            <Route path="inbox" element={<ProviderInbox />} />
            <Route path="requests/:requestId" element={<ProviderRequestDetail />} />
          </Route>
        </Routes>
      </SocketProvider>
    </QueryClientProvider>
  )
}

export default App
