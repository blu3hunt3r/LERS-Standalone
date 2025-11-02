/**
 * Notification Bell Component
 * Shows unread notification count and opens notification dropdown
 */
import React, { useState, useEffect } from 'react'
import { Bell } from 'lucide-react'
import { useSocket, useNotificationListener } from '../../hooks/useSocket'
import { lersService } from '../../services/lersService'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import NotificationDropdown from './NotificationDropdown'

const NotificationBell: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false)
  const [localUnreadCount, setLocalUnreadCount] = useState(0)
  const queryClient = useQueryClient()
  const { connected } = useSocket()

  // Fetch unread count from API
  const { data: unreadCount = 0 } = useQuery({
    queryKey: ['notifications', 'unread-count'],
    queryFn: () => lersService.getUnreadNotificationCount(),
    refetchInterval: 30000, // Refetch every 30 seconds as fallback
    enabled: connected,
  })

  // Sync local count with API count
  useEffect(() => {
    setLocalUnreadCount(unreadCount)
  }, [unreadCount])

  // Listen for real-time notifications via WebSocket
  useNotificationListener((notification) => {
    console.log('🔔 New notification received in bell:', notification)
    
    // Increment local count
    setLocalUnreadCount(prev => prev + 1)
    
    // Invalidate queries to refresh notification list
    queryClient.invalidateQueries({ queryKey: ['notifications'] })
    queryClient.invalidateQueries({ queryKey: ['notifications', 'unread-count'] })
    
    // Play notification sound
    playNotificationSound()
    
    // Show browser notification if permitted
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(notification.title, {
        body: notification.message,
        icon: '/favicon.ico',
        badge: '/favicon.ico',
        tag: notification.id,
      })
    }
  })

  // Request browser notification permission on mount
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission()
    }
  }, [])

  const playNotificationSound = () => {
    // Create a simple notification sound using Web Audio API
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
    const oscillator = audioContext.createOscillator()
    const gainNode = audioContext.createGain()
    
    oscillator.connect(gainNode)
    gainNode.connect(audioContext.destination)
    
    oscillator.frequency.value = 800
    oscillator.type = 'sine'
    
    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime)
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5)
    
    oscillator.start(audioContext.currentTime)
    oscillator.stop(audioContext.currentTime + 0.5)
  }

  const handleBellClick = () => {
    setIsOpen(!isOpen)
  }

  const handleClose = () => {
    setIsOpen(false)
  }

  const handleMarkAllRead = () => {
    setLocalUnreadCount(0)
    queryClient.invalidateQueries({ queryKey: ['notifications', 'unread-count'] })
  }

  return (
    <div className="relative">
      {/* Bell Button */}
      <button
        onClick={handleBellClick}
        className="relative p-2 rounded-lg hover:bg-slate-700/50 transition-colors duration-200"
        aria-label="Notifications"
      >
        <Bell className="w-5 h-5 text-slate-300" />
        
        {/* Badge */}
        {localUnreadCount > 0 && (
          <span className="absolute -top-1 -right-1 flex items-center justify-center min-w-[20px] h-5 px-1.5 text-xs font-bold text-white bg-red-500 rounded-full animate-pulse">
            {localUnreadCount > 99 ? '99+' : localUnreadCount}
          </span>
        )}
        
        {/* Connection Status Indicator */}
        {!connected && (
          <span className="absolute bottom-0 right-0 w-2 h-2 bg-yellow-500 rounded-full border border-slate-800" />
        )}
      </button>

      {/* Dropdown */}
      {isOpen && (
        <NotificationDropdown
          isOpen={isOpen}
          onClose={handleClose}
          onMarkAllRead={handleMarkAllRead}
        />
      )}
    </div>
  )
}

export default NotificationBell



