/**
 * Provider Portal Layout
 * 
 * Layout specifically for data providers (banks, telecoms, payment companies)
 * to view and respond to LERS requests from law enforcement.
 */

import React, { useState } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import {
  Inbox,
  FileText,
  Upload,
  BarChart3,
  Settings,
  LogOut,
  Bell,
  Menu,
  X,
  Shield,
  Clock,
  CheckCircle,
} from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import NotificationBell from '@/components/lers/NotificationBell';

interface NavItem {
  path: string;
  label: string;
  icon: React.ReactNode;
  badge?: number;
}

const ProviderPortalLayout: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();
  const [sidebarOpen, setSidebarOpen] = useState(true);

  // Navigation items for provider portal
  const navItems: NavItem[] = [
    {
      path: '/provider/inbox',
      label: 'Incoming Requests',
      icon: <Inbox className="w-5 h-5" />,
      badge: 12, // TODO: Get from API
    },
    {
      path: '/provider/in-progress',
      label: 'In Progress',
      icon: <Clock className="w-5 h-5" />,
      badge: 5,
    },
    {
      path: '/provider/completed',
      label: 'Completed',
      icon: <CheckCircle className="w-5 h-5" />,
    },
    {
      path: '/provider/dashboard',
      label: 'Dashboard',
      icon: <BarChart3 className="w-5 h-5" />,
    },
    {
      path: '/provider/upload',
      label: 'Upload Response',
      icon: <Upload className="w-5 h-5" />,
    },
    {
      path: '/provider/templates',
      label: 'Response Templates',
      icon: <FileText className="w-5 h-5" />,
    },
  ];

  const isActive = (path: string) => location.pathname.startsWith(path);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-slate-900 flex">
      {/* Sidebar */}
      <aside
        className={`${
          sidebarOpen ? 'w-64' : 'w-20'
        } bg-slate-800 border-r border-slate-700 flex flex-col transition-all duration-300 fixed left-0 top-0 h-full z-40`}
      >
        {/* Logo/Header */}
        <div className="h-16 border-b border-slate-700 flex items-center justify-between px-4">
          {sidebarOpen ? (
            <>
              <div className="flex items-center gap-2">
                <Shield className="w-6 h-6 text-blue-400" />
                <span className="text-lg font-bold text-slate-100">Provider Portal</span>
              </div>
              <button
                onClick={() => setSidebarOpen(false)}
                className="text-slate-400 hover:text-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </>
          ) : (
            <button
              onClick={() => setSidebarOpen(true)}
              className="text-slate-400 hover:text-slate-200 mx-auto"
            >
              <Menu className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 py-4 overflow-y-auto">
          <ul className="space-y-1 px-2">
            {navItems.map((item) => (
              <li key={item.path}>
                <Link
                  to={item.path}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${
                    isActive(item.path)
                      ? 'bg-blue-600 text-white'
                      : 'text-slate-300 hover:bg-slate-700 hover:text-white'
                  }`}
                  title={!sidebarOpen ? item.label : undefined}
                >
                  {item.icon}
                  {sidebarOpen && (
                    <>
                      <span className="flex-1 text-sm font-medium">{item.label}</span>
                      {item.badge && item.badge > 0 && (
                        <span className="bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                          {item.badge}
                        </span>
                      )}
                    </>
                  )}
                  {!sidebarOpen && item.badge && item.badge > 0 && (
                    <span className="absolute left-12 top-1 bg-red-500 text-white text-xs font-bold w-5 h-5 flex items-center justify-center rounded-full">
                      {item.badge}
                    </span>
                  )}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        {/* User Section */}
        <div className="border-t border-slate-700 p-4">
          {sidebarOpen ? (
            <>
              <div className="mb-3">
                <div className="text-sm font-semibold text-slate-200 truncate">
                  {user?.tenant?.name || 'Provider Organization'}
                </div>
                <div className="text-xs text-slate-400 truncate">{user?.email}</div>
              </div>
              <div className="flex gap-2">
                <Link
                  to="/provider/settings"
                  className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-sm text-slate-200 transition-colors"
                >
                  <Settings className="w-4 h-4" />
                  <span>Settings</span>
                </Link>
                <button
                  onClick={handleLogout}
                  className="flex items-center justify-center px-3 py-2 bg-red-600 hover:bg-red-700 rounded-lg text-sm text-white transition-colors"
                  title="Logout"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            </>
          ) : (
            <div className="flex flex-col gap-2 items-center">
              <Link
                to="/provider/settings"
                className="w-10 h-10 flex items-center justify-center bg-slate-700 hover:bg-slate-600 rounded-lg text-slate-200 transition-colors"
                title="Settings"
              >
                <Settings className="w-5 h-5" />
              </Link>
              <button
                onClick={handleLogout}
                className="w-10 h-10 flex items-center justify-center bg-red-600 hover:bg-red-700 rounded-lg text-white transition-colors"
                title="Logout"
              >
                <LogOut className="w-5 h-5" />
              </button>
            </div>
          )}
        </div>
      </aside>

      {/* Main Content */}
      <div className={`flex-1 ${sidebarOpen ? 'ml-64' : 'ml-20'} transition-all duration-300`}>
        {/* Top Bar */}
        <header className="h-16 bg-slate-800 border-b border-slate-700 flex items-center justify-between px-6">
          <div>
            <h1 className="text-xl font-semibold text-slate-100">
              {navItems.find((item) => isActive(item.path))?.label || 'Provider Portal'}
            </h1>
            <p className="text-xs text-slate-400 mt-0.5">
              Law Enforcement Request System - Provider Interface
            </p>
          </div>

          <div className="flex items-center gap-4">
            {/* Notification Bell */}
            <NotificationBell />

            {/* User Avatar */}
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white font-semibold text-sm">
                {user?.email?.charAt(0).toUpperCase()}
              </div>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default ProviderPortalLayout;

