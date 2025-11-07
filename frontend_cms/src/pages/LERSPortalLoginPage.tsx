import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../stores/authStore'
import { authService } from '../services/authService'
import { toast } from 'react-toastify'
import { Button } from '../components/ui/button'
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/card'
import { Input } from '../components/ui/input'
import { Label } from '../components/ui/label'
import { Alert, AlertDescription } from '../components/ui/alert'
import { FileText, Mail, Lock, Eye, EyeOff } from 'lucide-react'

export default function LERSPortalLoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const { setUser, setTokens } = useAuthStore()
  const navigate = useNavigate()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    console.log('==== LERS PORTAL LOGIN ATTEMPT ====')
    console.log('Email:', email)
    console.log('Timestamp:', new Date().toISOString())

    try {
      console.log('Calling API: POST /api/v1/auth/login/')
      const response = await authService.login({ email, password })

      console.log('API Response:', {
        user: response.user?.email,
        role: response.user?.role,
        hasTokens: !!response.tokens
      })

      // Verify this is a law enforcement account (not provider)
      if (response.user?.role === 'COMPANY_AGENT') {
        setError('This portal is for Law Enforcement only. Service providers should use the Provider Portal.')
        setLoading(false)
        return
      }

      // Extract tokens
      const accessToken = response.tokens?.access || response.access
      const refreshToken = response.tokens?.refresh || response.refresh

      if (!accessToken) {
        throw new Error('No access token received')
      }

      // Save tokens
      localStorage.setItem('access_token', accessToken)
      localStorage.setItem('refresh_token', refreshToken || '')
      setTokens(accessToken, refreshToken || '')
      setUser(response.user)

      toast.success('Login successful!')

      // Wait for state to save
      await new Promise(resolve => setTimeout(resolve, 50))

      console.log('✅ LERS Portal login successful, redirecting to /lers/portal/dashboard')
      window.location.href = '/lers/portal/dashboard'

    } catch (error: any) {
      console.error('❌ LERS PORTAL LOGIN FAILED:', error)
      const errorMsg = error?.response?.data?.detail || 'Login failed. Please check your credentials.'
      setError(errorMsg)
      toast.error(errorMsg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md shadow-lg border-0">
        <CardHeader className="text-center pb-2">
          <div className="flex items-center justify-center mb-4">
            <div className="p-3 bg-slate-100 rounded-full">
              <FileText className="h-8 w-8 text-slate-700" />
            </div>
          </div>
          <CardTitle className="text-2xl font-bold text-gray-900">
            LERS Portal
          </CardTitle>
          <p className="text-gray-600 mt-2">
            Law Enforcement Request System
          </p>
        </CardHeader>

        <CardContent className="space-y-6">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email Address</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  id="email"
                  type="email"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-10"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10 pr-10"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-3 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              className="w-full bg-slate-700 hover:bg-slate-800 text-white"
              disabled={loading}
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Signing in...
                </>
              ) : (
                'Sign In'
              )}
            </Button>
          </form>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-white text-gray-500">
                Are you a service provider?
              </span>
            </div>
          </div>

          <Button
            type="button"
            variant="outline"
            onClick={() => navigate('/lers/provider/login')}
            className="w-full text-gray-700"
          >
            Login to Provider Portal
          </Button>

          <div className="text-center text-sm text-gray-600 border-t pt-4">
            <p className="font-medium mb-2">Demo Credentials:</p>
            <div className="space-y-1 text-xs">
              <p><strong>Email:</strong> io@sample.police.gov.in</p>
              <p><strong>Password:</strong> TestPass123</p>
            </div>
            <p className="text-xs text-gray-500 mt-3">Law Enforcement Portal</p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
