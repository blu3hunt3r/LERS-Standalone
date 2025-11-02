/**
 * Custom Hook for Socket.IO Operations
 * Provides simplified interface for WebSocket communication
 */
import { useEffect, useCallback } from 'react'
import { useSocket as useSocketContext } from '../contexts/SocketContext'
import type { LERSMessage, LERSNotification, TypingUser, UserPresence } from '../contexts/SocketContext'

export const useSocket = () => {
  return useSocketContext()
}

/**
 * Hook for managing chat room connection
 */
export const useChatRoom = (requestId: string | null) => {
  const { joinChat, leaveChat, sendMessage, sendTyping, connected } = useSocket()

  useEffect(() => {
    if (requestId && connected) {
      joinChat(requestId)
      return () => {
        leaveChat(requestId)
      }
    }
  }, [requestId, connected, joinChat, leaveChat])

  const sendChatMessage = useCallback((messageId: string) => {
    if (requestId) {
      sendMessage(requestId, messageId)
    }
  }, [requestId, sendMessage])

  const notifyTyping = useCallback((isTyping: boolean) => {
    if (requestId) {
      sendTyping(requestId, isTyping)
    }
  }, [requestId, sendTyping])

  return {
    sendChatMessage,
    notifyTyping,
    connected,
  }
}

/**
 * Hook for listening to new messages in a specific request
 */
export const useMessageListener = (
  requestId: string | null,
  onMessage: (message: LERSMessage) => void
) => {
  const { onNewMessage } = useSocket()

  useEffect(() => {
    if (!requestId) return

    const unsubscribe = onNewMessage((message) => {
      if (message.request_id === requestId) {
        onMessage(message)
      }
    })

    return unsubscribe
  }, [requestId, onMessage, onNewMessage])
}

/**
 * Hook for listening to typing indicators
 */
export const useTypingListener = (
  requestId: string | null,
  onTyping: (typing: TypingUser) => void
) => {
  const { onUserTyping } = useSocket()

  useEffect(() => {
    if (!requestId) return

    const unsubscribe = onUserTyping((typing) => {
      if (typing.request_id === requestId) {
        onTyping(typing)
      }
    })

    return unsubscribe
  }, [requestId, onTyping, onUserTyping])
}

/**
 * Hook for listening to notifications
 */
export const useNotificationListener = (
  onNotification: (notification: LERSNotification) => void
) => {
  const { onNewNotification } = useSocket()

  useEffect(() => {
    const unsubscribe = onNewNotification(onNotification)
    return unsubscribe
  }, [onNotification, onNewNotification])
}

/**
 * Hook for managing user presence
 */
export const usePresence = () => {
  const { updatePresence, onPresenceUpdate, onUserOnline, onUserOffline } = useSocket()

  const setOnline = useCallback(() => {
    updatePresence('ONLINE')
  }, [updatePresence])

  const setAway = useCallback(() => {
    updatePresence('AWAY')
  }, [updatePresence])

  const setOffline = useCallback(() => {
    updatePresence('OFFLINE')
  }, [updatePresence])

  return {
    setOnline,
    setAway,
    setOffline,
    onPresenceUpdate,
    onUserOnline,
    onUserOffline,
  }
}

/**
 * Hook for auto-managing presence based on window visibility
 */
export const useAutoPresence = () => {
  const { setOnline, setAway } = usePresence()

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        setAway()
      } else {
        setOnline()
      }
    }

    // Set online on mount
    setOnline()

    // Listen to visibility changes
    document.addEventListener('visibilitychange', handleVisibilityChange)

    // Set offline on unmount (component cleanup)
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [setOnline, setAway])
}



