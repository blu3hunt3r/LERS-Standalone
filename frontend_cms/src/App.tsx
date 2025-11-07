import { useEffect } from 'react'
import { Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { useAuthStore } from './stores/authStore'
import ProviderLoginPage from './pages/ProviderLoginPage'
import StandaloneLERSRequestPage from './pages/StandaloneLERSRequestPage'
import LERSRequestDetailPage from './pages/LERSRequestDetailPage'
import LERSPortalLoginPage from './pages/LERSPortalLoginPage'
import LERSPortalDashboardPage from './pages/LERSPortalDashboardPage'
import LERSPortalRequestsPage from './pages/LERSPortalRequestsPage'
import ProviderInbox from './pages/provider/ProviderInbox'
import ProviderInProgress from './pages/provider/ProviderInProgress'
import ProviderCompleted from './pages/provider/ProviderCompleted'
import ProviderRequestDetail from './pages/provider/ProviderRequestDetail'
import ProviderDashboard from './pages/provider/ProviderDashboard'
import ProviderPortalLayout from './components/provider/ProviderPortalLayout'
import LERSPortalLayout from './layouts/LERSPortalLayout'
import { SocketProvider } from './contexts/SocketContext'

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuthStore()
  const location = useLocation()

  const token = localStorage.getItem('access_token')
  console.log('🔒 PrivateRoute check:', {
    path: location.pathname,
    isAuthenticated,
    hasToken: !!token,
    tokenPreview: token ? `${token.substring(0, 20)}...` : 'NO TOKEN',
    timestamp: new Date().toISOString()
  })

  if (!isAuthenticated) {
    console.warn('❌ Not authenticated, redirecting to login')
    // Redirect to appropriate login page based on path
    let loginPath = '/lers/portal/login'
    if (location.pathname.startsWith('/lers/provider')) {
      loginPath = '/lers/provider/login'
    }
    return <Navigate to={loginPath} replace state={{ from: location }} />
  }

  console.log('✅ Authenticated, allowing access')
  return <>{children}</>
}

function App() {
  const { isAuthenticated } = useAuthStore()

  useEffect(() => {
    console.log('App mounted, isAuthenticated:', isAuthenticated)
  }, [])

  useEffect(() => {
    console.log('Auth state changed:', isAuthenticated)
  }, [isAuthenticated])

  return (
    <SocketProvider>
      <Routes>
        {/* Root - Redirect to LERS Portal */}
        <Route path="/" element={<Navigate to="/lers/portal/login" replace />} />

        {/* LERS Portal - Law Enforcement Login (Primary Portal) */}
        <Route path="/lers/portal/login" element={<LERSPortalLoginPage />} />

        {/* LERS Provider Portal Login */}
        <Route path="/lers/provider/login" element={<ProviderLoginPage />} />

        {/* LERS Provider Portal Routes - For Data Providers */}
        <Route
          path="/lers/provider"
          element={
            <PrivateRoute>
              <ProviderPortalLayout />
            </PrivateRoute>
          }
        >
          <Route index element={<Navigate to="/lers/provider/inbox" replace />} />
          <Route path="inbox" element={<ProviderInbox />} />
          {/* Redirect old routes to inbox */}
          <Route path="in-progress" element={<Navigate to="/lers/provider/inbox" replace />} />
          <Route path="completed" element={<Navigate to="/lers/provider/inbox" replace />} />
          <Route path="requests/:requestId" element={<ProviderRequestDetail />} />
        </Route>

        {/* LERS Portal Routes - Standalone LERS System for Law Enforcement */}
        <Route
          path="/lers/portal"
          element={
            <PrivateRoute>
              <LERSPortalLayout />
            </PrivateRoute>
          }
        >
          <Route index element={<Navigate to="/lers/portal/dashboard" replace />} />
          <Route path="dashboard" element={<LERSPortalDashboardPage />} />
          <Route path="requests" element={<LERSPortalRequestsPage />} />
          <Route path="requests/:requestId" element={<LERSRequestDetailPage />} />
          <Route path="create" element={<StandaloneLERSRequestPage />} />
        </Route>

        {/* Catch all - redirect to LERS Portal login */}
        <Route path="*" element={<Navigate to="/lers/portal/login" replace />} />
      </Routes>
    </SocketProvider>
  )
}

export default App

