/**
 * Notification Dropdown Component
 * Displays list of notifications with actions
 */
import React, { useEffect, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { lersService } from '../../services/lersService'
import { useNavigate } from 'react-router-dom'
import { 
  Bell, 
  CheckCheck, 
  X, 
  AlertCircle, 
  Info, 
  MessageCircle,
  FileCheck,
  Clock,
  TrendingUp
} from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { toast } from 'sonner'

interface NotificationDropdownProps {
  isOpen: boolean
  onClose: () => void
  onMarkAllRead: () => void
}

interface Notification {
  id: string
  type: string
  type_display: string
  title: string
  message: string
  icon: string
  link: string
  priority: 'NORMAL' | 'HIGH' | 'URGENT'
  priority_display: string
  request_id: string | null
  request_number: string | null
  created_at: string
  read: boolean
}

const NotificationDropdown: React.FC<NotificationDropdownProps> = ({
  isOpen,
  onClose,
  onMarkAllRead,
}) => {
  const dropdownRef = useRef<HTMLDivElement>(null)
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  // Fetch notifications
  const { data, isLoading } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => lersService.getNotifications({ page_size: 20 }),
    enabled: isOpen,
  })

  const notifications: Notification[] = data?.notifications || []
  const unreadCount = notifications.filter(n => !n.read).length

  // Mark notification as read mutation
  const markReadMutation = useMutation({
    mutationFn: (notificationId: string) => lersService.markNotificationRead(notificationId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
      queryClient.invalidateQueries({ queryKey: ['notifications', 'unread-count'] })
    },
  })

  // Mark all as read mutation
  const markAllReadMutation = useMutation({
    mutationFn: () => lersService.markAllNotificationsRead(),
    onSuccess: () => {
      toast.success('All notifications marked as read')
      onMarkAllRead()
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
      queryClient.invalidateQueries({ queryKey: ['notifications', 'unread-count'] })
    },
  })

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        onClose()
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen, onClose])

  const handleNotificationClick = (notification: Notification) => {
    // Mark as read
    if (!notification.read) {
      markReadMutation.mutate(notification.id)
    }

    // Navigate to link
    if (notification.link) {
      navigate(notification.link)
      onClose()
    }
  }

  const handleMarkAllRead = () => {
    if (unreadCount > 0) {
      markAllReadMutation.mutate()
    }
  }

  const getNotificationIcon = (type: string, priority: string) => {
    if (priority === 'URGENT') return <AlertCircle className="w-5 h-5 text-red-500" />
    if (priority === 'HIGH') return <TrendingUp className="w-5 h-5 text-orange-500" />
    
    switch (type) {
      case 'NEW_MESSAGE':
        return <MessageCircle className="w-5 h-5 text-blue-500" />
      case 'RESPONSE_RECEIVED':
        return <FileCheck className="w-5 h-5 text-green-500" />
      case 'APPROVAL_NEEDED':
        return <Clock className="w-5 h-5 text-yellow-500" />
      case 'REQUEST_APPROVED':
        return <CheckCheck className="w-5 h-5 text-green-500" />
      case 'REQUEST_REJECTED':
        return <X className="w-5 h-5 text-red-500" />
      default:
        return <Info className="w-5 h-5 text-blue-500" />
    }
  }

  const getPriorityStyles = (priority: string) => {
    switch (priority) {
      case 'URGENT':
        return 'border-l-4 border-red-500 bg-red-500/5'
      case 'HIGH':
        return 'border-l-4 border-orange-500 bg-orange-500/5'
      default:
        return 'border-l-4 border-transparent'
    }
  }

  if (!isOpen) return null

  return (
    <div
      ref={dropdownRef}
      className="absolute right-0 top-full mt-2 w-96 bg-slate-800 border border-slate-700 rounded-lg shadow-2xl z-50 max-h-[600px] flex flex-col"
      style={{
        backdropFilter: 'blur(16px)',
        backgroundColor: 'rgba(30, 41, 59, 0.98)',
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-slate-700">
        <div className="flex items-center gap-2">
          <Bell className="w-5 h-5 text-slate-300" />
          <h3 className="font-semibold text-white">Notifications</h3>
          {unreadCount > 0 && (
            <span className="px-2 py-0.5 text-xs font-bold text-white bg-red-500 rounded-full">
              {unreadCount}
            </span>
          )}
        </div>
        
        <div className="flex items-center gap-2">
          {unreadCount > 0 && (
            <button
              onClick={handleMarkAllRead}
              disabled={markAllReadMutation.isPending}
              className="text-xs text-blue-400 hover:text-blue-300 transition-colors disabled:opacity-50"
            >
              Mark all read
            </button>
          )}
          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-slate-700 transition-colors"
          >
            <X className="w-4 h-4 text-slate-400" />
          </button>
        </div>
      </div>

      {/* Notifications List */}
      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
          </div>
        ) : notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
            <Bell className="w-12 h-12 text-slate-600 mb-3" />
            <p className="text-slate-400 font-medium">No notifications</p>
            <p className="text-slate-500 text-sm mt-1">You're all caught up!</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-700/50">
            {notifications.map((notification) => (
              <div
                key={notification.id}
                onClick={() => handleNotificationClick(notification)}
                className={`
                  p-4 cursor-pointer transition-all duration-200
                  hover:bg-slate-700/30
                  ${!notification.read ? 'bg-slate-700/20' : ''}
                  ${getPriorityStyles(notification.priority)}
                `}
              >
                <div className="flex items-start gap-3">
                  {/* Icon */}
                  <div className="flex-shrink-0 mt-0.5">
                    {getNotificationIcon(notification.type, notification.priority)}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <h4 className={`text-sm font-medium ${!notification.read ? 'text-white' : 'text-slate-300'}`}>
                        {notification.title}
                      </h4>
                      {!notification.read && (
                        <div className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0 mt-1" />
                      )}
                    </div>
                    
                    <p className="text-sm text-slate-400 mt-1 line-clamp-2">
                      {notification.message}
                    </p>
                    
                    {notification.request_number && (
                      <p className="text-xs text-slate-500 mt-1">
                        Request: {notification.request_number}
                      </p>
                    )}
                    
                    <p className="text-xs text-slate-500 mt-2">
                      {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      {notifications.length > 0 && (
        <div className="p-3 border-t border-slate-700 text-center">
          <button
            onClick={() => {
              navigate('/notifications')
              onClose()
            }}
            className="text-sm text-blue-400 hover:text-blue-300 transition-colors font-medium"
          >
            View all notifications
          </button>
        </div>
      )}
    </div>
  )
}

export default NotificationDropdown

