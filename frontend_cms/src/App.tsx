import { useEffect } from 'react'
import { Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { useAuthStore } from './stores/authStore'
import LoginPage from './pages/LoginPage'
import ProviderLoginPage from './pages/ProviderLoginPage'
import DashboardPage from './pages/DashboardPage'
import CasesPage from './pages/CasesPage'
import UnifiedCaseCommandCenter from './pages/UnifiedCaseCommandCenter'
import CreateCasePage from './pages/CreateCasePage'
import CreateLERSRequestPage from './pages/CreateLERSRequestPage'
import StandaloneLERSRequestPage from './pages/StandaloneLERSRequestPage'
import LERSRequestsPage from './pages/LERSRequestsPage'
import LERSRequestDetailPage from './pages/LERSRequestDetailPage'
import LERSPortalLoginPage from './pages/LERSPortalLoginPage'
import LERSPortalDashboardPage from './pages/LERSPortalDashboardPage'
import LERSPortalRequestsPage from './pages/LERSPortalRequestsPage'
import ApproverDashboard from './pages/ApproverDashboard'
import ProviderInbox from './pages/provider/ProviderInbox'
import ProviderInProgress from './pages/provider/ProviderInProgress'
import ProviderCompleted from './pages/provider/ProviderCompleted'
import ProviderRequestDetail from './pages/provider/ProviderRequestDetail'
import ProviderDashboard from './pages/provider/ProviderDashboard'
import ProviderPortalLayout from './components/provider/ProviderPortalLayout'
import MainLayout from './layouts/MainLayout'
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
    let loginPath = '/login'
    if (location.pathname.startsWith('/lers/provider')) {
      loginPath = '/lers/provider/login'
    } else if (location.pathname.startsWith('/lers/portal')) {
      loginPath = '/lers/portal/login'
    }
    return <Navigate to={loginPath} replace state={{ from: location }} />
  }

  console.log('✅ Authenticated, allowing access')
  return <>{children}</>
}

function LegacyLERSRedirect() {
  const location = useLocation()
  const newPath = location.pathname.replace('/lers/', '/lers/portal/')
  return <Navigate to={newPath} replace />
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
        {/* CMS Portal - Police Officers Login */}
        <Route path="/login" element={<LoginPage />} />

        {/* LERS Provider Portal Login */}
        <Route path="/lers/provider/login" element={<ProviderLoginPage />} />

        {/* LERS Portal - Standalone Law Enforcement Login */}
        <Route path="/lers/portal/login" element={<LERSPortalLoginPage />} />

        {/* Main CMS Routes - For Police Officers */}
        <Route
          path="/"
          element={
            <PrivateRoute>
              <MainLayout />
            </PrivateRoute>
          }
        >
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<DashboardPage />} />
          <Route path="cases" element={<CasesPage />} />
          <Route path="cases/create" element={<CreateCasePage />} />
          <Route path="cases/:id" element={<UnifiedCaseCommandCenter />} />
          <Route path="approvals" element={<ApproverDashboard />} />
        </Route>

        {/* LERS Provider Portal Routes - Completely Separate System */}
        <Route
          path="/lers/provider"
          element={
            <PrivateRoute>
              <ProviderPortalLayout />
            </PrivateRoute>
          }
        >
          <Route index element={<Navigate to="/lers/provider/dashboard" replace />} />
          <Route path="dashboard" element={<ProviderDashboard />} />
          <Route path="inbox" element={<ProviderInbox />} />
          <Route path="in-progress" element={<ProviderInProgress />} />
          <Route path="completed" element={<ProviderCompleted />} />
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

        {/* Legacy Redirects - Old LERS paths to new structure */}
        <Route path="/lers/requests" element={<LegacyLERSRedirect />} />
        <Route path="/lers/requests/:requestId" element={<LegacyLERSRedirect />} />
        <Route path="/lers/create" element={<LegacyLERSRedirect />} />
        <Route path="/lers/standalone/create" element={<Navigate to="/lers/portal/create" replace />} />
      </Routes>
    </SocketProvider>
  )
}

export default App

