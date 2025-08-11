import { getServerSession } from 'next-auth'
import { NextRequest } from 'next/server'
import { authOptions } from '../../../lib/auth'
import { enforceRateLimit } from '../../../lib/rateLimit'
import { formatSSEEvent, type RealtimeEvent } from '../../../lib/messaging'

export const runtime = 'nodejs'

// Global map to store SSE connections
const connections = new Map<string, {
  controller: ReadableStreamDefaultController
  userId: string
  tenantId: string
  channels: Set<string>
  lastPing: number
}>()

// Cleanup inactive connections every 30 seconds
setInterval(() => {
  const now = Date.now()
  for (const [connectionId, connection] of connections) {
    if (now - connection.lastPing > 60000) { // 1 minute timeout
      try {
        connection.controller.close()
      } catch (error) {
        console.error('Error closing SSE connection:', error)
      }
      connections.delete(connectionId)
    }
  }
}, 30000)

// SSE endpoint for real-time events
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return new Response('Unauthorized', { status: 401 })
    }

    const tenantId = (session.user as unknown as { tenantId?: string }).tenantId
    const userId = (session.user as unknown as { id?: string }).id
    
    if (!tenantId || !userId) {
      return new Response('No tenant access', { status: 403 })
    }

    // Rate limiting
    const ip = req.headers.get('x-forwarded-for') || '127.0.0.1'
    const { ok } = enforceRateLimit(`realtime:${tenantId}:${ip}`, 5, 60 * 1000)
    if (!ok) {
      return new Response('Rate limit exceeded', { status: 429 })
    }

    // Generate unique connection ID
    const connectionId = `${userId}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

    // Create SSE stream
    const stream = new ReadableStream({
      start(controller) {
        // Store connection
        connections.set(connectionId, {
          controller,
          userId,
          tenantId,
          channels: new Set(),
          lastPing: Date.now()
        })

        // Send initial connection event
        const connectEvent: RealtimeEvent = {
          type: 'presence_updated',
          data: {
            userId,
            userName: session.user?.name || 'Unknown User',
            userAvatar: session.user?.image || undefined,
            status: 'online',
            lastSeen: new Date(),
          }
        }
        
        controller.enqueue(formatSSEEvent(connectEvent))

        // Send periodic ping to keep connection alive
        const pingInterval = setInterval(() => {
          try {
            controller.enqueue('data: {"type":"ping"}\n\n')
            const connection = connections.get(connectionId)
            if (connection) {
              connection.lastPing = Date.now()
            }
          } catch (error) {
            clearInterval(pingInterval)
            connections.delete(connectionId)
          }
        }, 30000)

        // Cleanup on disconnect
        req.signal.addEventListener('abort', () => {
          clearInterval(pingInterval)
          connections.delete(connectionId)
        })
      },
      
      cancel() {
        connections.delete(connectionId)
      }
    })

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Cache-Control'
      }
    })
  } catch (error) {
    console.error('SSE connection error:', error)
    return new Response('Internal server error', { status: 500 })
  }
}

// Broadcast event to all connected users in a tenant
export function broadcastToTenant(tenantId: string, event: RealtimeEvent, excludeUserId?: string) {
  const eventData = formatSSEEvent(event)
  
  for (const [connectionId, connection] of connections) {
    if (connection.tenantId === tenantId && connection.userId !== excludeUserId) {
      try {
        connection.controller.enqueue(eventData)
      } catch (error) {
        console.error('Error broadcasting to connection:', connectionId, error)
        connections.delete(connectionId)
      }
    }
  }
}

// Broadcast event to specific users
export function broadcastToUsers(userIds: string[], event: RealtimeEvent, excludeUserId?: string) {
  const eventData = formatSSEEvent(event)
  
  for (const [connectionId, connection] of connections) {
    if (userIds.includes(connection.userId) && connection.userId !== excludeUserId) {
      try {
        connection.controller.enqueue(eventData)
      } catch (error) {
        console.error('Error broadcasting to user:', connection.userId, error)
        connections.delete(connectionId)
      }
    }
  }
}

// Broadcast event to users in specific channels
export function broadcastToChannels(channelIds: string[], event: RealtimeEvent, excludeUserId?: string) {
  const eventData = formatSSEEvent(event)
  
  for (const [connectionId, connection] of connections) {
    const hasMatchingChannel = channelIds.some(channelId => connection.channels.has(channelId))
    if (hasMatchingChannel && connection.userId !== excludeUserId) {
      try {
        connection.controller.enqueue(eventData)
      } catch (error) {
        console.error('Error broadcasting to channel:', channelIds, error)
        connections.delete(connectionId)
      }
    }
  }
}

// Subscribe user to channels
export function subscribeToChannels(userId: string, channelIds: string[]) {
  for (const [connectionId, connection] of connections) {
    if (connection.userId === userId) {
      channelIds.forEach(channelId => connection.channels.add(channelId))
    }
  }
}

// Unsubscribe user from channels
export function unsubscribeFromChannels(userId: string, channelIds: string[]) {
  for (const [connectionId, connection] of connections) {
    if (connection.userId === userId) {
      channelIds.forEach(channelId => connection.channels.delete(channelId))
    }
  }
}

// Get active connections count
export function getActiveConnectionsCount(): number {
  return connections.size
}

// Get online users in tenant
export function getOnlineUsers(tenantId: string): string[] {
  const onlineUsers = new Set<string>()
  
  for (const connection of connections.values()) {
    if (connection.tenantId === tenantId) {
      onlineUsers.add(connection.userId)
    }
  }
  
  return Array.from(onlineUsers)
}
