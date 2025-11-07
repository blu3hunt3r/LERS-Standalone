/**
 * LERS Request Chat Component - WhatsApp Style
 * Real-time chat interface for IO-Provider communication
 * Features: Messages, Typing indicators, Presence, Read receipts, File attachments
 */
import React, { useState, useEffect, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { lersService } from '../../services/lersService'
import { useChatRoom, useMessageListener, useTypingListener, usePresence, useSocket } from '../../hooks/useSocket'
import {
  Send,
  Paperclip,
  User,
  Check,
  CheckCheck,
  Circle,
  Clock,
  AlertCircle,
  X
} from 'lucide-react'
import { formatDistanceToNow, format, differenceInMinutes } from 'date-fns'
import toast from 'react-hot-toast'

interface LERSRequestChatProps {
  requestId: string
  requestNumber: string
  currentUserRole: 'IO' | 'PROVIDER' | 'ADMIN'
}

interface Message {
  id: string
  request_id: string
  sender_id: string | null
  sender_name: string
  sender_email: string | null
  sender_type: 'IO' | 'PROVIDER' | 'SYSTEM'
  message_type: 'TEXT' | 'FILE' | 'SYSTEM'
  message_text: string
  attachments: Array<{url: string; filename: string; size?: number; type?: string}>
  read_by_receiver: boolean
  created_at: string
  metadata: Record<string, any>
}

interface TypingUser {
  user_id: string
  user_name: string
  is_typing: boolean
}

const LERSRequestChat: React.FC<LERSRequestChatProps> = ({
  requestId,
  requestNumber,
  currentUserRole,
}) => {
  const [messageText, setMessageText] = useState('')
  const [attachments, setAttachments] = useState<Array<{url: string; filename: string}>>([])
  const [typingUsers, setTypingUsers] = useState<TypingUser[]>([])
  const [localMessages, setLocalMessages] = useState<Message[]>([])

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const queryClient = useQueryClient()
  const { sendChatMessage, notifyTyping, connected } = useChatRoom(requestId)
  const { onUserOnline, onUserOffline } = usePresence()
  const { socket } = useSocket()

  // Fetch messages from API
  const { data: messagesData, isLoading } = useQuery({
    queryKey: ['lers-messages', requestId],
    queryFn: () => lersService.getMessages(requestId),
    enabled: !!requestId,
  })

  // Initialize local messages
  useEffect(() => {
    if (messagesData?.messages) {
      setLocalMessages(messagesData.messages)
    }
  }, [messagesData])

  // Listen for new messages via WebSocket
  useMessageListener(requestId, (newMessage) => {
    console.log('📨 New message received:', newMessage)
    setLocalMessages(prev => {
      // Avoid duplicates
      if (prev.some(m => m.id === newMessage.id)) {
        return prev
      }
      return [...prev, newMessage]
    })
    scrollToBottom()
  })

  // Listen for typing indicators
  useTypingListener(requestId, (typing) => {
    console.log('✍️ Typing update:', typing)
    setTypingUsers(prev => {
      const filtered = prev.filter(u => u.user_id !== typing.user_id)
      if (typing.is_typing) {
        return [...filtered, typing]
      }
      return filtered
    })
  })

  // Listen for message read events
  useEffect(() => {
    if (!requestId || !socket) return

    const handleMessageRead = (data: { message_id: string; read_at: string }) => {
      console.log('✓✓ Message marked as read:', data.message_id)
      setLocalMessages(prev => prev.map(msg =>
        msg.id === data.message_id
          ? { ...msg, read_by_receiver: true }
          : msg
      ))
    }

    socket.on('message_read', handleMessageRead)

    return () => {
      socket.off('message_read', handleMessageRead)
    }
  }, [requestId, socket])

  // Auto-mark messages as read when they appear
  useEffect(() => {
    if (!socket || !requestId || !connected) return

    // Mark all unread messages from other users as read
    const unreadMessages = localMessages.filter(msg => {
      const alignment = getMessageAlignment(msg)
      return alignment === 'left' && !msg.read_by_receiver
    })

    unreadMessages.forEach(msg => {
      socket.emit('mark_message_read', {
        message_id: msg.id,
        request_id: requestId
      })
    })
  }, [localMessages, socket, requestId, connected])

  // Send message mutation
  const sendMessageMutation = useMutation({
    mutationFn: (data: { message_text: string; attachments: any[] }) =>
      lersService.sendMessage(requestId, data),
    onSuccess: (data) => {
      console.log('✅ Message sent successfully:', data)

      // Add to local messages optimistically
      setLocalMessages(prev => [...prev, data])

      // Broadcast via WebSocket
      sendChatMessage(data.id)

      // Clear input
      setMessageText('')
      setAttachments([])

      // Scroll to bottom
      scrollToBottom()

      // Invalidate cache
      queryClient.invalidateQueries({ queryKey: ['lers-messages', requestId] })
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to send message')
    },
  })

  // Auto-scroll to bottom
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [localMessages])

  // Handle typing
  const handleTyping = () => {
    // Notify other users that I'm typing
    notifyTyping(true)

    // Clear previous timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current)
    }

    // Set new timeout to stop typing after 3 seconds
    typingTimeoutRef.current = setTimeout(() => {
      notifyTyping(false)
    }, 3000)
  }

  const handleSendMessage = () => {
    if (!messageText.trim() && attachments.length === 0) {
      return
    }

    // Stop typing indicator
    notifyTyping(false)
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current)
    }

    // Send message
    sendMessageMutation.mutate({
      message_text: messageText.trim(),
      attachments: attachments,
    })
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return

    // For demo purposes, we'll just store filenames
    // In production, upload files to S3/MinIO first
    const newAttachments = Array.from(files).map(file => ({
      url: URL.createObjectURL(file),
      filename: file.name,
      size: file.size,
      type: file.type,
    }))

    setAttachments(prev => [...prev, ...newAttachments])
    toast.success(`${files.length} file(s) attached`)
  }

  const removeAttachment = (index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index))
  }

  const getMessageAlignment = (message: Message) => {
    if (message.sender_type === 'SYSTEM') return 'center'
    if (currentUserRole === 'IO') {
      return message.sender_type === 'IO' ? 'right' : 'left'
    } else {
      return message.sender_type === 'PROVIDER' ? 'right' : 'left'
    }
  }

  const getMessageBubbleStyle = (message: Message) => {
    const alignment = getMessageAlignment(message)

    if (message.sender_type === 'SYSTEM') {
      return 'bg-gray-100 text-gray-600 text-sm italic'
    }

    if (alignment === 'right') {
      // Sent messages - light grey background
      return 'bg-gray-100 text-gray-900 border border-gray-200'
    }

    // Received messages - white with border
    return 'bg-white text-gray-900 border border-gray-200'
  }

  // Show avatar on EVERY message
  const shouldShowAvatar = (message: Message) => {
    return true // Always show avatar
  }

  // Get avatar initials and color
  const getAvatarInfo = (message: Message) => {
    const initial = message.sender_name.charAt(0).toUpperCase()
    const color = message.sender_type === 'IO' ? 'bg-gray-700' : 'bg-gray-700'
    return { initial, color }
  }

  const renderPresenceIndicator = (status: string) => {
    const colors = {
      ONLINE: 'bg-green-500',
      AWAY: 'bg-yellow-500',
      OFFLINE: 'bg-slate-500',
    }

    return (
      <div className={`w-2 h-2 rounded-full ${colors[status as keyof typeof colors] || 'bg-slate-500'}`} />
    )
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900" />
      </div>
    )
  }

  return (
    <div className="flex flex-col h-[600px] bg-white rounded-lg border-2 border-gray-300 shadow-md">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b-2 border-gray-300 bg-gray-50">
        <div>
          <h3 className="font-semibold text-gray-900">
            Chat - {requestNumber}
          </h3>
          <p className="text-sm text-gray-600">
            {connected ? (
              <span className="flex items-center gap-2">
                <Circle className="w-2 h-2 fill-green-500 text-green-500" />
                Connected
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <Circle className="w-2 h-2 fill-yellow-500 text-yellow-500" />
                Connecting...
              </span>
            )}
          </p>
        </div>

        <div className="text-xs text-gray-500">
          {localMessages.length} message{localMessages.length !== 1 ? 's' : ''}
        </div>
      </div>

      {/* Messages Container */}
      <div className="flex-1 overflow-y-auto p-4 space-y-1 bg-gray-50">
        {localMessages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <User className="w-16 h-16 text-gray-400 mb-4" />
            <p className="text-gray-600 font-medium">No messages yet</p>
            <p className="text-gray-500 text-sm mt-2">
              Start the conversation by sending a message
            </p>
          </div>
        ) : (
          localMessages.map((message, index) => {
            const alignment = getMessageAlignment(message)
            const { initial, color } = getAvatarInfo(message)

            return (
              <div
                key={message.id}
                className={`flex ${alignment === 'right' ? 'justify-end' : alignment === 'center' ? 'justify-center' : 'justify-start'} mt-2`}
              >
                <div className={`flex items-end gap-2 max-w-[70%] ${alignment === 'right' ? 'flex-row-reverse' : ''}`}>
                  {/* Avatar - Show on EVERY message */}
                  {alignment !== 'center' && (
                    <div
                      className={`flex-shrink-0 w-8 h-8 rounded-full ${color} flex items-center justify-center text-white text-xs font-semibold cursor-pointer`}
                      title={message.sender_name}
                    >
                      {initial}
                    </div>
                  )}

                  {/* Message Bubble */}
                  <div className="flex flex-col">

                    <div
                      className={`
                        rounded-lg px-3 py-2
                        ${getMessageBubbleStyle(message)}
                        ${alignment === 'right' ? 'rounded-br-sm' : alignment === 'left' ? 'rounded-bl-sm' : ''}
                      `}
                    >
                      <p className="text-sm whitespace-pre-wrap break-words">
                        {message.message_text}
                      </p>

                      {/* Attachments */}
                      {message.attachments && message.attachments.length > 0 && (
                        <div className="mt-2 space-y-1">
                          {message.attachments.map((att, idx) => (
                            <a
                              key={idx}
                              href={att.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-2 text-xs underline hover:opacity-80"
                            >
                              <Paperclip className="w-3 h-3" />
                              {att.filename}
                            </a>
                          ))}
                        </div>
                      )}

                      {/* Timestamp & Read Receipts - WhatsApp style */}
                      <div className={`flex items-center gap-1 mt-1 text-xs ${alignment === 'right' ? 'justify-end text-gray-400' : 'justify-start text-gray-600'}`}>
                        <span className="text-[11px]">
                          {format(new Date(message.created_at), 'HH:mm')}
                        </span>

                        {/* Read receipts - only for sent messages (right-aligned) */}
                        {alignment === 'right' && (
                          message.read_by_receiver ? (
                            // Double blue check - message read
                            <CheckCheck className="w-4 h-4 text-blue-400" strokeWidth={2.5} />
                          ) : (
                            // Single grey check - message delivered
                            <Check className="w-4 h-4 text-gray-400" strokeWidth={2.5} />
                          )
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )
          })
        )}

        {/* Typing Indicator */}
        {typingUsers.length > 0 && (
          <div className="flex items-center gap-2 text-gray-600 text-sm ml-2">
            <div className="flex gap-1">
              <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
              <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
              <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>
            <span className="text-xs italic">
              {typingUsers.map(u => u.user_name).join(', ')} {typingUsers.length === 1 ? 'is' : 'are'} typing...
            </span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Attachments Preview */}
      {attachments.length > 0 && (
        <div className="px-4 py-2 border-t-2 border-gray-300 bg-white">
          <div className="flex flex-wrap gap-2">
            {attachments.map((att, index) => (
              <div key={index} className="flex items-center gap-2 bg-gray-100 rounded px-3 py-1.5 text-sm">
                <Paperclip className="w-4 h-4 text-gray-600" />
                <span className="text-gray-900">{att.filename}</span>
                <button
                  onClick={() => removeAttachment(index)}
                  className="text-gray-600 hover:text-red-600 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Input Area */}
      <div className="p-4 border-t-2 border-gray-300 bg-white">
        <div className="flex items-end gap-2">
          {/* File Attach Button */}
          <input
            ref={fileInputRef}
            type="file"
            multiple
            className="hidden"
            onChange={handleFileSelect}
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="p-2 rounded-lg hover:bg-gray-100 transition-colors text-gray-600 hover:text-gray-900"
            disabled={sendMessageMutation.isPending}
          >
            <Paperclip className="w-5 h-5" />
          </button>

          {/* Text Input */}
          <div className="flex-1">
            <textarea
              value={messageText}
              onChange={(e) => {
                setMessageText(e.target.value)
                handleTyping()
              }}
              onKeyPress={handleKeyPress}
              placeholder="Type a message"
              className="w-full px-4 py-2 bg-white text-gray-900 rounded-lg border border-gray-300 focus:border-gray-900 focus:ring-1 focus:ring-gray-900 focus:outline-none resize-none"
              rows={2}
              disabled={!connected || sendMessageMutation.isPending}
            />
          </div>

          {/* Send Button */}
          <button
            onClick={handleSendMessage}
            disabled={(!messageText.trim() && attachments.length === 0) || !connected || sendMessageMutation.isPending}
            className="p-3 bg-gray-900 hover:bg-gray-800 disabled:bg-gray-200 disabled:text-gray-400 text-white rounded-lg transition-colors"
          >
            {sendMessageMutation.isPending ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <Send className="w-5 h-5" />
            )}
          </button>
        </div>

        {!connected && (
          <p className="text-xs text-yellow-600 mt-2 flex items-center gap-1">
            <AlertCircle className="w-3 h-3" />
            Not connected. Reconnecting...
          </p>
        )}
      </div>
    </div>
  )
}

export default LERSRequestChat
