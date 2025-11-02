/**
 * Provider Portal Layout - Clean CMS-style navigation
 */

import React from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Inbox,
  BarChart3,
  Settings,
  LogOut,
  Clock,
  CheckCircle,
  User,
  Building2,
} from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import { authService } from '@/services/authService';
import { lersService } from '@/services/lersService';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import NotificationBell from '@/components/lers/NotificationBell';

export default function ProviderPortalLayout() {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();

  // Fetch real counts from backend
  const { data } = useQuery({
    queryKey: ['provider-lers-counts'],
    queryFn: async () => {
      const response = await lersService.getRequests({});
      const requests = response?.results || [];
      return {
        inbox: requests.filter((r: any) => r.status === 'SUBMITTED' || r.status === 'APPROVED').length,
        inProgress: requests.filter((r: any) => r.status === 'IN_PROGRESS').length,
        completed: requests.filter((r: any) => r.status === 'RESPONSE_UPLOADED').length,
      };
    },
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  const navigation = [
    { name: 'Dashboard', href: '/lers/provider/dashboard', icon: BarChart3 },
    { name: 'Inbox', href: '/lers/provider/inbox', icon: Inbox, count: data?.inbox || 0 },
    { name: 'In Progress', href: '/lers/provider/in-progress', icon: Clock, count: data?.inProgress || 0 },
    { name: 'Completed', href: '/lers/provider/completed', icon: CheckCircle, count: data?.completed || 0 },
  ];

  const handleLogout = async () => {
    await authService.logout();
    logout();
    navigate('/lers/provider/login');
  };

  const isActivePath = (href: string) => {
    return location.pathname.startsWith(href);
  };

  return (
    <div className="min-h-screen bg-[#F7F8FA]">
      {/* Horizontal Navigation Header - CLEAN CMS STYLE */}
      <header className="sticky top-0 z-50 bg-white border-b border-slate-200">
        <div className="flex h-16 items-center justify-between px-6">
          {/* Left: Logo + Navigation */}
          <div className="flex items-center gap-8">
            {/* Logo - Provider Branded but subtle */}
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-slate-100 flex items-center justify-center">
                <Building2 className="h-5 w-5 text-slate-700" />
              </div>
              <div className="flex flex-col">
                <span className="text-base font-bold text-slate-900">Provider Portal</span>
                <span className="text-[10px] text-slate-600 -mt-0.5">LERS System</span>
              </div>
            </div>

            {/* Horizontal Nav Pills - CLEAN CMS STYLE */}
            <nav className="hidden md:flex items-center gap-1">
              {navigation.map((item) => {
                const isActive = isActivePath(item.href);
                return (
                  <button
                    key={item.name}
                    onClick={() => navigate(item.href)}
                    className={`
                      flex items-center gap-2 px-4 py-2 rounded-full text-sm transition-all
                      ${isActive
                        ? 'font-semibold text-slate-900 bg-slate-100'
                        : 'font-normal text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                      }
                    `}
                  >
                    <item.icon className="h-4 w-4" />
                    {item.name}
                    {item.count !== undefined && item.count > 0 && (
                      <span className="ml-1 text-xs text-slate-500">
                        ({item.count})
                      </span>
                    )}
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Right: Notifications + Settings + Profile - CMS STYLE */}
          <div className="flex items-center gap-3">
            {/* LERS Notifications */}
            <NotificationBell />

            {/* Settings */}
            <Button variant="ghost" size="icon">
              <Settings className="h-5 w-5 text-slate-600" />
            </Button>

            {/* Profile Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="flex items-center gap-2 h-10">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="bg-slate-100 text-slate-700 text-sm font-semibold">
                      {user?.full_name?.charAt(0) || user?.email?.charAt(0) || 'P'}
                    </AvatarFallback>
                  </Avatar>
                  <div className="hidden lg:flex flex-col items-start">
                    <span className="text-sm font-medium text-slate-900">{user?.full_name || 'Provider User'}</span>
                    <span className="text-xs text-slate-500">{user?.tenant_name || 'Provider'}</span>
                  </div>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium leading-none">{user?.full_name || 'Provider User'}</p>
                    <p className="text-xs leading-none text-slate-500">{user?.email}</p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem>
                  <User className="mr-2 h-4 w-4" />
                  Profile
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <Settings className="mr-2 h-4 w-4" />
                  Settings
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout} className="text-red-600">
                  <LogOut className="mr-2 h-4 w-4" />
                  Logout
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1">
        <Outlet />
      </main>
    </div>
  );
}
