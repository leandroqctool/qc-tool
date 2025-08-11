// Real-time messaging system for QC collaboration
export interface Message {
  id: string
  channelId: string
  type: 'text' | 'annotation' | 'workflow' | 'system'
  content: string
  metadata?: {
    annotationId?: string
    fileId?: string
    workflowAction?: string
    mentions?: string[]
  }
  userId: string
  userName: string
  userAvatar?: string
  timestamp: Date
  edited?: boolean
  editedAt?: Date
  threadId?: string
  reactions?: MessageReaction[]
}

export interface MessageReaction {
  emoji: string
  userId: string
  userName: string
  timestamp: Date
}

export interface Channel {
  id: string
  name: string
  type: 'file' | 'project' | 'team' | 'direct'
  description?: string
  participants: ChannelParticipant[]
  fileId?: string
  projectId?: string
  tenantId: string
  createdBy: string
  createdAt: Date
  lastActivity: Date
  settings: {
    allowGuests: boolean
    requireApproval: boolean
    retentionDays?: number
  }
}

export interface ChannelParticipant {
  userId: string
  userName: string
  userAvatar?: string
  role: 'owner' | 'admin' | 'member' | 'guest'
  joinedAt: Date
  lastSeen?: Date
  permissions: {
    canRead: boolean
    canWrite: boolean
    canManage: boolean
    canInvite: boolean
  }
}

export interface UserPresence {
  userId: string
  userName: string
  userAvatar?: string
  status: 'online' | 'away' | 'busy' | 'offline'
  lastSeen: Date
  currentChannel?: string
  currentFile?: string
  cursor?: {
    x: number
    y: number
    fileId: string
  }
}

export interface NotificationPreferences {
  userId: string
  channels: {
    [channelId: string]: {
      muted: boolean
      mentions: boolean
      reactions: boolean
      workflow: boolean
    }
  }
  global: {
    desktop: boolean
    email: boolean
    emailDigest: 'immediate' | 'hourly' | 'daily' | 'never'
    sound: boolean
    vibration: boolean
  }
}

// Message validation and sanitization
export function validateMessage(message: Partial<Message>): string[] {
  const errors: string[] = []

  if (!message.content || message.content.trim().length === 0) {
    errors.push('Message content is required')
  }

  if (message.content && message.content.length > 5000) {
    errors.push('Message content too long (max 5000 characters)')
  }

  if (!message.channelId) {
    errors.push('Channel ID is required')
  }

  if (!message.userId) {
    errors.push('User ID is required')
  }

  if (!message.userName) {
    errors.push('User name is required')
  }

  if (message.type && !['text', 'annotation', 'workflow', 'system'].includes(message.type)) {
    errors.push('Invalid message type')
  }

  return errors
}

// Sanitize message content to prevent XSS
export function sanitizeMessageContent(content: string): string {
  return content
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;')
}

// Parse @mentions from message content
export function parseMentions(content: string): string[] {
  const mentionRegex = /@(\w+)/g
  const mentions: string[] = []
  let match

  while ((match = mentionRegex.exec(content)) !== null) {
    mentions.push(match[1])
  }

  return [...new Set(mentions)] // Remove duplicates
}

// Format message for display with @mention highlighting
export function formatMessageContent(content: string, currentUserId: string): string {
  let formatted = sanitizeMessageContent(content)
  
  // Highlight @mentions
  formatted = formatted.replace(
    /@(\w+)/g, 
    '<span class="mention" data-user="$1">@$1</span>'
  )
  
  // Highlight current user mentions
  formatted = formatted.replace(
    new RegExp(`@${currentUserId}\\b`, 'g'),
    `<span class="mention mention-me">@${currentUserId}</span>`
  )

  // Convert URLs to links
  formatted = formatted.replace(
    /(https?:\/\/[^\s]+)/g,
    '<a href="$1" target="_blank" rel="noopener noreferrer" class="message-link">$1</a>'
  )

  return formatted
}

// Generate channel ID based on type and context
export function generateChannelId(type: Channel['type'], contextId: string, tenantId: string): string {
  const timestamp = Date.now()
  const random = Math.random().toString(36).substr(2, 9)
  return `${type}_${contextId}_${tenantId}_${timestamp}_${random}`
}

// Generate message ID
export function generateMessageId(): string {
  const timestamp = Date.now()
  const random = Math.random().toString(36).substr(2, 9)
  return `msg_${timestamp}_${random}`
}

// Check if user can access channel
export function canUserAccessChannel(channel: Channel, userId: string, userRole: string): boolean {
  // System admin can access everything
  if (userRole === 'admin') return true

  // Check if user is a participant
  const participant = channel.participants.find(p => p.userId === userId)
  if (!participant) {
    // Check if channel allows guests
    if (channel.settings.allowGuests) {
      return true
    }
    return false
  }

  return participant.permissions.canRead
}

// Check if user can send messages to channel
export function canUserSendMessage(channel: Channel, userId: string, userRole: string): boolean {
  if (!canUserAccessChannel(channel, userId, userRole)) return false

  // System admin can send messages everywhere
  if (userRole === 'admin') return true

  const participant = channel.participants.find(p => p.userId === userId)
  if (!participant) return false

  return participant.permissions.canWrite
}

// Get default channel name based on type and context
export function getDefaultChannelName(type: Channel['type'], contextId: string, contextName?: string): string {
  switch (type) {
    case 'file':
      return `File: ${contextName || contextId}`
    case 'project':
      return `Project: ${contextName || contextId}`
    case 'team':
      return `Team Discussion`
    case 'direct':
      return `Direct Message`
    default:
      return `Channel ${contextId}`
  }
}

// Message threading utilities
export function isThreadReply(message: Message): boolean {
  return !!message.threadId
}

export function getThreadMessages(messages: Message[], threadId: string): Message[] {
  return messages.filter(msg => msg.threadId === threadId).sort((a, b) => 
    new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  )
}

export function getThreadParent(messages: Message[], threadId: string): Message | undefined {
  return messages.find(msg => msg.id === threadId)
}

// Presence utilities
export function isUserOnline(presence: UserPresence): boolean {
  const now = new Date()
  const lastSeen = new Date(presence.lastSeen)
  const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000)
  
  return presence.status === 'online' && lastSeen > fiveMinutesAgo
}

export function getUserStatusColor(presence: UserPresence): string {
  if (!isUserOnline(presence)) return '#6B7280' // gray-500
  
  switch (presence.status) {
    case 'online': return '#10B981' // green-500
    case 'away': return '#F59E0B' // yellow-500
    case 'busy': return '#EF4444' // red-500
    default: return '#6B7280' // gray-500
  }
}

// Real-time event types for SSE
export type RealtimeEvent = 
  | { type: 'message'; data: Message }
  | { type: 'message_deleted'; data: { messageId: string; channelId: string } }
  | { type: 'message_edited'; data: Message }
  | { type: 'reaction_added'; data: { messageId: string; reaction: MessageReaction } }
  | { type: 'reaction_removed'; data: { messageId: string; emoji: string; userId: string } }
  | { type: 'user_joined'; data: { channelId: string; participant: ChannelParticipant } }
  | { type: 'user_left'; data: { channelId: string; userId: string } }
  | { type: 'presence_updated'; data: UserPresence }
  | { type: 'typing_start'; data: { channelId: string; userId: string; userName: string } }
  | { type: 'typing_stop'; data: { channelId: string; userId: string } }
  | { type: 'cursor_moved'; data: { userId: string; x: number; y: number; fileId: string } }

// Format event for SSE transmission
export function formatSSEEvent(event: RealtimeEvent): string {
  return `data: ${JSON.stringify(event)}\n\n`
}

// Rate limiting for messages
export function isMessageRateLimited(userId: string, channelId: string, lastMessages: Message[]): boolean {
  const oneMinuteAgo = new Date(Date.now() - 60 * 1000)
  const recentMessages = lastMessages.filter(msg => 
    msg.userId === userId && 
    msg.channelId === channelId &&
    new Date(msg.timestamp) > oneMinuteAgo
  )
  
  // Allow max 10 messages per minute per user per channel
  return recentMessages.length >= 10
}
