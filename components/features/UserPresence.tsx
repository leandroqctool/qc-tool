"use client"

import React, { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { Badge } from '../ui/Badge'
import { Button } from '../ui/Button'
import { 
  Users, 
  Circle, 
  Eye, 
  MessageSquare, 
  FileText, 
  Settings,
  ChevronDown,
  ChevronUp
} from 'lucide-react'
import { type UserPresence as UserPresenceType } from '../../lib/messaging'

interface UserPresenceProps {
  className?: string
  showDetails?: boolean
  maxUsers?: number
}

export default function UserPresence({ 
  className = '', 
  showDetails = false,
  maxUsers = 10
}: UserPresenceProps) {
  const { data: session } = useSession()
  const [onlineUsers, setOnlineUsers] = useState<UserPresenceType[]>([])
  const [isExpanded, setIsExpanded] = useState(false)
  const [isConnected, setIsConnected] = useState(false)

  const currentUserId = (session?.user as unknown as { id?: string })?.id

  // Mock data for demonstration - in production this would come from the real-time system
  useEffect(() => {
    // Simulate real-time presence updates
    const mockUsers: UserPresenceType[] = [
      {
        userId: 'user_1',
        userName: 'Sarah Chen',
        userAvatar: undefined,
        status: 'online' as const,
        lastSeen: new Date(),
        currentChannel: 'file_abc123',
        currentFile: 'Creative_Brief_v2.pdf'
      },
      {
        userId: 'user_2', 
        userName: 'Mike Rodriguez',
        userAvatar: undefined,
        status: 'away' as const,
        lastSeen: new Date(Date.now() - 300000), // 5 minutes ago
        currentChannel: 'project_xyz789',
      },
      {
        userId: 'user_3',
        userName: 'Emma Thompson',
        userAvatar: undefined,
        status: 'busy' as const,
        lastSeen: new Date(),
        currentFile: 'Brand_Guidelines.pdf',
        cursor: {
          x: 150,
          y: 200,
          fileId: 'file_def456'
        }
      },
      {
        userId: 'user_4',
        userName: 'James Wilson',
        userAvatar: undefined,
        status: 'online' as const,
        lastSeen: new Date(),
        currentChannel: 'team_general'
      }
    ].filter(user => user.userId !== currentUserId)

    setOnlineUsers(mockUsers)
    setIsConnected(true)

    // Simulate presence updates
    const interval = setInterval(() => {
      setOnlineUsers(prev => prev.map(user => ({
        ...user,
        lastSeen: user.status === 'online' ? new Date() : user.lastSeen
      })))
    }, 30000)

    return () => clearInterval(interval)
  }, [currentUserId])

  const getStatusColor = (status: UserPresenceType['status']) => {
    switch (status) {
      case 'online': return 'bg-green-500'
      case 'away': return 'bg-yellow-500'
      case 'busy': return 'bg-red-500'
      default: return 'bg-gray-400'
    }
  }

  const getStatusText = (status: UserPresenceType['status']) => {
    switch (status) {
      case 'online': return 'Online'
      case 'away': return 'Away'
      case 'busy': return 'Busy'
      default: return 'Offline'
    }
  }

  const getActivityText = (user: UserPresenceType) => {
    if (user.currentFile) {
      return `Reviewing ${user.currentFile}`
    }
    if (user.currentChannel?.startsWith('file_')) {
      return 'Reviewing a file'
    }
    if (user.currentChannel?.startsWith('project_')) {
      return 'Working on project'
    }
    if (user.currentChannel === 'team_general') {
      return 'In team chat'
    }
    return 'Available'
  }

  const formatLastSeen = (lastSeen: Date) => {
    const now = new Date()
    const diff = now.getTime() - lastSeen.getTime()
    
    if (diff < 60000) return 'now'
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`
    return lastSeen.toLocaleDateString()
  }

  const displayUsers = isExpanded ? onlineUsers : onlineUsers.slice(0, maxUsers)
  const hasMoreUsers = onlineUsers.length > maxUsers

  if (!session || onlineUsers.length === 0) return null

  return (
    <div className={`bg-[var(--surface)] rounded-lg border border-[var(--border-light)] p-4 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Users className="w-4 h-4 text-gray-500" />
          <span className="font-medium text-[var(--text-primary)]">Team Online</span>
          <Badge variant="outline" className="text-xs">
            {onlineUsers.filter(u => u.status === 'online').length}
          </Badge>
        </div>
        
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
          {showDetails && (
            <Button variant="ghost" size="sm" className="p-1">
              <Settings className="w-3 h-3" />
            </Button>
          )}
        </div>
      </div>

      {/* User List */}
      <div className="space-y-2">
        {displayUsers.map((user) => (
          <div key={user.userId} className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 transition-colors">
            {/* Avatar */}
            <div className="relative">
              <div className="w-8 h-8 rounded-full bg-[var(--primary)] flex items-center justify-center text-white text-sm font-medium flex-shrink-0">
                {user.userAvatar ? (
                  <img src={user.userAvatar} alt={user.userName} className="w-8 h-8 rounded-full" />
                ) : (
                  user.userName.charAt(0).toUpperCase()
                )}
              </div>
              <div className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white ${getStatusColor(user.status)}`} />
            </div>

            {/* User Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="font-medium text-sm text-[var(--text-primary)] truncate">
                  {user.userName}
                </span>
                <Badge 
                  variant={user.status === 'online' ? 'success' : 'outline'} 
                  className="text-xs"
                >
                  {getStatusText(user.status)}
                </Badge>
              </div>
              
              {showDetails && (
                <div className="text-xs text-[var(--text-secondary)] space-y-1">
                  <div className="flex items-center gap-1">
                    <Eye className="w-3 h-3" />
                    <span className="truncate">{getActivityText(user)}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Circle className="w-2 h-2 fill-current" />
                    <span>Last seen {formatLastSeen(user.lastSeen)}</span>
                  </div>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex items-center gap-1">
              {user.currentFile && (
                <Button variant="ghost" size="sm" className="p-1" title="View file">
                  <FileText className="w-3 h-3" />
                </Button>
              )}
              <Button variant="ghost" size="sm" className="p-1" title="Send message">
                <MessageSquare className="w-3 h-3" />
              </Button>
            </div>
          </div>
        ))}
      </div>

      {/* Show More/Less */}
      {hasMoreUsers && (
        <div className="mt-3 pt-3 border-t border-[var(--border-light)]">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsExpanded(!isExpanded)}
            className="w-full justify-center text-xs"
          >
            {isExpanded ? (
              <>
                <ChevronUp className="w-3 h-3 mr-1" />
                Show Less
              </>
            ) : (
              <>
                <ChevronDown className="w-3 h-3 mr-1" />
                Show {onlineUsers.length - maxUsers} More
              </>
            )}
          </Button>
        </div>
      )}

      {/* Quick Stats */}
      {showDetails && (
        <div className="mt-4 pt-3 border-t border-[var(--border-light)] grid grid-cols-3 gap-2 text-center">
          <div>
            <div className="text-lg font-semibold text-[var(--text-primary)]">
              {onlineUsers.filter(u => u.status === 'online').length}
            </div>
            <div className="text-xs text-[var(--text-secondary)]">Online</div>
          </div>
          <div>
            <div className="text-lg font-semibold text-[var(--text-primary)]">
              {onlineUsers.filter(u => u.currentFile).length}
            </div>
            <div className="text-xs text-[var(--text-secondary)]">Reviewing</div>
          </div>
          <div>
            <div className="text-lg font-semibold text-[var(--text-primary)]">
              {onlineUsers.filter(u => u.status === 'busy').length}
            </div>
            <div className="text-xs text-[var(--text-secondary)]">Busy</div>
          </div>
        </div>
      )}
    </div>
  )
}

// Compact version for header/sidebar
export function UserPresenceIndicator({ className = '' }: { className?: string }) {
  const [onlineCount, setOnlineCount] = useState(0)
  const [isConnected, setIsConnected] = useState(false)

  useEffect(() => {
    // Mock online count
    setOnlineCount(4)
    setIsConnected(true)
  }, [])

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <div className="flex items-center gap-1">
        <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
        <Users className="w-4 h-4 text-gray-500" />
        <span className="text-sm text-[var(--text-secondary)]">{onlineCount}</span>
      </div>
    </div>
  )
}
