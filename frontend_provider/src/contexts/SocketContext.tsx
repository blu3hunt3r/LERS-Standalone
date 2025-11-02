/**
 * Socket.IO Context for Real-Time LERS Communication
 * Provides WebSocket connection management and event handling
 */
import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react'
import { io, Socket } from 'socket.io-client'
import { useAuthStore } from '../stores/authStore'
import { toast } from 'sonner'

// ═══════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════

export interface LERSMessage {
  id: string
  request_id: string
  request_number: string
  sender_id: string | null
  sender_name: string
  sender_email: string | null
  sender_type: 'IO' | 'PROVIDER' | 'SYSTEM'
  message_type: 'TEXT' | 'FILE' | 'SYSTEM'
  message_text: string
  attachments: Array<{url: string; filename: string; size?: number; type?: string}>
  created_at: string
  metadata: Record<string, any>
}

export interface LERSNotification {
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
}

export interface UserPresence {
  user_id: string
  user_email: string
  user_name: string
  status: 'ONLINE' | 'AWAY' | 'OFFLINE'
}

export interface TypingUser {
  user_id: string
  user_name: string
  request_id: string
  is_typing: boolean
}

interface SocketContextValue {
  socket: Socket | null
  connected: boolean
  
  // Chat methods
  joinChat: (requestId: string) => void
  leaveChat: (requestId: string) => void
  sendMessage: (requestId: string, messageId: string) => void
  sendTyping: (requestId: string, isTyping: boolean) => void
  
  // Presence methods
  updatePresence: (status: 'ONLINE' | 'AWAY' | 'OFFLINE') => void
  
  // Event listeners
  onNewMessage: (callback: (message: LERSMessage) => void) => () => void
  onNewNotification: (callback: (notification: LERSNotification) => void) => () => void
  onUserTyping: (callback: (typing: TypingUser) => void) => () => void
  onPresenceUpdate: (callback: (presence: UserPresence) => void) => () => void
  onUserOnline: (callback: (presence: UserPresence) => void) => () => void
  onUserOffline: (callback: (presence: UserPresence) => void) => () => void
  
  // State
  typingUsers: Map<string, TypingUser>
  unreadCount: number
}

// ═══════════════════════════════════════════════════════════════════
// CONTEXT
// ═══════════════════════════════════════════════════════════════════

const SocketContext = createContext<SocketContextValue | null>(null)

export const useSocket = () => {
  const context = useContext(SocketContext)
  if (!context) {
    throw new Error('useSocket must be used within SocketProvider')
  }
  return context
}

// ═══════════════════════════════════════════════════════════════════
// PROVIDER
// ═══════════════════════════════════════════════════════════════════

interface SocketProviderProps {
  children: React.ReactNode
}

export const SocketProvider: React.FC<SocketProviderProps> = ({ children }) => {
  const { isAuthenticated } = useAuthStore()
  const token = localStorage.getItem('access_token')
  const [socket, setSocket] = useState<Socket | null>(null)
  const [connected, setConnected] = useState(false)
  const [typingUsers, setTypingUsers] = useState<Map<string, TypingUser>>(new Map())
  const [unreadCount, setUnreadCount] = useState(0)
  
  // Event handler refs to avoid stale closures
  const messageHandlers = useRef<Set<(message: LERSMessage) => void>>(new Set())
  const notificationHandlers = useRef<Set<(notification: LERSNotification) => void>>(new Set())
  const typingHandlers = useRef<Set<(typing: TypingUser) => void>>(new Set())
  const presenceHandlers = useRef<Set<(presence: UserPresence) => void>>(new Set())
  const userOnlineHandlers = useRef<Set<(presence: UserPresence) => void>>(new Set())
  const userOfflineHandlers = useRef<Set<(presence: UserPresence) => void>>(new Set())

  // ═══════════════════════════════════════════════════════════════════
  // SOCKET CONNECTION
  // ═══════════════════════════════════════════════════════════════════

  useEffect(() => {
    if (!isAuthenticated || !token) {
      // Disconnect if user logs out
      if (socket) {
        console.log('🔌 Disconnecting socket (user logged out)')
        socket.disconnect()
        setSocket(null)
        setConnected(false)
      }
      return
    }

    // Connect to Socket.IO server
    const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:8002'
    
    console.log('🔌 Connecting to Socket.IO:', SOCKET_URL)
    
    const newSocket = io(SOCKET_URL, {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: 5,
    })

    // Connection events
    newSocket.on('connect', () => {
      console.log('✅ Socket connected:', newSocket.id)
      setConnected(true)
      toast.success('Connected to real-time server', { duration: 2000 })
    })

    newSocket.on('disconnect', (reason) => {
      console.log('🔌 Socket disconnected:', reason)
      setConnected(false)
      if (reason === 'io server disconnect') {
        // Server disconnected, try reconnecting
        newSocket.connect()
      }
    })

    newSocket.on('connect_error', (error) => {
      console.error('❌ Socket connection error:', error)
      setConnected(false)
    })

    // Message events
    newSocket.on('new_message', (message: LERSMessage) => {
      console.log('📨 New message received:', message)
      messageHandlers.current.forEach(handler => handler(message))
    })

    // Notification events
    newSocket.on('new_notification', (notification: LERSNotification) => {
      console.log('🔔 New notification received:', notification)
      setUnreadCount(prev => prev + 1)
      notificationHandlers.current.forEach(handler => handler(notification))
      
      // Show toast for high priority notifications
      if (notification.priority === 'HIGH' || notification.priority === 'URGENT') {
        toast(notification.message, {
          icon: notification.priority === 'URGENT' ? '🚨' : '⚠️',
          duration: 5000,
        })
      }
    })

    // Typing events
    newSocket.on('user_typing', (data: TypingUser) => {
      console.log('✍️ User typing:', data)
      
      setTypingUsers(prev => {
        const newMap = new Map(prev)
        const key = `${data.request_id}_${data.user_id}`
        
        if (data.is_typing) {
          newMap.set(key, data)
        } else {
          newMap.delete(key)
        }
        
        return newMap
      })
      
      typingHandlers.current.forEach(handler => handler(data))
    })

    // Presence events
    newSocket.on('presence_updated', (presence: UserPresence) => {
      console.log('👤 Presence updated:', presence)
      presenceHandlers.current.forEach(handler => handler(presence))
    })

    newSocket.on('user_online', (presence: UserPresence) => {
      console.log('✅ User online:', presence.user_name)
      userOnlineHandlers.current.forEach(handler => handler(presence))
    })

    newSocket.on('user_offline', (presence: UserPresence) => {
      console.log('⭕ User offline:', presence.user_name)
      userOfflineHandlers.current.forEach(handler => handler(presence))
    })

    // Error events
    newSocket.on('error', (error: { message: string }) => {
      console.error('❌ Socket error:', error)
      toast.error(error.message)
    })

    setSocket(newSocket)

    // Cleanup on unmount
    return () => {
      console.log('🔌 Cleaning up socket connection')
      newSocket.disconnect()
      setSocket(null)
      setConnected(false)
    }
  }, [isAuthenticated, token])

  // ═══════════════════════════════════════════════════════════════════
  // CHAT METHODS
  // ═══════════════════════════════════════════════════════════════════

  const joinChat = useCallback((requestId: string) => {
    if (socket && connected) {
      console.log('🚪 Joining chat:', requestId)
      socket.emit('join_chat', { request_id: requestId })
    }
  }, [socket, connected])

  const leaveChat = useCallback((requestId: string) => {
    if (socket && connected) {
      console.log('🚪 Leaving chat:', requestId)
      socket.emit('leave_chat', { request_id: requestId })
    }
  }, [socket, connected])

  const sendMessage = useCallback((requestId: string, messageId: string) => {
    if (socket && connected) {
      console.log('📤 Broadcasting message:', messageId)
      socket.emit('send_message', {
        request_id: requestId,
        message_id: messageId
      })
    }
  }, [socket, connected])

  const sendTyping = useCallback((requestId: string, isTyping: boolean) => {
    if (socket && connected) {
      socket.emit('typing', {
        request_id: requestId,
        is_typing: isTyping
      })
    }
  }, [socket, connected])

  // ═══════════════════════════════════════════════════════════════════
  // PRESENCE METHODS
  // ═══════════════════════════════════════════════════════════════════

  const updatePresence = useCallback((status: 'ONLINE' | 'AWAY' | 'OFFLINE') => {
    if (socket && connected) {
      console.log('👤 Updating presence:', status)
      socket.emit('update_presence', { status })
    }
  }, [socket, connected])

  // ═══════════════════════════════════════════════════════════════════
  // EVENT LISTENERS
  // ═══════════════════════════════════════════════════════════════════

  const onNewMessage = useCallback((callback: (message: LERSMessage) => void) => {
    messageHandlers.current.add(callback)
    return () => {
      messageHandlers.current.delete(callback)
    }
  }, [])

  const onNewNotification = useCallback((callback: (notification: LERSNotification) => void) => {
    notificationHandlers.current.add(callback)
    return () => {
      notificationHandlers.current.delete(callback)
    }
  }, [])

  const onUserTyping = useCallback((callback: (typing: TypingUser) => void) => {
    typingHandlers.current.add(callback)
    return () => {
      typingHandlers.current.delete(callback)
    }
  }, [])

  const onPresenceUpdate = useCallback((callback: (presence: UserPresence) => void) => {
    presenceHandlers.current.add(callback)
    return () => {
      presenceHandlers.current.delete(callback)
    }
  }, [])

  const onUserOnline = useCallback((callback: (presence: UserPresence) => void) => {
    userOnlineHandlers.current.add(callback)
    return () => {
      userOnlineHandlers.current.delete(callback)
    }
  }, [])

  const onUserOffline = useCallback((callback: (presence: UserPresence) => void) => {
    userOfflineHandlers.current.add(callback)
    return () => {
      userOfflineHandlers.current.delete(callback)
    }
  }, [])

  // ═══════════════════════════════════════════════════════════════════
  // CONTEXT VALUE
  // ═══════════════════════════════════════════════════════════════════

  const value: SocketContextValue = {
    socket,
    connected,
    
    // Chat methods
    joinChat,
    leaveChat,
    sendMessage,
    sendTyping,
    
    // Presence methods
    updatePresence,
    
    // Event listeners
    onNewMessage,
    onNewNotification,
    onUserTyping,
    onPresenceUpdate,
    onUserOnline,
    onUserOffline,
    
    // State
    typingUsers,
    unreadCount,
  }

  return (
    <SocketContext.Provider value={value}>
      {children}
    </SocketContext.Provider>
  )
}

