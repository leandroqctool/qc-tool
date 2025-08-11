import { getServerSession } from 'next-auth'
import { NextRequest } from 'next/server'
import { authOptions } from '../../../../lib/auth'
import { jsonError } from '../../../../lib/errors'
import { enforceRateLimit } from '../../../../lib/rateLimit'
import { 
  generateSessionId,
  calculateSessionRisk,
  isSessionExpired,
  type SecuritySession
} from '../../../../lib/security'

export const runtime = 'nodejs'

// Get user sessions
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 })

    const userId = (session.user as unknown as { id?: string }).id
    const tenantId = (session.user as unknown as { tenantId?: string }).tenantId
    
    if (!userId || !tenantId) return Response.json({ error: 'Authentication failed' }, { status: 403 })

    // Rate limiting
    const ip = req.headers.get('x-forwarded-for') || '127.0.0.1'
    const { ok, resetAt } = enforceRateLimit(`sessions:${userId}:${ip}`, 20, 60 * 1000)
    if (!ok) return Response.json({ error: 'Rate limit exceeded', resetAt }, { status: 429 })

    // In a real implementation, fetch from database
    // Mock active sessions
    const currentIp = req.headers.get('x-forwarded-for') || '127.0.0.1'
    const currentUserAgent = req.headers.get('user-agent') || 'Unknown'
    
    const mockSessions: SecuritySession[] = [
      {
        id: generateSessionId(),
        userId,
        tenantId,
        ipAddress: currentIp,
        userAgent: currentUserAgent,
        country: 'United States',
        city: 'San Francisco',
        isActive: true,
        isTrusted: true,
        requiresReauth: false,
        createdAt: new Date(),
        lastActivity: new Date(),
        expiresAt: new Date(Date.now() + 8 * 60 * 60 * 1000), // 8 hours
        isSuspicious: false,
        riskScore: 10,
        authMethod: 'password',
        deviceFingerprint: 'abc123def456'
      },
      {
        id: generateSessionId(),
        userId,
        tenantId,
        ipAddress: '192.168.1.100',
        userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X) AppleWebKit/605.1.15',
        country: 'United States',
        city: 'New York',
        isActive: true,
        isTrusted: true,
        requiresReauth: false,
        createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
        lastActivity: new Date(Date.now() - 30 * 60 * 1000), // 30 minutes ago
        expiresAt: new Date(Date.now() + 6 * 60 * 60 * 1000), // 6 hours
        isSuspicious: false,
        riskScore: 25,
        authMethod: '2fa',
        deviceFingerprint: 'xyz789uvw012'
      }
    ]

    // Filter out expired sessions and calculate additional info
    const activeSessions = mockSessions
      .filter(s => !isSessionExpired(s))
      .map(s => ({
        ...s,
        isCurrent: s.ipAddress === currentIp && s.userAgent === currentUserAgent,
        location: `${s.city}, ${s.country}`,
        deviceType: getDeviceType(s.userAgent),
        browserName: getBrowserName(s.userAgent)
      }))

    return Response.json({
      sessions: activeSessions,
      totalActive: activeSessions.length,
      currentSessionId: activeSessions.find(s => s.isCurrent)?.id,
      securitySummary: {
        trustedDevices: activeSessions.filter(s => s.isTrusted).length,
        suspiciousSessions: activeSessions.filter(s => s.isSuspicious).length,
        averageRiskScore: activeSessions.reduce((sum, s) => sum + s.riskScore, 0) / activeSessions.length || 0
      }
    })
  } catch (error) {
    return jsonError(error, 'Failed to fetch sessions')
  }
}

// Terminate session(s)
export async function DELETE(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 })

    const userId = (session.user as unknown as { id?: string }).id
    const tenantId = (session.user as unknown as { tenantId?: string }).tenantId
    
    if (!userId || !tenantId) return Response.json({ error: 'Authentication failed' }, { status: 403 })

    // Rate limiting
    const ip = req.headers.get('x-forwarded-for') || '127.0.0.1'
    const { ok, resetAt } = enforceRateLimit(`session-terminate:${userId}:${ip}`, 10, 60 * 1000)
    if (!ok) return Response.json({ error: 'Rate limit exceeded', resetAt }, { status: 429 })

    const { sessionId, terminateAll } = await req.json()

    if (terminateAll) {
      // Terminate all sessions except current
      return Response.json({
        success: true,
        message: 'All other sessions terminated',
        terminatedCount: 2, // Mock count
        remainingCount: 1
      })
    } else if (sessionId) {
      // Terminate specific session
      return Response.json({
        success: true,
        message: 'Session terminated',
        sessionId
      })
    } else {
      return Response.json({ error: 'Session ID required or use terminateAll flag' }, { status: 400 })
    }
  } catch (error) {
    return jsonError(error, 'Failed to terminate session')
  }
}

// Create new trusted session
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 })

    const userId = (session.user as unknown as { id?: string }).id
    const tenantId = (session.user as unknown as { tenantId?: string }).tenantId
    
    if (!userId || !tenantId) return Response.json({ error: 'Authentication failed' }, { status: 403 })

    // Rate limiting
    const ip = req.headers.get('x-forwarded-for') || '127.0.0.1'
    const { ok, resetAt } = enforceRateLimit(`session-create:${userId}:${ip}`, 5, 60 * 1000)
    if (!ok) return Response.json({ error: 'Rate limit exceeded', resetAt }, { status: 429 })

    const { trustDevice, extendSession } = await req.json()
    const userAgent = req.headers.get('user-agent') || 'Unknown'

    // Calculate risk for this session
    const riskScore = calculateSessionRisk(ip, userAgent)

    if (trustDevice) {
      // Mark current device as trusted
      return Response.json({
        success: true,
        message: 'Device marked as trusted',
        deviceTrusted: true,
        riskScore
      })
    }

    if (extendSession) {
      // Extend current session
      return Response.json({
        success: true,
        message: 'Session extended',
        newExpiryTime: new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString()
      })
    }

    return Response.json({ error: 'No action specified' }, { status: 400 })
  } catch (error) {
    return jsonError(error, 'Failed to create session')
  }
}

// Helper functions
function getDeviceType(userAgent: string): string {
  if (/Mobile|Android|iPhone|iPad/.test(userAgent)) {
    return 'Mobile'
  } else if (/Tablet/.test(userAgent)) {
    return 'Tablet'
  } else {
    return 'Desktop'
  }
}

function getBrowserName(userAgent: string): string {
  if (/Chrome/.test(userAgent)) return 'Chrome'
  if (/Firefox/.test(userAgent)) return 'Firefox'
  if (/Safari/.test(userAgent)) return 'Safari'
  if (/Edge/.test(userAgent)) return 'Edge'
  if (/Opera/.test(userAgent)) return 'Opera'
  return 'Unknown'
}
