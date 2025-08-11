"use client"

import React, { useState, useEffect, useRef, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { Button } from '../ui/Button'
import { Input } from '../ui/Input'
import { Badge } from '../ui/Badge'
import { useToast } from '../ui/ToastProvider'
import { 
  Send, 
  Smile, 
  Paperclip, 
  MoreVertical, 
  Reply, 
  Edit, 
  Trash2,
  Users,
  Hash,
  Minimize2,
  Maximize2
} from 'lucide-react'
import { type Message, type RealtimeEvent, type UserPresence } from '../../lib/messaging'

interface RealtimeMessagingProps {
  channelId: string
  channelName: string
  channelType: 'file' | 'project' | 'team' | 'direct'
  fileId?: string
  className?: string
  minimized?: boolean
  onMinimize?: () => void
  onMaximize?: () => void
}

export default function RealtimeMessaging({
  channelId,
  channelName,
  channelType,
  fileId,
  className = '',
  minimized = false,
  onMinimize,
  onMaximize,
}: RealtimeMessagingProps) {
  const { data: session } = useSession()
  const { show } = useToast()
  const [messages, setMessages] = useState<Message[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [isConnected, setIsConnected] = useState(false)
  const [onlineUsers, setOnlineUsers] = useState<UserPresence[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSending, setIsSending] = useState(false)
  const [typingUsers, setTypingUsers] = useState<Set<string>>(new Set())
  
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const eventSourceRef = useRef<EventSource | null>(null)
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const messageInputRef = useRef<HTMLInputElement>(null)

  const currentUser = session?.user ? {
    id: (session.user as unknown as { id?: string }).id || 'unknown',
    name: session.user.name || session.user.email?.split('@')[0] || 'Unknown User',
    avatar: session.user.image
  } : null

  // Scroll to bottom of messages
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [])

  // Load initial messages
  const loadMessages = useCallback(async () => {
    try {
      const response = await fetch(`/api/messages?channelId=${channelId}&limit=50`)
      if (!response.ok) throw new Error('Failed to load messages')
      
      const data = await response.json()
      setMessages(data.messages || [])
      setIsLoading(false)
      
      // Scroll to bottom after loading
      setTimeout(scrollToBottom, 100)
    } catch (error) {
      console.error('Error loading messages:', error)
      show('Failed to load messages', 'error')
      setIsLoading(false)
    }
  }, [channelId, show, scrollToBottom])

  // Connect to real-time events
  const connectToRealtime = useCallback(() => {
    if (!session || eventSourceRef.current) return

    try {
      const eventSource = new EventSource('/api/realtime')
      eventSourceRef.current = eventSource

      eventSource.onopen = () => {
        setIsConnected(true)
        console.log('Connected to real-time messaging')
      }

      eventSource.onmessage = (event) => {
        try {
          const realtimeEvent: RealtimeEvent = JSON.parse(event.data)
          
          switch (realtimeEvent.type) {
            case 'message':
              if (realtimeEvent.data.channelId === channelId) {
                setMessages(prev => [...prev, realtimeEvent.data])
                setTimeout(scrollToBottom, 100)
                
                // Show notification for mentions
                if (realtimeEvent.data.metadata?.mentions?.includes(currentUser?.name || '')) {
                  show(`${realtimeEvent.data.userName} mentioned you`, 'info')
                }
              }
              break
              
            case 'message_edited':
              if (realtimeEvent.data.channelId === channelId) {
                setMessages(prev => prev.map(msg => 
                  msg.id === realtimeEvent.data.id ? realtimeEvent.data : msg
                ))
              }
              break
              
            case 'message_deleted':
              if (realtimeEvent.data.channelId === channelId) {
                setMessages(prev => prev.filter(msg => msg.id !== realtimeEvent.data.messageId))
              }
              break
              
            case 'presence_updated':
              setOnlineUsers(prev => {
                const filtered = prev.filter(u => u.userId !== realtimeEvent.data.userId)
                return [...filtered, realtimeEvent.data]
              })
              break
              
            case 'typing_start':
              if (realtimeEvent.data.channelId === channelId && realtimeEvent.data.userId !== currentUser?.id) {
                setTypingUsers(prev => new Set([...prev, realtimeEvent.data.userName]))
              }
              break
              
            case 'typing_stop':
              if (realtimeEvent.data.channelId === channelId) {
                setTypingUsers(prev => {
                  const newSet = new Set(prev)
                  // Find user name by ID (simplified for demo)
                  const userName = onlineUsers.find(u => u.userId === realtimeEvent.data.userId)?.userName
                  if (userName) newSet.delete(userName)
                  return newSet
                })
              }
              break
          }
        } catch (error) {
          console.error('Error parsing real-time event:', error)
        }
      }

      eventSource.onerror = () => {
        setIsConnected(false)
        eventSource.close()
        eventSourceRef.current = null
        
        // Reconnect after a delay
        setTimeout(() => {
          if (!eventSourceRef.current) {
            connectToRealtime()
          }
        }, 5000)
      }
    } catch (error) {
      console.error('Error connecting to real-time messaging:', error)
      setIsConnected(false)
    }
  }, [session, channelId, currentUser?.id, currentUser?.name, onlineUsers, show, scrollToBottom])

  // Send message
  const sendMessage = useCallback(async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newMessage.trim() || isSending || !currentUser) return

    setIsSending(true)
    try {
      const response = await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          channelId,
          content: newMessage.trim(),
          type: 'text',
          metadata: { fileId }
        })
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to send message')
      }

      setNewMessage('')
      messageInputRef.current?.focus()
    } catch (error) {
      console.error('Error sending message:', error)
      show(error instanceof Error ? error.message : 'Failed to send message', 'error')
    } finally {
      setIsSending(false)
    }
  }, [newMessage, isSending, currentUser, channelId, fileId, show])

  // Handle typing indicators
  const handleTyping = useCallback(() => {
    // TODO: Send typing start event
    
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current)
    }
    
    typingTimeoutRef.current = setTimeout(() => {
      // TODO: Send typing stop event
    }, 2000)
  }, [])

  // Format message timestamp
  const formatTimestamp = useCallback((timestamp: Date) => {
    const now = new Date()
    const diff = now.getTime() - timestamp.getTime()
    
    if (diff < 60000) return 'now'
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m`
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h`
    return timestamp.toLocaleDateString()
  }, [])

  // Initialize component
  useEffect(() => {
    if (session) {
      loadMessages()
      connectToRealtime()
    }

    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close()
        eventSourceRef.current = null
      }
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current)
      }
    }
  }, [session, loadMessages, connectToRealtime])

  if (!session || !currentUser) return null

  if (minimized) {
    return (
      <div className={`bg-[var(--surface)] border border-[var(--border-light)] rounded-t-lg shadow-lg ${className}`}>
        <div 
          className="flex items-center justify-between p-3 cursor-pointer hover:bg-gray-50"
          onClick={onMaximize}
        >
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1">
              <Hash className="w-4 h-4 text-gray-500" />
              <span className="text-sm font-medium">{channelName}</span>
            </div>
            <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
          </div>
          <Maximize2 className="w-4 h-4 text-gray-500" />
        </div>
      </div>
    )
  }

  return (
    <div className={`bg-[var(--surface)] border border-[var(--border-light)] rounded-lg shadow-lg flex flex-col ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b border-[var(--border-light)]">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1">
            <Hash className="w-4 h-4 text-gray-500" />
            <span className="font-medium">{channelName}</span>
          </div>
          <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
          <Badge variant="outline" className="text-xs">
            {onlineUsers.length} online
          </Badge>
        </div>
        
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="sm" className="p-1">
            <Users className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="sm" className="p-1">
            <MoreVertical className="w-4 h-4" />
          </Button>
          {onMinimize && (
            <Button variant="ghost" size="sm" className="p-1" onClick={onMinimize}>
              <Minimize2 className="w-4 h-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3 min-h-0">
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin w-6 h-6 border-2 border-[var(--primary)] border-t-transparent rounded-full" />
          </div>
        ) : messages.length === 0 ? (
          <div className="text-center py-8 text-[var(--text-secondary)]">
            <Hash className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p>No messages yet. Start the conversation!</p>
          </div>
        ) : (
          messages.map((message) => (
            <div key={message.id} className="flex gap-3 group">
              <div className="w-8 h-8 rounded-full bg-[var(--primary)] flex items-center justify-center text-white text-sm font-medium flex-shrink-0">
                {message.userAvatar ? (
                  <img src={message.userAvatar} alt={message.userName} className="w-8 h-8 rounded-full" />
                ) : (
                  message.userName.charAt(0).toUpperCase()
                )}
              </div>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline gap-2 mb-1">
                  <span className="font-medium text-sm">{message.userName}</span>
                  <span className="text-xs text-[var(--text-secondary)]">
                    {formatTimestamp(message.timestamp)}
                  </span>
                  {message.edited && (
                    <Badge variant="outline" className="text-xs">edited</Badge>
                  )}
                </div>
                
                <div className="text-sm text-[var(--text-primary)] break-words">
                  {message.content}
                </div>
                
                {message.reactions && message.reactions.length > 0 && (
                  <div className="flex gap-1 mt-2">
                    {message.reactions.map((reaction, index) => (
                      <button
                        key={index}
                        className="flex items-center gap-1 px-2 py-1 bg-gray-100 rounded-full text-xs hover:bg-gray-200"
                      >
                        <span>{reaction.emoji}</span>
                        <span>{reaction.userId === currentUser.id ? 'You' : reaction.userName}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              
              <div className="opacity-0 group-hover:opacity-100 flex items-start gap-1">
                <Button variant="ghost" size="sm" className="p-1">
                  <Smile className="w-3 h-3" />
                </Button>
                <Button variant="ghost" size="sm" className="p-1">
                  <Reply className="w-3 h-3" />
                </Button>
                {message.userId === currentUser.id && (
                  <>
                    <Button variant="ghost" size="sm" className="p-1">
                      <Edit className="w-3 h-3" />
                    </Button>
                    <Button variant="ghost" size="sm" className="p-1 text-red-500">
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </>
                )}
              </div>
            </div>
          ))
        )}
        
        {typingUsers.size > 0 && (
          <div className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
            <div className="flex gap-1">
              <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" />
              <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }} />
              <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
            </div>
            <span>
              {Array.from(typingUsers).join(', ')} {typingUsers.size === 1 ? 'is' : 'are'} typing...
            </span>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <form onSubmit={sendMessage} className="p-3 border-t border-[var(--border-light)]">
        <div className="flex gap-2">
          <div className="flex-1 relative">
            <Input
              ref={messageInputRef}
              value={newMessage}
              onChange={(e) => {
                setNewMessage(e.target.value)
                handleTyping()
              }}
              placeholder={`Message ${channelName}...`}
              className="pr-20"
              disabled={!isConnected || isSending}
            />
            <div className="absolute right-2 top-1/2 transform -translate-y-1/2 flex gap-1">
              <Button type="button" variant="ghost" size="sm" className="p-1">
                <Paperclip className="w-4 h-4" />
              </Button>
              <Button type="button" variant="ghost" size="sm" className="p-1">
                <Smile className="w-4 h-4" />
              </Button>
            </div>
          </div>
          <Button 
            type="submit" 
            disabled={!newMessage.trim() || !isConnected || isSending}
            className="px-3"
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </form>
    </div>
  )
}
