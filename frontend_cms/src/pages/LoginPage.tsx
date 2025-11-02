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
import { Shield, Mail, Lock, Eye, EyeOff, Building2 } from 'lucide-react'

export default function LoginPage() {
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

    console.log('==== LOGIN ATTEMPT STARTED ====')
    console.log('Email:', email)
    console.log('Timestamp:', new Date().toISOString())

    try {
      console.log('1. Calling API: POST /api/v1/auth/login/')
      const response = await authService.login({ email, password })
      console.log('2. API Response received:', {
        user: response.user?.email,
        hasTokens: !!response.tokens,
        hasAccess: !!(response.tokens?.access || response.access),
        hasRefresh: !!(response.tokens?.refresh || response.refresh)
      })
      
      // Extract tokens from nested structure
      const accessToken = response.tokens?.access || response.access
      const refreshToken = response.tokens?.refresh || response.refresh
      
      console.log('3. Token extraction:', {
        accessToken: accessToken ? `${accessToken.substring(0, 20)}...` : 'MISSING',
        refreshToken: refreshToken ? `${refreshToken.substring(0, 20)}...` : 'MISSING'
      })
      
      if (!accessToken || !refreshToken) {
        console.error('❌ CRITICAL: Tokens missing from response!')
        console.error('Full response:', response)
        toast.error('Login failed: Invalid response from server')
        return
      }
      
      console.log('4. Saving to localStorage...')
      localStorage.setItem('access_token', accessToken)
      localStorage.setItem('refresh_token', refreshToken)
      console.log('5. localStorage write complete')
      
      // Verify localStorage
      const savedToken = localStorage.getItem('access_token')
      console.log('6. Verification - token in localStorage:', savedToken ? `${savedToken.substring(0, 20)}...` : 'NOT FOUND ❌')
      
      console.log('7. Updating Zustand store...')
      setTokens(accessToken, refreshToken)
      setUser(response.user)
      console.log('8. Zustand store updated')
      
      toast.success('Login successful!')
      
      console.log('9. Waiting 50ms for writes to complete...')
      await new Promise(resolve => setTimeout(resolve, 50))
      
      console.log('10. Reloading page to dashboard...')
      console.log('==== LOGIN COMPLETE - RELOADING ====')
      window.location.href = '/dashboard'
    } catch (error: any) {
      console.error('❌ LOGIN FAILED:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
        full: error
      })
      const errorMsg = error?.response?.data?.detail || 'Login failed. Please check your credentials.'
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
              <Shield className="h-8 w-8 text-slate-700" />
            </div>
          </div>
          <CardTitle className="text-2xl font-bold text-gray-900">
            Welcome Back
          </CardTitle>
          <p className="text-gray-600 mt-2">
            Sign in to access the Cyber Crime Investigation Platform
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

          <div className="text-center text-sm text-gray-600 border-t pt-4">
            <p className="font-medium mb-2">Demo Credentials:</p>
            <div className="space-y-1">
              <p><strong>IO:</strong> io@station001.police.in</p>
              <p><strong>Approver:</strong> sp@station001.police.in</p>
              <p><strong>Password:</strong> TestPass123</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

