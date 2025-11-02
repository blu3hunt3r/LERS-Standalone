import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { useAuthStore } from './stores/authStore'
import LERSPortalLoginPage from './pages/LERSPortalLoginPage'
import LERSPortalDashboardPage from './pages/LERSPortalDashboardPage'
import LERSPortalRequestsPage from './pages/LERSPortalRequestsPage'
import LERSRequestDetailPage from './pages/LERSRequestDetailPage'
import CreateLERSRequestPage from './pages/CreateLERSRequestPage'
import ApproverDashboard from './pages/ApproverDashboard'
import LERSPortalLayout from './layouts/LERSPortalLayout'
import { SocketProvider } from './contexts/SocketContext'

// Protected Route Component
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuthStore()
  const location = useLocation()

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  return <>{children}</>
}

function App() {
  return (
    <BrowserRouter>
      <SocketProvider>
        <Routes>
          {/* Public Routes */}
          <Route path="/login" element={<LERSPortalLoginPage />} />
          <Route path="/" element={<Navigate to="/login" replace />} />

          {/* LERS Portal Routes - Protected */}
          <Route
            path="/*"
            element={
              <ProtectedRoute>
                <LERSPortalLayout />
              </ProtectedRoute>
            }
          >
            <Route path="dashboard" element={<LERSPortalDashboardPage />} />
            <Route path="requests" element={<LERSPortalRequestsPage />} />
            <Route path="requests/create" element={<CreateLERSRequestPage />} />
            <Route path="requests/:id" element={<LERSRequestDetailPage />} />
            <Route path="approvals" element={<ApproverDashboard />} />
            <Route index element={<Navigate to="/dashboard" replace />} />
          </Route>

          {/* Catch all - redirect to dashboard */}
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </SocketProvider>
    </BrowserRouter>
  )
}

export default App
