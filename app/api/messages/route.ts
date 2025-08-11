import { getServerSession } from 'next-auth'
import { NextRequest } from 'next/server'
import { authOptions } from '../../../lib/auth'
import { jsonError } from '../../../lib/errors'
import { enforceRateLimit } from '../../../lib/rateLimit'
import { neon } from '@neondatabase/serverless'
import { 
  validateMessage, 
  sanitizeMessageContent, 
  parseMentions, 
  generateMessageId,
  isMessageRateLimited,
  type Message,
  type RealtimeEvent
} from '../../../lib/messaging'
import { broadcastToChannels } from '../realtime/route'

export const runtime = 'nodejs'

// Get messages for a channel
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 })

    const tenantId = (session.user as unknown as { tenantId?: string }).tenantId
    const userId = (session.user as unknown as { id?: string }).id
    
    if (!tenantId || !userId) return Response.json({ error: 'No tenant access' }, { status: 403 })

    // Rate limiting
    const ip = req.headers.get('x-forwarded-for') || '127.0.0.1'
    const { ok, resetAt } = enforceRateLimit(`messages:get:${tenantId}:${ip}`, 100, 60 * 1000)
    if (!ok) return Response.json({ error: 'Rate limit exceeded', resetAt }, { status: 429 })

    const { searchParams } = new URL(req.url)
    const channelId = searchParams.get('channelId')
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100)
    const offset = parseInt(searchParams.get('offset') || '0')
    const threadId = searchParams.get('threadId')

    if (!channelId) {
      return Response.json({ error: 'Channel ID is required' }, { status: 400 })
    }

    const sql = neon(process.env.DATABASE_URL!)

    // Create messages table if it doesn't exist
    await sql`
      CREATE TABLE IF NOT EXISTS messages (
        id TEXT PRIMARY KEY,
        channel_id TEXT NOT NULL,
        type TEXT NOT NULL DEFAULT 'text',
        content TEXT NOT NULL,
        metadata JSONB,
        user_id TEXT NOT NULL,
        user_name TEXT NOT NULL,
        user_avatar TEXT,
        tenant_id TEXT NOT NULL,
        thread_id TEXT,
        edited BOOLEAN DEFAULT false,
        edited_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW(),
        INDEX idx_messages_channel (channel_id),
        INDEX idx_messages_tenant (tenant_id),
        INDEX idx_messages_thread (thread_id),
        INDEX idx_messages_created (created_at)
      )
    `

    // Build query conditions
    const whereClause = 'WHERE channel_id = $1 AND tenant_id = $2'
    const params: unknown[] = [channelId, tenantId]

    // For simplicity, we'll handle threadId filtering in the query directly
    const threadFilter = threadId ? sql`AND thread_id = ${threadId}` : sql``

    // Get messages
    const messages = await sql`
      SELECT 
        id,
        channel_id,
        type,
        content,
        metadata,
        user_id,
        user_name,
        user_avatar,
        thread_id,
        edited,
        edited_at,
        created_at
      FROM messages 
      WHERE channel_id = ${channelId} AND tenant_id = ${tenantId}
      ${threadFilter}
      ORDER BY created_at DESC
      LIMIT ${limit}
      OFFSET ${offset}
    `

    // Get message reactions
    const messageIds = messages.map(m => m.id)
    let reactions: Array<{
      message_id: string
      emoji: string
      user_id: string
      user_name: string
      created_at: Date
    }> = []
    
    if (messageIds.length > 0) {
      const reactionRows = await sql`
        SELECT 
          message_id,
          emoji,
          user_id,
          user_name,
          created_at
        FROM message_reactions 
        WHERE message_id = ANY(${messageIds})
        ORDER BY created_at ASC
      `
      reactions = reactionRows as typeof reactions
    }

    // Group reactions by message
    const reactionsByMessage = reactions.reduce((acc, reaction) => {
      if (!acc[reaction.message_id]) acc[reaction.message_id] = []
      acc[reaction.message_id].push({
        emoji: reaction.emoji,
        userId: reaction.user_id,
        userName: reaction.user_name,
        timestamp: reaction.created_at,
      })
      return acc
    }, {} as Record<string, Array<{
      emoji: string
      userId: string
      userName: string
      timestamp: Date
    }>>)

    // Format messages
    const formattedMessages: Message[] = messages.map(msg => ({
      id: msg.id,
      channelId: msg.channel_id,
      type: msg.type as Message['type'],
      content: msg.content,
      metadata: msg.metadata || undefined,
      userId: msg.user_id,
      userName: msg.user_name,
      userAvatar: msg.user_avatar || undefined,
      timestamp: new Date(msg.created_at),
      edited: msg.edited || false,
      editedAt: msg.edited_at ? new Date(msg.edited_at) : undefined,
      threadId: msg.thread_id || undefined,
      reactions: reactionsByMessage[msg.id] || [],
    }))

    return Response.json({
      messages: formattedMessages.reverse(), // Return in chronological order
      hasMore: messages.length === limit
    })
  } catch (error) {
    return jsonError(error, 'Failed to fetch messages')
  }
}

// Send a new message
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 })

    const tenantId = (session.user as unknown as { tenantId?: string }).tenantId
    const userId = (session.user as unknown as { id?: string }).id
    const userName = session.user?.name || session.user?.email?.split('@')[0] || 'Unknown User'
    
    if (!tenantId || !userId) return Response.json({ error: 'No tenant access' }, { status: 403 })

    // Rate limiting for sending messages
    const ip = req.headers.get('x-forwarded-for') || '127.0.0.1'
    const { ok, resetAt } = enforceRateLimit(`messages:send:${userId}:${ip}`, 30, 60 * 1000)
    if (!ok) return Response.json({ error: 'Rate limit exceeded', resetAt }, { status: 429 })

    const body = await req.json()
    
    // Validate message
    const messageData = {
      ...body,
      userId,
      userName,
      userAvatar: session.user?.image
    }
    
    const validationErrors = validateMessage(messageData)
    if (validationErrors.length > 0) {
      return Response.json({ error: validationErrors[0] }, { status: 400 })
    }

    const sql = neon(process.env.DATABASE_URL!)

    // Check for rate limiting based on recent messages
    const recentMessages = await sql`
      SELECT id, user_id, channel_id, created_at
      FROM messages 
      WHERE user_id = ${userId} 
        AND channel_id = ${body.channelId}
        AND created_at > NOW() - INTERVAL '1 minute'
      ORDER BY created_at DESC
    `

    if (isMessageRateLimited(userId, body.channelId, recentMessages as Message[])) {
      return Response.json({ error: 'Too many messages. Please slow down.' }, { status: 429 })
    }

    // Generate message ID and sanitize content
    const messageId = generateMessageId()
    const sanitizedContent = sanitizeMessageContent(body.content)
    const mentions = parseMentions(body.content)

    // Create message object
    const message: Message = {
      id: messageId,
      channelId: body.channelId,
      type: body.type || 'text',
      content: sanitizedContent,
      metadata: {
        ...body.metadata,
        mentions: mentions.length > 0 ? mentions : undefined
      },
      userId,
      userName,
      userAvatar: session.user?.image || undefined,
      timestamp: new Date(),
      threadId: body.threadId || undefined,
      reactions: []
    }

    // Insert message into database
    await sql`
      INSERT INTO messages (
        id,
        channel_id,
        type,
        content,
        metadata,
        user_id,
        user_name,
        user_avatar,
        tenant_id,
        thread_id,
        created_at
      ) VALUES (
        ${message.id},
        ${message.channelId},
        ${message.type},
        ${message.content},
        ${JSON.stringify(message.metadata)},
        ${message.userId},
        ${message.userName},
        ${message.userAvatar},
        ${tenantId},
        ${message.threadId},
        ${message.timestamp.toISOString()}
      )
    `

    // Broadcast message to channel subscribers
    const broadcastEvent: RealtimeEvent = {
      type: 'message',
      data: message
    }
    
    broadcastToChannels([body.channelId], broadcastEvent, userId)

    return Response.json({ 
      success: true, 
      message,
      mentions: mentions 
    })
  } catch (error) {
    return jsonError(error, 'Failed to send message')
  }
}
