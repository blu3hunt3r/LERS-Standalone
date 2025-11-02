import { Outlet, useNavigate, useLocation } from 'react-router-dom'
import { useAuthStore } from '../stores/authStore'
import { authService } from '../services/authService'
import { Button } from '../components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../components/ui/dropdown-menu'
import { Avatar, AvatarFallback } from '../components/ui/avatar'
import NotificationBell from '../components/lers/NotificationBell'
import {
  LayoutDashboard,
  FolderOpen,
  User,
  LogOut,
  Shield,
  Settings,
  FileText,
} from 'lucide-react'

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Cases', href: '/cases', icon: FolderOpen },
  { name: 'LERS Requests', href: '/lers/standalone/create', icon: FileText },
]

export default function MainLayout() {
  const { user, logout } = useAuthStore()
  const navigate = useNavigate()
  const location = useLocation()

  const handleLogout = async () => {
    await authService.logout()
    logout()
    navigate('/login')
  }

  const isActivePath = (href: string) => {
    return location.pathname.startsWith(href)
  }

  return (
    <div className="min-h-screen bg-[#F7F8FA]">
      {/* Horizontal Navigation Header */}
      <header className="sticky top-0 z-50 bg-white border-b border-slate-200">
        <div className="flex h-16 items-center justify-between px-6">
          {/* Left: Logo + Navigation */}
          <div className="flex items-center gap-8">
            {/* Logo */}
            <div className="flex items-center gap-2">
              <Shield className="h-7 w-7 text-slate-700" />
              <span className="text-lg font-bold text-slate-900">CMS Portal</span>
            </div>

            {/* Horizontal Nav Pills */}
            <nav className="hidden md:flex items-center gap-1">
              {navigation.map((item) => {
                const isActive = isActivePath(item.href)
                return (
                  <button
                    key={item.name}
                    onClick={() => navigate(item.href)}
                    className={`
                      flex items-center gap-2 px-4 py-2 rounded-full text-sm transition-all
                      ${isActive
                        ? 'font-semibold text-slate-900 bg-slate-50'
                        : 'font-normal text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                      }
                    `}
                  >
                    <item.icon className="h-4 w-4" />
                    {item.name}
                  </button>
                )
              })}
            </nav>
          </div>

          {/* Right: Notifications + Settings + Profile */}
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
                      {user?.full_name?.charAt(0) || 'U'}
                    </AvatarFallback>
                  </Avatar>
                  <div className="hidden lg:flex flex-col items-start">
                    <span className="text-sm font-medium text-slate-900">{user?.full_name}</span>
                    <span className="text-xs text-slate-500">{user?.role_display}</span>
                  </div>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium leading-none">{user?.full_name}</p>
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
                  Log out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      {/* Main Content - Left Aligned */}
      <main className="min-h-[calc(100vh-4rem)]">
        <Outlet />
      </main>
    </div>
  )
}

