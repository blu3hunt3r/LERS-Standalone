/**
 * Provider Portal Login - Clean consistent design matching CMS
 */

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, Building2, Lock, Mail, Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useAuthStore } from '@/stores/authStore';
import { authService } from '@/services/authService';
import { toast } from 'react-toastify';

export default function ProviderLoginPage() {
  const navigate = useNavigate();
  const { setUser, setTokens } = useAuthStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    console.log('==== PROVIDER LOGIN ATTEMPT ====');
    console.log('Email:', email);
    console.log('Timestamp:', new Date().toISOString());

    try {
      console.log('Calling API: POST /api/v1/auth/login/');
      const response = await authService.login({ email, password });
      
      console.log('API Response:', {
        user: response.user?.email,
        role: response.user?.role,
        hasTokens: !!response.tokens
      });

      // Verify this is a provider account
      if (response.user?.role !== 'COMPANY_AGENT') {
        setError('This login page is for Data Providers only. Police officers should use the CMS Portal.');
        setIsLoading(false);
        return;
      }

      const accessToken = response.tokens?.access || response.access;
      const refreshToken = response.tokens?.refresh || response.refresh;

      if (!accessToken) {
        throw new Error('No access token received');
      }

      // Save tokens to localStorage and Zustand store
      localStorage.setItem('access_token', accessToken);
      localStorage.setItem('refresh_token', refreshToken || '');
      setTokens(accessToken, refreshToken || '');
      setUser(response.user);
      
      console.log('✅ Provider login successful, redirecting to /lers/provider/dashboard');
      toast.success('Login successful!');

      // Small delay to ensure state is saved
      await new Promise(resolve => setTimeout(resolve, 50));

      // Use window.location for a clean navigation
      window.location.href = '/lers/provider/dashboard';
      
    } catch (err: any) {
      console.error('❌ PROVIDER LOGIN FAILED:', err);
      const errorMsg = err.response?.data?.detail || err.response?.data?.message || 'Invalid email or password';
      setError(errorMsg);
      toast.error(errorMsg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md shadow-lg border-0">
        <CardHeader className="text-center pb-2">
          <div className="flex items-center justify-center mb-4">
            <div className="p-3 bg-slate-100 rounded-full">
              <Building2 className="h-8 w-8 text-slate-700" />
            </div>
          </div>
          <CardTitle className="text-2xl font-bold text-gray-900">
            Provider Portal
          </CardTitle>
          <p className="text-gray-600 mt-2">
            Sign in to manage LERS requests
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
              <label htmlFor="email" className="text-sm font-medium text-gray-700">
                Company Email Address
              </label>
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
                  autoComplete="email"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label htmlFor="password" className="text-sm font-medium text-gray-700">
                Password
              </label>
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
                  autoComplete="current-password"
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
              disabled={isLoading}
            >
              {isLoading ? (
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
              <p><strong>Provider:</strong> nodal.officer@airtel.com</p>
              <p><strong>Password:</strong> AirtelPass123</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
